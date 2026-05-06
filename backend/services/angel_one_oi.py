"""
Angel One Option Chain OI Service
Fetches real NIFTY option chain data using Angel One SmartAPI.
Provides PCR, max pain, OI buildup, big player entry detection.
"""
import time
import asyncio
import requests
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

log = logging.getLogger("angel_one_oi")
_executor = ThreadPoolExecutor(max_workers=4)

_cache: dict = {}
INSTRUMENT_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

# ── Instrument Master ─────────────────────────────────────────────────────────

def _load_instrument_master() -> list:
    """Download + cache instrument master (refreshed once per day)."""
    cached = _cache.get("instrument_master")
    if cached and time.time() - cached[1] < 86400:  # 24h cache
        return cached[0]
    try:
        r = requests.get(INSTRUMENT_MASTER_URL, timeout=30)
        data = r.json()
        _cache["instrument_master"] = (data, time.time())
        log.info(f"[AngelOneOI] Instrument master loaded: {len(data)} instruments")
        return data
    except Exception as e:
        log.error(f"[AngelOneOI] Failed to load instrument master: {e}")
        return _cache.get("instrument_master", ([], 0))[0]


def _parse_expiry(s: str) -> datetime:
    # Try title-case: "30MAR2026" -> "30Mar2026" so %b matches
    for variant in [s, s.title(), s.upper()]:
        for fmt in ("%d%b%Y", "%d-%b-%Y", "%Y-%m-%d", "%d%B%Y"):
            try:
                return datetime.strptime(variant, fmt)
            except Exception:
                pass
    return datetime.max


def _get_nifty_option_tokens(spot_price: float, num_strikes: int = 15) -> dict:
    """
    Returns dict: {token: {strike, option_type, expiry, symbol}}
    for ATM ± num_strikes NIFTY options of the nearest expiry.
    """
    master = _load_instrument_master()
    if not master:
        return {}

    nifty_opts = [
        d for d in master
        if d.get("exch_seg") == "NFO"
        and d.get("name") == "NIFTY"
        and d.get("instrumenttype") == "OPTIDX"
    ]

    # Find nearest expiry
    expiries = sorted(set(d.get("expiry", "") for d in nifty_opts), key=_parse_expiry)
    if not expiries:
        return {}
    nearest = expiries[0]

    # Filter to nearest expiry only
    contracts = [d for d in nifty_opts if d.get("expiry") == nearest]

    # ATM strike (round spot to nearest 50)
    atm = round(spot_price / 50) * 50
    allowed_strikes = {atm + i * 50 for i in range(-num_strikes, num_strikes + 1)}

    result = {}
    for c in contracts:
        strike = float(c.get("strike", 0)) / 100
        if strike not in allowed_strikes:
            continue
        token = c.get("token", "")
        symbol = c.get("symbol", "")
        opt_type = "CE" if symbol.endswith("CE") else "PE"
        result[token] = {
            "strike": strike,
            "option_type": opt_type,
            "expiry": nearest,
            "symbol": symbol,
        }

    log.info(f"[AngelOneOI] Found {len(result)} contracts for expiry {nearest} near ATM {atm}")
    return result


# ── Live OI fetch ─────────────────────────────────────────────────────────────

