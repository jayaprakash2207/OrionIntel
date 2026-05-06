"""
Global Morning Pulse
Checks US, Asian, and European markets before Indian open.
Generates a compact market bias and Indian day outlook.
"""

import asyncio
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import httpx

from core.gemini import ask_json

_executor = ThreadPoolExecutor(max_workers=8)
_cache: dict = {}

_NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.nseindia.com/",
    "Origin": "https://www.nseindia.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}

THRESHOLD = 0.6

US_MARKETS = [
    {"symbol": "ES=F", "label": "S&P 500 Futures", "region": "US"},
    {"symbol": "NQ=F", "label": "Nasdaq Futures", "region": "US"},
    {"symbol": "YM=F", "label": "Dow Futures", "region": "US"},
    {"symbol": "^RUT", "label": "Russell 2000", "region": "US"},
]

ASIAN_MARKETS = [
    {"symbol": "^N225", "label": "Nikkei 225", "region": "Asia", "country": "Japan"},
    {"symbol": "^HSI", "label": "Hang Seng", "region": "Asia", "country": "Hong Kong"},
    {"symbol": "000001.SS", "label": "Shanghai Comp", "region": "Asia", "country": "China"},
    {"symbol": "^STI", "label": "Straits Times", "region": "Asia", "country": "Singapore"},
    {"symbol": "^KS11", "label": "KOSPI", "region": "Asia", "country": "South Korea"},
    {"symbol": "^TWII", "label": "Taiwan Weighted", "region": "Asia", "country": "Taiwan"},
]

EUROPEAN_MARKETS = [
    {"symbol": "^GDAXI", "label": "DAX (Germany)", "region": "Europe"},
    {"symbol": "^FTSE", "label": "FTSE 100 (UK)", "region": "Europe"},
    {"symbol": "^FCHI", "label": "CAC 40 (France)", "region": "Europe"},
    {"symbol": "^STOXX50E", "label": "EuroStoxx 50", "region": "Europe"},
    {"symbol": "FDAX.DE", "label": "DAX Futures", "region": "Europe"},
]


def _fetch_quote_sync(item: dict) -> dict:
    try:
        import yfinance as yf

        ticker = yf.Ticker(item["symbol"])
        info = ticker.info
        price = info.get("regularMarketPrice") or info.get("previousClose") or 0
        prev = info.get("previousClose") or price
        change = price - prev
        change_pct = (change / prev * 100) if prev else 0
        return {
            **item,
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 3),
            "prev_close": round(prev, 2),
            "signal": "up" if change_pct > THRESHOLD else ("down" if change_pct < -THRESHOLD else "flat"),
        }
    except Exception as exc:
        return {**item, "price": 0, "change": 0, "change_pct": 0, "signal": "flat", "error": str(exc)}


async def _fetch_all(items: list) -> list:
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(_executor, _fetch_quote_sync, item) for item in items]
    return await asyncio.gather(*tasks)


def _score(markets: list) -> dict:
    valid = [market for market in markets if market.get("price", 0) > 0]
    up = [market for market in valid if market.get("change_pct", 0) > THRESHOLD]
    down = [market for market in valid if market.get("change_pct", 0) < -THRESHOLD]
    flat = [market for market in valid if abs(market.get("change_pct", 0)) <= THRESHOLD]
    total = len(valid)

    if total == 0:
        return {
            "bias": "NEUTRAL",
            "strategy": "No data",
            "strength": 0,
            "up_count": 0,
            "down_count": 0,
            "flat_count": 0,
            "total_count": 0,
            "up_markets": [],
            "down_markets": [],
            "flat_markets": [],
        }

    up_pct = len(up) / total * 100
    down_pct = len(down) / total * 100

    if up_pct >= 60:
        bias = "BULLISH"
        strategy = "BUY ON EVERY DIP"
        strength = min(100, int(up_pct * 1.2))
    elif down_pct >= 60:
        bias = "BEARISH"
        strategy = "SELL ON EVERY RISE"
        strength = min(100, int(down_pct * 1.2))
    else:
        bias = "NEUTRAL"
        strategy = "AVOID BIG BETS - wait for clarity"
        strength = 50

    return {
        "bias": bias,
        "strategy": strategy,
        "strength": strength,
        "up_count": len(up),
        "down_count": len(down),
        "flat_count": len(flat),
        "total_count": total,
        "up_markets": [market["label"] for market in up],
        "down_markets": [market["label"] for market in down],
        "flat_markets": [market["label"] for market in flat],
    }


