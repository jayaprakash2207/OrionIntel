"""
NSE India Option Chain + OI Engine
Fetches real Nifty 50 option chain data from NSE public API.
Detects: market direction, big player entry, breakout/breakdown.
Generates structured alerts like institutional traders.
"""
import time
import asyncio
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, time as dtime
from zoneinfo import ZoneInfo
from core.gemini import ask_json

_IST = ZoneInfo("Asia/Kolkata")
_MARKET_OPEN  = dtime(9, 15)
_MARKET_CLOSE = dtime(15, 30)


def _is_nse_market_open() -> bool:
    now = datetime.now(_IST)
    if now.weekday() >= 5:  # Saturday or Sunday
        return False
    return _MARKET_OPEN <= now.time() <= _MARKET_CLOSE

_executor = ThreadPoolExecutor(max_workers=4)
_oi_cache: dict = {}

def _fetch_option_chain_sync(symbol: str = "NIFTY") -> dict:
    """Fetch raw NSE option chain data using nsepython (handles cookies automatically)."""
    try:
        from nsepython import nse_optionchain_scrapper
        data = nse_optionchain_scrapper(symbol)
        if data and "records" in data:
            return data
        raise ValueError("Empty response from nsepython")
    except Exception as e1:
        # Fallback: manual session with proper cookie priming
        try:
            import time as _t
            session = requests.Session()
            session.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
            })
            session.get("https://www.nseindia.com", timeout=10)
            _t.sleep(0.5)
            session.get("https://www.nseindia.com/option-chain", timeout=10)
            _t.sleep(0.3)
            session.headers.update({
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://www.nseindia.com/option-chain",
                "Origin": "https://www.nseindia.com",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
            })
            resp = session.get(
                f"https://www.nseindia.com/api/option-chain-indices?symbol={symbol}",
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e2:
            return {"error": f"nsepython: {e1} | fallback: {e2}"}


def _parse_option_chain(raw: dict, spot_price: float) -> dict:
    """
    Parse raw NSE option chain JSON into structured OI data.
    Returns: { atm_strike, calls: [{strike, oi, change_oi, volume}], puts: [...], ... }
    """
    if "error" in raw or "records" not in raw:
        return {"error": raw.get("error", "No records in response")}

    records = raw.get("records", {})
    data_list = records.get("data", [])
    expiry_dates = records.get("expiryDates", [])
    current_expiry = expiry_dates[0] if expiry_dates else None

    # Find ATM strike (nearest to spot)
    atm_strike = round(spot_price / 50) * 50

    calls = []
    puts = []

    for entry in data_list:
        if current_expiry and entry.get("expiryDate") != current_expiry:
            continue
        strike = entry.get("strikePrice", 0)

        ce = entry.get("CE", {})
        pe = entry.get("PE", {})

        if ce:
            calls.append({
                "strike": strike,
                "oi": ce.get("openInterest", 0),
                "change_oi": ce.get("changeinOpenInterest", 0),
                "volume": ce.get("totalTradedVolume", 0),
                "ltp": ce.get("lastPrice", 0),
                "iv": ce.get("impliedVolatility", 0),
            })

        if pe:
            puts.append({
                "strike": strike,
                "oi": pe.get("openInterest", 0),
                "change_oi": pe.get("changeinOpenInterest", 0),
                "volume": pe.get("totalTradedVolume", 0),
                "ltp": pe.get("lastPrice", 0),
                "iv": pe.get("impliedVolatility", 0),
            })

    # Sort by strike
    calls.sort(key=lambda x: x["strike"])
    puts.sort(key=lambda x: x["strike"])

    # Find max pain (PCR)
    total_call_oi = sum(c["oi"] for c in calls)
    total_put_oi = sum(p["oi"] for p in puts)
    pcr = round(total_put_oi / total_call_oi, 3) if total_call_oi else 0

    # Find resistance = highest call OI
    max_call = max(calls, key=lambda x: x["oi"]) if calls else {}
    # Find support = highest put OI
    max_put = max(puts, key=lambda x: x["oi"]) if puts else {}

    # Get strikes near ATM (±5 strikes)
    atm_calls = [c for c in calls if abs(c["strike"] - atm_strike) <= 500]
    atm_puts = [p for p in puts if abs(p["strike"] - atm_strike) <= 500]

    return {
        "symbol": "NIFTY",
        "spot_price": spot_price,
        "atm_strike": atm_strike,
        "expiry": current_expiry,
        "total_call_oi": total_call_oi,
        "total_put_oi": total_put_oi,
        "pcr": pcr,
        "pcr_signal": "bullish" if pcr > 1.2 else ("bearish" if pcr < 0.8 else "neutral"),
        "resistance_strike": max_call.get("strike"),
        "resistance_oi": max_call.get("oi"),
        "support_strike": max_put.get("strike"),
        "support_oi": max_put.get("oi"),
        "calls": calls,
        "puts": puts,
        "atm_calls": atm_calls,
        "atm_puts": atm_puts,
    }


def _analyze_oi_signals(oi_data: dict, prev_price: float, current_price: float) -> list:
    """
    Core OI signal detection engine.
    Returns list of alert dicts.
    """
    alerts = []
    if "error" in oi_data:
        return alerts

    calls = oi_data.get("calls", [])
    puts = oi_data.get("puts", [])
    atm_calls = oi_data.get("atm_calls", [])
    atm_puts = oi_data.get("atm_puts", [])
    resistance = oi_data.get("resistance_strike", 0)
    support = oi_data.get("support_strike", 0)
    pcr = oi_data.get("pcr", 1)

    price_change = current_price - prev_price
    price_change_pct = (price_change / prev_price * 100) if prev_price else 0
    price_up = price_change_pct > 0.15
    price_down = price_change_pct < -0.15

    # Total change in OI near ATM
    total_call_oi_change = sum(c["change_oi"] for c in atm_calls)
    total_put_oi_change = sum(p["change_oi"] for p in atm_puts)

    # ── 1. MARKET DIRECTION ──────────────────────────────────────────────────

    if price_up and total_put_oi_change > 0:
        alerts.append({
            "alert": "MARKET UP",
            "direction": "bullish",
            "action": "BUY CALL",
            "strength": "strong" if abs(price_change_pct) > 0.5 else "medium",
            "reason": f"Price rising +{price_change_pct:.2f}% + Put OI building ({total_put_oi_change:+,}). STRONG BULLISH — longs adding positions.",
            "confidence": "high" if abs(price_change_pct) > 0.5 else "medium",
            "type": "direction",
        })

    elif price_down and total_call_oi_change > 0:
        alerts.append({
            "alert": "MARKET DOWN",
            "direction": "bearish",
            "action": "BUY PUT",
            "strength": "strong" if abs(price_change_pct) > 0.5 else "medium",
            "reason": f"Price falling {price_change_pct:.2f}% + Call OI building ({total_call_oi_change:+,}). STRONG BEARISH — shorts adding positions.",
            "confidence": "high" if abs(price_change_pct) > 0.5 else "medium",
            "type": "direction",
        })

    elif price_up and total_call_oi_change < -5000:
        alerts.append({
            "alert": "SHORT COVERING — FAST MOVE UP",
            "direction": "bullish",
            "action": "BUY CALL",
            "strength": "strong",
            "reason": f"Price up {price_change_pct:.2f}% + Call OI falling ({total_call_oi_change:,}). Short covering — quick upside possible.",
            "confidence": "high",
            "type": "direction",
        })

    elif price_down and total_put_oi_change < -5000:
        alerts.append({
            "alert": "LONG UNWINDING — FAST MOVE DOWN",
            "direction": "bearish",
            "action": "BUY PUT",
            "strength": "strong",
            "reason": f"Price down {price_change_pct:.2f}% + Put OI falling ({total_put_oi_change:,}). Long unwinding — quick downside possible.",
            "confidence": "high",
            "type": "direction",
        })

    # ── 2. BIG PLAYER ENTRY (SMART MONEY) ────────────────────────────────────

    for c in atm_calls:
        if c["oi"] > 0 and c["change_oi"] > 0:
            change_pct = c["change_oi"] / c["oi"] * 100
            if change_pct > 15:
                alerts.append({
                    "alert": "BIG PLAYERS ENTERED",
                    "direction": "bearish",
                    "action": "BUY PUT" if price_down else "WAIT",
                    "strength": "strong",
                    "reason": f"Strike {c['strike']} CE: OI jumped +{change_pct:.1f}% ({c['change_oi']:+,} contracts). Smart money building short hedge.",
                    "confidence": "high",
                    "type": "smart_money",
                    "strike": c["strike"],
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
                    "reason": f"Strike {p['strike']} PE: OI jumped +{change_pct:.1f}% ({p['change_oi']:+,} contracts). Institutions adding put support — bullish signal.",
                    "confidence": "high",
                    "type": "smart_money",
                    "strike": p["strike"],
                })

    # ── 3. BREAKOUT / BREAKDOWN ───────────────────────────────────────────────

    if resistance and current_price > resistance:
        # Price crossed resistance
        resistance_call = next((c for c in calls if c["strike"] == resistance), {})
        if resistance_call.get("change_oi", 0) < 0:
            alerts.append({
                "alert": "BULLISH BREAKOUT",
                "direction": "bullish",
                "action": "BUY CALL",
                "strength": "strong",
                "reason": f"Price {current_price} broke resistance {resistance}. Call OI at {resistance} falling — shorts covering. Breakout confirmed.",
                "confidence": "high",
                "type": "breakout",
                "level": resistance,
            })

    if support and current_price < support:
        support_put = next((p for p in puts if p["strike"] == support), {})
        if support_put.get("change_oi", 0) < 0:
            alerts.append({
                "alert": "BEARISH BREAKDOWN",
                "direction": "bearish",
                "action": "BUY PUT",
                "strength": "strong",
                "reason": f"Price {current_price} broke support {support}. Put OI at {support} falling — longs giving up. Breakdown confirmed.",
                "confidence": "high",
                "type": "breakout",
                "level": support,
            })

    # ── 4. PCR EXTREME ────────────────────────────────────────────────────────

    if pcr > 1.5:
        alerts.append({
            "alert": "PCR EXTREME BULLISH",
            "direction": "bullish",
            "action": "BUY CALL on dip",
            "strength": "medium",
            "reason": f"PCR = {pcr} (>1.5). Excessive put writing = market makers bullish. Strong support below.",
            "confidence": "medium",
            "type": "pcr",
        })
    elif pcr < 0.5:
        alerts.append({
            "alert": "PCR EXTREME BEARISH",
            "direction": "bearish",
            "action": "BUY PUT on rise",
            "strength": "medium",
            "reason": f"PCR = {pcr} (<0.5). Excessive call writing = market makers bearish. Strong resistance above.",
            "confidence": "medium",
            "type": "pcr",
        })

    return alerts


async def _technical_fallback(spot_price: float = 0) -> dict:
    """
    When NSE option chain is blocked, derive support/resistance and signals
    from recent NIFTY price + volume data via yfinance.
    """
    try:
        import yfinance as yf
        ticker = yf.Ticker("^NSEI")

        # Get spot if not already available
        if not spot_price:
            info = ticker.info
            spot_price = info.get("regularMarketPrice") or info.get("previousClose") or 0

        # Fetch recent intraday bars for level detection
        hist = ticker.history(period="5d", interval="15m")
        if hist.empty:
            hist = ticker.history(period="1mo", interval="1d")

        if hist.empty:
            raise ValueError("no price data")

        closes = hist["Close"].tolist()
        highs  = hist["High"].tolist()
        lows   = hist["Low"].tolist()
        vols   = hist["Volume"].tolist()

        # Support = recent pivot low, Resistance = recent pivot high
        lookback = min(30, len(closes))
        recent_highs = highs[-lookback:]
        recent_lows  = lows[-lookback:]
        recent_vols  = vols[-lookback:]

        resistance = round(max(recent_highs) * 0.998, 0)  # just inside the high
        support    = round(min(recent_lows)  * 1.002, 0)  # just above the low

        # Snap to nearest 50 (NIFTY options trade at 50-pt strikes)
        resistance_strike = int(round(resistance / 50) * 50)
        support_strike    = int(round(support    / 50) * 50)

        # RSI-based PCR proxy
        if len(closes) >= 15:
            deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
            gains  = [d if d > 0 else 0 for d in deltas[-14:]]
            losses = [-d if d < 0 else 0 for d in deltas[-14:]]
            avg_g  = sum(gains) / 14
            avg_l  = sum(losses) / 14
            rsi    = round(100 - (100 / (1 + avg_g / avg_l)), 1) if avg_l else 100.0
        else:
            rsi = 50.0

        # Estimate PCR from RSI (inverse — high RSI = more puts = higher PCR)
        pcr_estimated = round(1.5 - (rsi - 50) / 100, 2)
        pcr_estimated = max(0.4, min(2.0, pcr_estimated))

        pcr_signal = (
            "bullish"  if pcr_estimated > 1.2 else
            "bearish"  if pcr_estimated < 0.8 else
            "neutral"
        )

        # Volume momentum signal
        avg_vol = sum(recent_vols) / len(recent_vols) if recent_vols else 1
        last_vol = recent_vols[-1] if recent_vols else 0
        price_change_pct = ((closes[-1] - closes[-2]) / closes[-2] * 100) if len(closes) >= 2 else 0

        alerts = []
        if abs(price_change_pct) > 0.3 and last_vol > avg_vol * 1.5:
            direction = "bullish" if price_change_pct > 0 else "bearish"
            action    = "BUY CALL" if direction == "bullish" else "BUY PUT"
            alerts.append({
                "alert": "MARKET UP" if direction == "bullish" else "MARKET DOWN",
                "direction": direction,
                "action": action,
                "strength": "strong" if abs(price_change_pct) > 0.5 else "medium",
                "reason": (
                    f"Price {price_change_pct:+.2f}% with volume {last_vol/avg_vol:.1f}x average. "
                    f"Technical signal (NSE OI data unavailable — using price+volume)."
                ),
                "confidence": "medium",
                "type": "technical_fallback",
            })

        if spot_price and resistance_strike and spot_price > resistance_strike:
            pts_above = spot_price - resistance_strike
            alerts.append({
                "alert": "BULLISH BREAKOUT",
                "direction": "bullish",
                "action": "BUY CALL",
                "strength": "strong",
                "reason": f"Price {spot_price:.0f} broke resistance {resistance_strike} (+{pts_above:.0f}pts). Watch for breakout continuation.",
                "confidence": "medium",
                "type": "technical_fallback",
            })
        elif spot_price and support_strike and spot_price < support_strike:
            pts_below = support_strike - spot_price
            alerts.append({
                "alert": "BEARISH BREAKDOWN",
                "direction": "bearish",
                "action": "BUY PUT",
                "strength": "strong",
                "reason": f"Price {spot_price:.0f} broke support {support_strike} ({pts_below:.0f}pts below). Watch for breakdown continuation.",
                "confidence": "medium",
                "type": "technical_fallback",
            })

        oi_data = {
            "symbol": "NIFTY",
            "spot_price": spot_price,
            "atm_strike": int(round(spot_price / 50) * 50) if spot_price else 0,
            "pcr": pcr_estimated,
            "pcr_signal": pcr_signal,
            "resistance_strike": resistance_strike,
            "support_strike": support_strike,
            "rsi": rsi,
            "data_source": "technical_fallback",
        }

        return {
            "spot_price": spot_price,
            "oi_data": oi_data,
            "alerts": alerts,
            "alert_count": len(alerts),
            "has_strong_alert": any(a.get("strength") == "strong" for a in alerts),
            "data_source": "technical_fallback",
            "note": "NSE option chain blocked by Akamai — showing technical signals from price/volume data",
        }

    except Exception as e:
        return {
            "spot_price": spot_price,
            "oi_data": {},
            "alerts": [],
            "alert_count": 0,
            "has_strong_alert": False,
            "error": f"NSE blocked + fallback failed: {e}",
            "market_closed": True,
            "note": "NSE option chain data unavailable",
        }


async def get_nifty_oi(force_refresh: bool = False, update_snapshot: bool = False) -> dict:
    """Run Angel One + NSE in parallel, merge alerts, fall back gracefully."""
    import logging
    log = logging.getLogger("nse_oi")

    # Return market closed response outside NSE trading hours (Mon-Fri 9:15-15:30 IST)
    if not _is_nse_market_open():
        now = datetime.now(_IST)
        try:
            import yfinance as yf
            spot = yf.Ticker("^NSEI").info.get("previousClose", 0) or 0
        except Exception:
            spot = 0
        return {
            "spot_price": spot,
            "oi_data": {},
            "alerts": [],
            "alert_count": 0,
            "has_strong_alert": False,
            "market_closed": True,
            "note": f"NSE market is closed. Opens Mon-Fri 9:15 AM IST. Current IST time: {now.strftime('%a %H:%M')}",
        }

    try:
        from services.angel_one_oi import get_nifty_oi_angel
        from services.angel_one import is_configured

        if is_configured():
            angel_task = asyncio.create_task(
                get_nifty_oi_angel(force_refresh=force_refresh, update_snapshot=update_snapshot)
            )
            nse_task = asyncio.create_task(_get_nifty_oi_nse(force_refresh=force_refresh))

            angel_result, nse_result = await asyncio.gather(angel_task, nse_task, return_exceptions=True)

            if isinstance(angel_result, Exception):
                log.warning(f"Angel One OI failed: {angel_result}")
                angel_result = None
            if isinstance(nse_result, Exception):
                log.warning(f"NSE OI failed: {nse_result}")
                nse_result = None

            # Use Angel One as primary; merge NSE alerts if available
            if angel_result and not angel_result.get("error"):
                if nse_result and not nse_result.get("error"):
                    nse_alerts = nse_result.get("alerts", [])
                    angel_alerts = angel_result.get("alerts", [])
                    # Deduplicate by alert+direction+strike
                    existing_keys = {
                        (a.get("alert"), a.get("direction"), a.get("strike"))
                        for a in angel_alerts
                    }
                    for a in nse_alerts:
                        key = (a.get("alert"), a.get("direction"), a.get("strike"))
                        if key not in existing_keys:
                            angel_alerts.append(a)
                            existing_keys.add(key)
                    angel_result["alerts"] = angel_alerts
                    angel_result["alert_count"] = len(angel_alerts)
                    angel_result["has_strong_alert"] = any(
                        a.get("strength") == "strong" for a in angel_alerts
                    )
                return angel_result

            if nse_result and not nse_result.get("error"):
                return nse_result

    except Exception as e:
        log.warning(f"OI merge failed, using technical fallback: {e}")

    return await _technical_fallback()


async def _get_nifty_oi_nse(force_refresh: bool = False) -> dict:
    """
    Main function: fetch NSE OI data, parse it, run signal engine.
    Returns full OI data + alerts.
    """
    cache_key = "nifty_oi"
    cached = _oi_cache.get(cache_key)
    if cached and not force_refresh and time.time() - cached[1] < 60:  # 1 min cache
        return cached[0]

    # Fetch current Nifty spot price
    loop = asyncio.get_event_loop()
    raw_oi = await loop.run_in_executor(_executor, _fetch_option_chain_sync, "NIFTY")

    if "error" in raw_oi:
        # Try to get spot from yfinance as fallback
        try:
            import yfinance as yf
            ticker = yf.Ticker("^NSEI")
            spot = ticker.info.get("regularMarketPrice", 0) or ticker.info.get("previousClose", 0)
        except Exception:
            spot = 0
        return {
            "error": raw_oi["error"],
            "spot_price": spot,
            "alerts": [],
            "oi_data": {},
        }

    # Extract spot price from NSE response
    spot_price = raw_oi.get("records", {}).get("underlyingValue", 0)
    if not spot_price:
        try:
            import yfinance as yf
            ticker = yf.Ticker("^NSEI")
            spot_price = ticker.info.get("regularMarketPrice") or ticker.info.get("previousClose") or 0
        except Exception:
            spot_price = 0

    # Check if NSE returned empty (blocked or market closed)
    records_data = raw_oi.get("records", {}).get("data", [])
    if not records_data and not raw_oi.get("records", {}).get("expiryDates"):
        # Fallback: generate technical signals from price data
        result = await _technical_fallback(spot_price)
        _oi_cache[cache_key] = (result, time.time())
        return result

    oi_data = _parse_option_chain(raw_oi, spot_price)

    # Get previous price for trend detection (from cache)
    prev_data = _oi_cache.get("prev_price")
    prev_price = prev_data[0] if prev_data else spot_price * 0.999

    alerts = _analyze_oi_signals(oi_data, prev_price, spot_price)

    # Store current price for next comparison
    _oi_cache["prev_price"] = (spot_price, time.time())

    result = {
        "spot_price": spot_price,
        "oi_data": oi_data,
        "alerts": alerts,
        "alert_count": len(alerts),
        "has_strong_alert": any(a.get("strength") == "strong" for a in alerts),
    }

    _oi_cache[cache_key] = (result, time.time())
    return result


async def get_nifty_oi_summary() -> dict:
    """Lightweight summary for dashboard widgets."""
    data = await get_nifty_oi()
    oi = data.get("oi_data", {})
    return {
        "spot_price": data.get("spot_price", 0),
        "pcr": oi.get("pcr", 0),
        "pcr_signal": oi.get("pcr_signal", "neutral"),
        "resistance_strike": oi.get("resistance_strike"),
        "support_strike": oi.get("support_strike"),
        "total_call_oi": oi.get("total_call_oi", 0),
        "total_put_oi": oi.get("total_put_oi", 0),
        "alerts": data.get("alerts", []),
        "alert_count": data.get("alert_count", 0),
        "has_strong_alert": data.get("has_strong_alert", False),
        "error": data.get("error"),
    }