def _fetch_option_oi_sync(tokens_map: dict, update_snapshot: bool = False) -> list:
    """Fetch live OI + LTP for all option tokens via Angel One getMarketData."""
    from services.angel_one import _get_api
    api = _get_api()

    tokens = list(tokens_map.keys())
    results = []

    # Angel One allows max 50 tokens per call
    for i in range(0, len(tokens), 50):
        batch = tokens[i:i + 50]
        try:
            resp = api.getMarketData(mode="FULL", exchangeTokens={"NFO": batch})
            fetched = resp.get("data", {}).get("fetched", [])
            for item in fetched:
                token = str(item.get("symbolToken", ""))
                meta = tokens_map.get(token, {})
                current_oi = float(item.get("opnInterest", 0) or 0)
                prev_oi = _cache.get(f"prev_oi_{token}", current_oi)
                computed_change_oi = current_oi - prev_oi
                if update_snapshot:
                    _cache[f"prev_oi_{token}"] = current_oi
                api_change_oi = float(item.get("netchangeInOI", 0) or 0)
                change_oi = api_change_oi if api_change_oi != 0 else computed_change_oi
                results.append({
                    "token": token,
                    "symbol": item.get("tradingSymbol", meta.get("symbol", "")),
                    "strike": meta.get("strike", 0),
                    "option_type": meta.get("option_type", ""),
                    "expiry": meta.get("expiry", ""),
                    "ltp": float(item.get("ltp", 0) or 0),
                    "oi": current_oi,
                    "change_oi": change_oi,
                    "volume": float(item.get("tradeVolume", 0) or 0),
                    "iv": float(item.get("impliedVolatility", 0) or 0),
                })
        except Exception as e:
            log.error(f"[AngelOneOI] getMarketData batch error: {e}")

    return results


def _fetch_oi_buildup_sync() -> dict:
    """Fetch OI buildup signals — cached 5 min to stay within Angel One rate limits."""
    cached = _cache.get("oi_buildup")
    if cached and time.time() - cached[1] < 300:  # 5 min cache
        return cached[0]

    from services.angel_one import _get_api
    api = _get_api()

    buildup = {}
    for datatype in ["Long Built Up", "Short Built Up", "Long Unwinding", "Short Covering"]:
        try:
            time.sleep(1.5)  # space out calls to avoid rate limit
            resp = api.oIBuildup({"expirytype": "NEAR", "datatype": datatype})
            items = resp.get("data", []) or []
            nifty = [
                i for i in items
                if "NIFTY" in i.get("tradingSymbol", "")
                and "BANK" not in i.get("tradingSymbol", "")
            ]
            buildup[datatype] = nifty[:5]
        except Exception as e:
            log.warning(f"[AngelOneOI] oIBuildup '{datatype}' error: {e}")
            buildup[datatype] = []

    _cache["oi_buildup"] = (buildup, time.time())
    return buildup


# ── Signal engine ─────────────────────────────────────────────────────────────