def _parse_gift_from_html(page_text: str) -> dict:
    match = re.search(r'"giftnifty":(\{.*?\}),"ejsHelpers"', page_text, re.S)
    if not match:
        return {}

    gift = httpx.Response(200, content=match.group(1)).json()
    if not isinstance(gift, dict) or gift.get("LASTPRICE") is None:
        return {}

    ts_raw = (gift.get("TIMESTMP") or "").strip()
    ts_iso = ""
    if ts_raw:
        try:
            ts_iso = datetime.strptime(ts_raw, "%d-%b-%Y %H:%M").isoformat()
        except Exception:
            ts_iso = ts_raw

    change_pct = float(gift.get("PERCHANGE") or 0)
    return {
        "symbol": "GIFT_NIFTY",
        "label": "GIFT NIFTY",
        "price": round(float(gift.get("LASTPRICE") or 0), 2),
        "change": round(float(gift.get("DAYCHANGE") or 0), 2),
        "change_pct": round(change_pct, 3),
        "signal": "up" if change_pct > THRESHOLD else ("down" if change_pct < -THRESHOLD else "flat"),
        "expiry": gift.get("EXPIRYDATE", ""),
        "timestamp": ts_iso,
        "source": "NSE live-equity-market HTML",
        "note": "Live GIFT Nifty embedded on NSE market page",
        "is_estimated": False,
    }


async def _fetch_gift_nifty_live() -> dict:
    cache_key = "gift_nifty_live"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 45:
        return cached[0]

    async with httpx.AsyncClient(timeout=15, headers=_NSE_HEADERS, follow_redirects=True) as client:
        try:
            page = await client.get("https://www.nseindia.com/market-data/live-equity-market", timeout=12)
            if page.status_code == 200:
                data = _parse_gift_from_html(page.text)
                if data:
                    _cache[cache_key] = (data, time.time())
                    return data
        except Exception:
            pass

        try:
            await client.get("https://www.nseindia.com", timeout=10)
            await asyncio.sleep(0.3)
            await client.get("https://www.nseindia.com/market-data/live-equity-market", timeout=10)
            await asyncio.sleep(0.2)

            for _ in range(2):
                r = await client.get("https://www.nseindia.com/api/marketStatus", timeout=12)
                payload = r.json() if r.status_code == 200 else {}
                gift = payload.get("giftnifty") if isinstance(payload, dict) else None
                if isinstance(gift, dict) and gift.get("LASTPRICE") is not None:
                    ts_raw = (gift.get("TIMESTMP") or "").strip()
                    ts_iso = ""
                    if ts_raw:
                        try:
                            ts_iso = datetime.strptime(ts_raw, "%d-%b-%Y %H:%M").isoformat()
                        except Exception:
                            ts_iso = ts_raw

                    change_pct = float(gift.get("PERCHANGE") or 0)
                    data = {
                        "symbol": "GIFT_NIFTY",
                        "label": "GIFT NIFTY",
                        "price": round(float(gift.get("LASTPRICE") or 0), 2),
                        "change": round(float(gift.get("DAYCHANGE") or 0), 2),
                        "change_pct": round(change_pct, 3),
                        "signal": "up" if change_pct > THRESHOLD else ("down" if change_pct < -THRESHOLD else "flat"),
                        "expiry": gift.get("EXPIRYDATE", ""),
                        "timestamp": ts_iso,
                        "source": "NSE marketStatus.giftnifty",
                        "note": "Live GIFT Nifty futures from NSE",
                        "is_estimated": False,
                    }
                    _cache[cache_key] = (data, time.time())
                    return data
                await asyncio.sleep(0.2)
        except Exception:
            pass

    return {}


async def get_morning_pulse() -> dict:
    cache_key = "morning_pulse"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 120:
        return cached[0]

    us_data, asia_data = await asyncio.gather(
        _fetch_all(US_MARKETS),
        _fetch_all(ASIAN_MARKETS),
    )

    combined = _score(us_data + asia_data)
    result = {
        "us_markets": us_data,
        "asia_markets": asia_data,
        "combined": combined,
        "us_signal": _score(us_data),
        "asia_signal": _score(asia_data),
        "timestamp": datetime.utcnow().isoformat(),
    }
    _cache[cache_key] = (result, time.time())
    return result


async def get_european_pulse() -> dict:
    cache_key = "european_pulse"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 120:
        return cached[0]

    europe_data = await _fetch_all(EUROPEAN_MARKETS)
    combined = _score(europe_data)
    result = {
        "europe_markets": europe_data,
        "combined": combined,
        "timestamp": datetime.utcnow().isoformat(),
    }
    _cache[cache_key] = (result, time.time())
    return result


async def get_golden_day_analysis() -> dict:
    morning = await get_morning_pulse()
    combined = morning["combined"]

    result = await ask_json(
        f"""You are analyzing whether today is a "Golden Day" for Indian markets (NIFTY/SENSEX).

A Golden Day means Indian markets follow global markets direction strongly.

Current global market data:
- Overall bias: {combined['bias']}
- Markets UP >0.6%: {combined['up_count']} ({combined['up_markets']})
- Markets DOWN >0.6%: {combined['down_count']} ({combined['down_markets']})
- Combined strength: {combined['strength']}%

Return JSON:
{{
  "is_golden_day": true/false,
  "golden_day_confidence": int,
  "golden_day_reason": str,
  "nifty_direction": "up/down/sideways",
  "expected_nifty_range": str,
  "intraday_strategy": str,
  "key_levels_to_watch": str,
  "best_trade_time": str,
  "risk_level": "low/medium/high",
  "morning_summary": str,
  "what_to_do": str,
  "what_to_avoid": str,
  "global_correlation_strength": "strong/moderate/weak",
  "historical_context": str
}}"""
    )

    return result if isinstance(result, dict) else {"error": "Analysis failed"}