def _analyze_option_chain(contracts: list, spot_price: float, prev_spot: float, spot_5min: float = None) -> dict:
    """Compute PCR, max pain, key levels, OI signals from option contracts."""
    if not contracts:
        return {}

    calls = [c for c in contracts if c["option_type"] == "CE"]
    puts  = [c for c in contracts if c["option_type"] == "PE"]

    total_call_oi = sum(c["oi"] for c in calls)
    total_put_oi  = sum(p["oi"] for p in puts)
    pcr = round(total_put_oi / total_call_oi, 3) if total_call_oi else 0

    # Max Call OI = resistance, Max Put OI = support
    max_call = max(calls, key=lambda x: x["oi"]) if calls else {}
    max_put  = max(puts,  key=lambda x: x["oi"]) if puts  else {}

    # Max pain = strike where total loss is minimum for option writers
    strikes = sorted(set(c["strike"] for c in contracts))
    min_pain_loss = None
    max_pain_strike = spot_price
    for s in strikes:
        call_loss = sum(max(0, s - c["strike"]) * c["oi"] for c in calls)
        put_loss  = sum(max(0, p["strike"] - s) * p["oi"] for p in puts)
        total_loss = call_loss + put_loss
        if min_pain_loss is None or total_loss < min_pain_loss:
            min_pain_loss = total_loss
            max_pain_strike = s

    # OI change signals (big player entry)
    atm = round(spot_price / 50) * 50
    atm_calls = [c for c in calls if abs(c["strike"] - atm) <= 300]
    atm_puts  = [p for p in puts  if abs(p["strike"] - atm) <= 300]

    alerts = []
    price_change_pct = ((spot_price - prev_spot) / prev_spot * 100) if prev_spot else 0
    price_up   = price_change_pct > 0.15
    price_down = price_change_pct < -0.15

    total_atm_call_oi_change = sum(c["change_oi"] for c in atm_calls)
    total_atm_put_oi_change  = sum(p["change_oi"] for p in atm_puts)

    # Big player entry — sudden OI spike at ATM
    for c in atm_calls:
        if c["oi"] > 0 and c["change_oi"] > 0:
            change_pct = c["change_oi"] / c["oi"] * 100
            if change_pct > 15:
                alerts.append({
                    "alert": "BIG PLAYERS ENTERED",
                    "direction": "bearish",
                    "action": "BUY PUT" if price_down else "WAIT",
                    "strength": "strong",
                    "reason": (
                        f"Strike {c['strike']:.0f} CE: OI jumped +{change_pct:.1f}% "
                        f"({c['change_oi']:+,.0f} contracts). Smart money building short hedge."
                    ),
                    "confidence": "high",
                    "type": "smart_money",
                    "strike": c["strike"],
                    "source": "angel_one_oi",
                })

    for p in atm_puts:
        if p["oi"] > 0 and p["change_oi"] > 0:
            change_pct = p["change_oi"] / p["oi"] * 100
            if change_pct > 15:
                alerts.append({
                    "alert": "BIG PLAYERS ENTERED",
                    "direction": "bullish",
                    "action": "BUY CALL" if price_up else "WAIT",
                    "strength": "strong",
                    "reason": (
                        f"Strike {p['strike']:.0f} PE: OI jumped +{change_pct:.1f}% "
                        f"({p['change_oi']:+,.0f} contracts). Institutions adding put support — bullish."
                    ),
                    "confidence": "high",
                    "type": "smart_money",
                    "strike": p["strike"],
                    "source": "angel_one_oi",
                })

    # Market direction from OI + price
    if price_up and total_atm_put_oi_change > 0:
        alerts.append({
            "alert": "MARKET UP",
            "direction": "bullish",
            "action": "BUY CALL",
            "strength": "strong" if abs(price_change_pct) > 0.5 else "medium",
            "reason": (
                f"Price +{price_change_pct:.2f}% + Put OI building "
                f"({total_atm_put_oi_change:+,.0f}). Longs adding — bullish."
            ),
            "confidence": "high" if abs(price_change_pct) > 0.5 else "medium",
            "type": "direction",
            "source": "angel_one_oi",
        })
    elif price_down and total_atm_call_oi_change > 0:
        alerts.append({
            "alert": "MARKET DOWN",
            "direction": "bearish",
            "action": "BUY PUT",
            "strength": "strong" if abs(price_change_pct) > 0.5 else "medium",
            "reason": (
                f"Price {price_change_pct:.2f}% + Call OI building "
                f"({total_atm_call_oi_change:+,.0f}). Shorts adding — bearish."
            ),
            "confidence": "high" if abs(price_change_pct) > 0.5 else "medium",
            "type": "direction",
            "source": "angel_one_oi",
        })

    # Short covering / Long unwinding
    if price_up and total_atm_call_oi_change < -5000:
        alerts.append({
            "alert": "SHORT COVERING — FAST MOVE UP",
            "direction": "bullish",
            "action": "BUY CALL",
            "strength": "strong",
            "reason": f"Price up {price_change_pct:.2f}% + Call OI falling ({total_atm_call_oi_change:,.0f}). Short covering — quick upside.",
            "confidence": "high",
            "type": "direction",
            "source": "angel_one_oi",
        })
    elif price_down and total_atm_put_oi_change < -5000:
        alerts.append({
            "alert": "LONG UNWINDING — FAST MOVE DOWN",
            "direction": "bearish",
            "action": "BUY PUT",
            "strength": "strong",
            "reason": f"Price down {price_change_pct:.2f}% + Put OI falling ({total_atm_put_oi_change:,.0f}). Long unwinding — quick downside.",
            "confidence": "high",
            "type": "direction",
            "source": "angel_one_oi",
        })

    # Breakout / Breakdown from OI levels — with OI confirmation + persistence filter
    resistance_strike = max_call.get("strike", 0)
    support_strike    = max_put.get("strike", 0)

    # Persistence counters: must stay above/below level for 2 consecutive cycles
    breakout_cycles  = _cache.get("breakout_cycles", 0)
    breakdown_cycles = _cache.get("breakdown_cycles", 0)

    if resistance_strike and spot_price > resistance_strike:
        breakout_cycles += 1
        breakdown_cycles = 0
        resistance_call = next((c for c in calls if c["strike"] == resistance_strike), {})
        # OI confirmation: call OI at resistance falling = shorts covering = real breakout
        if breakout_cycles >= 2 and resistance_call.get("change_oi", 0) < 0:
            pts_above = spot_price - resistance_strike
            alerts.append({
                "alert": "BULLISH BREAKOUT",
                "direction": "bullish",
                "action": "BUY CALL",
                "strength": "strong",
                "reason": (
                    f"Price {spot_price:.0f} broke resistance {resistance_strike:.0f} "
                    f"(+{pts_above:.0f}pts above). Call OI falling — shorts covering. "
                    f"Confirmed {breakout_cycles} cycles above."
                ),
                "confidence": "high",
                "type": "breakout",
                "source": "angel_one_oi",
            })
    else:
        breakout_cycles = 0

    if support_strike and spot_price < support_strike:
        breakdown_cycles += 1
        breakout_cycles = 0
        support_put = next((p for p in puts if p["strike"] == support_strike), {})
        # OI confirmation: put OI at support falling = longs giving up = real breakdown
        if breakdown_cycles >= 2 and support_put.get("change_oi", 0) < 0:
            pts_below = support_strike - spot_price
            alerts.append({
                "alert": "BEARISH BREAKDOWN",
                "direction": "bearish",
                "action": "BUY PUT",
                "strength": "strong",
                "reason": (
                    f"Price {spot_price:.0f} broke support {support_strike:.0f} "
                    f"({pts_below:.0f}pts below). Put OI falling — longs giving up. "
                    f"Confirmed {breakdown_cycles} cycles below."
                ),
                "confidence": "high",
                "type": "breakout",
                "source": "angel_one_oi",
            })
    else:
        breakdown_cycles = 0

    _cache["breakout_cycles"]  = breakout_cycles
    _cache["breakdown_cycles"] = breakdown_cycles

    # 60s price velocity signals (no OI required)
    if price_change_pct >= 0.3:
        alerts.append({
            "alert": "MARKET UP",
            "direction": "bullish",
            "action": "BUY CALL",
            "strength": "strong",
            "reason": f"Price velocity +{price_change_pct:.2f}% in 60s. Fast upward move.",
            "confidence": "high",
            "type": "velocity",
            "source": "angel_one_oi",
        })
        alerts.append({
            "alert": "SHORT COVERING — FAST MOVE UP",
            "direction": "bullish",
            "action": "BUY CALL",
            "strength": "strong",
            "reason": f"Price surged +{price_change_pct:.2f}% in 60s. Short covering likely.",
            "confidence": "high",
            "type": "velocity",
            "source": "angel_one_oi",
        })
    elif price_change_pct <= -0.3:
        alerts.append({
            "alert": "MARKET DOWN",
            "direction": "bearish",
            "action": "BUY PUT",
            "strength": "strong",
            "reason": f"Price velocity {price_change_pct:.2f}% in 60s. Fast downward move.",
            "confidence": "high",
            "type": "velocity",
            "source": "angel_one_oi",
        })
        alerts.append({
            "alert": "LONG UNWINDING — FAST MOVE DOWN",
            "direction": "bearish",
            "action": "BUY PUT",
            "strength": "strong",
            "reason": f"Price dropped {price_change_pct:.2f}% in 60s. Long unwinding likely.",
            "confidence": "high",
            "type": "velocity",
            "source": "angel_one_oi",
        })

    # 5-minute price velocity signals
    if spot_5min and spot_5min > 0:
        change_5min_pct = (spot_price - spot_5min) / spot_5min * 100
        if change_5min_pct >= 0.35:
            alerts.append({
                "alert": "MARKET UP",
                "direction": "bullish",
                "action": "BUY CALL",
                "strength": "strong",
                "reason": f"5min grind up +{change_5min_pct:.2f}% ({spot_5min:.0f}→{spot_price:.0f}). Sustained buying.",
                "confidence": "high",
                "type": "velocity_5min",
                "source": "angel_one_oi",
            })
            alerts.append({
                "alert": "SHORT COVERING — FAST MOVE UP",
                "direction": "bullish",
                "action": "BUY CALL",
                "strength": "strong",
                "reason": f"5min sustained rally +{change_5min_pct:.2f}%. Short covering in progress.",
                "confidence": "high",
                "type": "velocity_5min",
                "source": "angel_one_oi",
            })
        elif change_5min_pct <= -0.35:
            alerts.append({
                "alert": "MARKET DOWN",
                "direction": "bearish",
                "action": "BUY PUT",
                "strength": "strong",
                "reason": f"5min grind down {change_5min_pct:.2f}% ({spot_5min:.0f}→{spot_price:.0f}). Sustained selling.",
                "confidence": "high",
                "type": "velocity_5min",
                "source": "angel_one_oi",
            })
            alerts.append({
                "alert": "LONG UNWINDING — FAST MOVE DOWN",
                "direction": "bearish",
                "action": "BUY PUT",
                "strength": "strong",
                "reason": f"5min sustained decline {change_5min_pct:.2f}%. Long unwinding in progress.",
                "confidence": "high",
                "type": "velocity_5min",
                "source": "angel_one_oi",
            })

    # PCR extremes
    if pcr > 1.5:
        alerts.append({
            "alert": "PCR EXTREME BULLISH",
            "direction": "bullish",
            "action": "BUY CALL on dip",
            "strength": "medium",
            "reason": f"PCR = {pcr} (>1.5). Excessive put writing = market makers bullish.",
            "confidence": "medium",
            "type": "pcr",
            "source": "angel_one_oi",
        })
    elif pcr < 0.5:
        alerts.append({
            "alert": "PCR EXTREME BEARISH",
            "direction": "bearish",
            "action": "BUY PUT on rise",
            "strength": "medium",
            "reason": f"PCR = {pcr} (<0.5). Excessive call writing = market makers bearish.",
            "confidence": "medium",
            "type": "pcr",
            "source": "angel_one_oi",
        })

    return {
        "symbol": "NIFTY",
        "spot_price": spot_price,
        "atm_strike": atm,
        "expiry": contracts[0]["expiry"] if contracts else "",
        "total_call_oi": total_call_oi,
        "total_put_oi": total_put_oi,
        "pcr": pcr,
        "pcr_signal": "bullish" if pcr > 1.2 else ("bearish" if pcr < 0.8 else "neutral"),
        "resistance_strike": max_call.get("strike"),
        "resistance_oi": max_call.get("oi"),
        "support_strike": max_put.get("strike"),
        "support_oi": max_put.get("oi"),
        "max_pain": max_pain_strike,
        "calls": sorted(calls, key=lambda x: x["strike"]),
        "puts":  sorted(puts,  key=lambda x: x["strike"]),
        "alerts": alerts,
        "source": "angel_one_live",
    }