async def get_india_day_prediction() -> dict:
    cache_key = "india_day_prediction"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 90:
        return cached[0]

    indian_symbols = [
        {"symbol": "^NSEI", "label": "Nifty 50 Spot", "region": "India"},
        {"symbol": "^NSEBANK", "label": "Bank Nifty", "region": "India"},
        {"symbol": "NIFTYBEES.NS", "label": "Nifty ETF", "region": "India"},
    ]

    us_futures = [
        {"symbol": "ES=F", "label": "S&P 500 Futures", "region": "US"},
        {"symbol": "NQ=F", "label": "Nasdaq Futures", "region": "US"},
    ]

    asian_key = [
        {"symbol": "^N225", "label": "Nikkei 225", "region": "Asia"},
        {"symbol": "^HSI", "label": "Hang Seng", "region": "Asia"},
    ]

    india_data, us_data, asia_data, gift_live = await asyncio.gather(
        _fetch_all(indian_symbols),
        _fetch_all(us_futures),
        _fetch_all(asian_key),
        _fetch_gift_nifty_live(),
    )

    morning = await get_morning_pulse()
    combined = morning.get("combined", {})

    nifty = next((market for market in india_data if market.get("symbol") == "^NSEI"), {})
    banknifty = next((market for market in india_data if market.get("symbol") == "^NSEBANK"), {})

    gift_approx = gift_live if gift_live.get("price") else {}
    if not gift_approx.get("price"):
        nifty_price = nifty.get("price", 0)
        sp_change = next((market for market in us_data if market.get("symbol") == "ES=F"), {}).get("change_pct", 0)
        gift_estimated_price = round(nifty_price * (1 + sp_change / 100 * 0.7), 0) if nifty_price else 0
        gift_approx = {
            "symbol": "GIFT_NIFTY",
            "label": "GIFT NIFTY (estimated)",
            "price": gift_estimated_price,
            "change_pct": round(sp_change * 0.7, 3),
            "source": "estimated_from_global_correlation",
            "note": "Estimated from SGX correlation",
            "is_estimated": True,
        }

    result = await ask_json(
        f"""You are a senior Indian market analyst and expert Nifty 50 trader.
Today's date context: you are analyzing the current day before or during Indian market hours.

All data provided is real-time / latest available.

GIFT NIFTY: {gift_approx}
Nifty 50 Spot: {nifty}
Bank Nifty: {banknifty}
US Futures: {us_data}
Asian Markets: {asia_data}
Global Bias: {combined.get('bias', 'NEUTRAL')} (strength: {combined.get('strength', 50)}%)
US Signal: {morning.get('us_signal', {})}
Asia Signal: {morning.get('asia_signal', {})}

Return JSON:
{{
  "gift_nifty": {{
    "price": float,
    "change_pct": float,
    "signal": "bullish/bearish/neutral",
    "premium_over_spot": float
  }},
  "nifty_open_prediction": {{
    "expected_open": float,
    "gap_type": "gap_up/gap_down/flat",
    "gap_points": float,
    "gap_pct": float,
    "confidence": int
  }},
  "intraday_prediction": {{
    "expected_high": float,
    "expected_low": float,
    "range_points": float,
    "capturable_points": float,
    "market_type": "trending/choppy/volatile",
    "direction_bias": "up/down/sideways",
    "best_time_to_trade": str,
    "morning_session": str,
    "afternoon_session": str
  }},
  "key_levels": {{
    "strong_support_1": float,
    "strong_support_2": float,
    "strong_resistance_1": float,
    "strong_resistance_2": float,
    "pivot": float
  }},
  "bank_nifty": {{
    "bias": "bullish/bearish/neutral",
    "expected_range": str,
    "key_level": float
  }},
  "trade_plan": {{
    "primary_strategy": str,
    "long_entry": float,
    "long_target_1": float,
    "long_target_2": float,
    "long_stop": float,
    "short_entry": float,
    "short_target_1": float,
    "short_target_2": float,
    "short_stop": float,
    "avoid_trading_if": str
  }},
  "global_correlation": {{
    "following_global": true/false,
    "correlation_strength": "strong/moderate/weak",
    "key_driver": str
  }},
  "summary": str,
  "one_line_verdict": str,
  "confidence": int,
  "risk_level": "low/medium/high",
  "warning": str
}}"""
    )

    data = {
        "gift_nifty_raw": gift_approx,
        "nifty_raw": nifty,
        "banknifty_raw": banknifty,
        "prediction": result if isinstance(result, dict) else {"error": "AI analysis failed"},
    }
    _cache[cache_key] = (data, time.time())
    return data