# ── Main public function ──────────────────────────────────────────────────────

async def get_nifty_oi_angel(force_refresh: bool = False, update_snapshot: bool = False) -> dict:
    """
    Full NIFTY OI data from Angel One.
    Returns same structure as nse_oi.get_nifty_oi() for drop-in replacement.
    """
    cache_key = "angel_nifty_oi"
    cached = _cache.get(cache_key)
    if cached and not force_refresh and time.time() - cached[1] < 60:
        return cached[0]

    loop = asyncio.get_event_loop()

    # Get spot price from Angel One (with retry)
    spot_price = 0
    for attempt in range(3):
        try:
            from services.angel_one import _get_api
            def _get_spot():
                api = _get_api()
                resp = api.getMarketData(mode="LTP", exchangeTokens={"NSE": ["99926000"]})
                fetched = resp.get("data", {}).get("fetched", [])
                return float(fetched[0].get("ltp", 0)) if fetched else 0
            spot_price = await loop.run_in_executor(_executor, _get_spot)
            if spot_price:
                break
        except Exception as e:
            log.warning(f"[AngelOneOI] Spot fetch attempt {attempt+1} failed: {e}")
            if attempt < 2:
                await asyncio.sleep(2)

    # Fallback to yfinance if Angel One times out
    if not spot_price:
        try:
            import yfinance as yf
            info = yf.Ticker("^NSEI").info
            spot_price = info.get("regularMarketPrice") or info.get("previousClose") or 0
            log.info(f"[AngelOneOI] Using yfinance spot fallback: {spot_price}")
        except Exception:
            pass

    if not spot_price:
        return {"error": "Could not fetch NIFTY spot from Angel One", "alerts": [], "spot_price": 0}

    # Previous price for trend detection
    prev_data = _cache.get("prev_spot")
    prev_spot = prev_data[0] if prev_data else spot_price * 0.999
    _cache["prev_spot"] = (spot_price, time.time())

    # Rolling 5-minute spot history (one entry per scheduler cycle ~60s, keep last 6)
    history = _cache.get("spot_history", [])
    history.append((spot_price, time.time()))
    history = history[-6:]
    _cache["spot_history"] = history
    spot_5min = history[0][0] if len(history) >= 5 else None

    # Get option tokens near ATM
    tokens_map = await loop.run_in_executor(_executor, _get_nifty_option_tokens, spot_price, 12)

    if not tokens_map:
        return {"error": "No option tokens found", "spot_price": spot_price, "alerts": []}

    # Fetch live OI data
    contracts = await loop.run_in_executor(_executor, lambda: _fetch_option_oi_sync(tokens_map, update_snapshot))

    # Fetch OI buildup signals
    try:
        buildup = await loop.run_in_executor(_executor, _fetch_oi_buildup_sync)
    except Exception:
        buildup = {}

    # Analyse
    oi_data = _analyze_option_chain(contracts, spot_price, prev_spot, spot_5min)
    alerts = oi_data.pop("alerts", [])

    # Inject OI buildup big-player signals
    for datatype, items in buildup.items():
        for item in items:
            if "NIFTY" in item.get("tradingSymbol", ""):
                direction = "bullish" if "Long" in datatype else "bearish"
                alerts.append({
                    "alert": datatype.upper(),
                    "direction": direction,
                    "action": "BUY CALL" if direction == "bullish" else "BUY PUT",
                    "strength": "strong",
                    "reason": (
                        f"{item.get('tradingSymbol')}: LTP {item.get('ltp')} "
                        f"({item.get('percentChange',0)}% change), "
                        f"OI {item.get('opnInterest')} (Δ {item.get('netChangeOpnInterest')})"
                    ),
                    "confidence": "high",
                    "type": "oi_buildup",
                    "source": "angel_one_buildup",
                })

    result = {
        "spot_price": spot_price,
        "oi_data": oi_data,
        "alerts": alerts,
        "alert_count": len(alerts),
        "has_strong_alert": any(a.get("strength") == "strong" for a in alerts),
        "buildup": buildup,
        "source": "angel_one_live",
    }

    _cache[cache_key] = (result, time.time())
    return result
