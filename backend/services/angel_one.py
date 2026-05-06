"""
Angel One SmartAPI Integration
Real-time NSE/BSE market data — quotes, OHLCV history
Auto-used for Indian symbols; falls back to yfinance for everything else.
"""
import asyncio
import time
import pyotp
import logging
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from core.config import settings

log = logging.getLogger("angel_one")
_executor = ThreadPoolExecutor(max_workers=4)

# Cache: stores the authenticated SmartConnect instance + expiry
_api_cache: dict = {"api": None, "expires_at": 0}
_quote_cache: dict = {}
_hist_cache: dict = {}

# ── Symbol map ───────────────────────────────────────────────────────────────
# Format: yfinance_symbol → (angel_symbol, token, exchange)
# Stocks use "SYMBOL-EQ" format; Indices use plain name with AMXIDX tokens.
SYMBOL_MAP = {
    # ── NSE Indices ──────────────────────────────────────────────────────────
    "^NSEI":        ("NIFTY",        "99926000", "NSE"),
    "^NSEBANK":     ("BANKNIFTY",    "99926009", "NSE"),
    "^CNXIT":       ("NIFTY IT",     "99926008", "NSE"),
    "^CNXAUTO":     ("NIFTY AUTO",   "99926029", "NSE"),
    "^CNXPHARMA":   ("NIFTY PHARMA", "99926023", "NSE"),
    "^CNXFMCG":     ("NIFTY FMCG",   "99926021", "NSE"),
    "^CNXMETAL":    ("NIFTY METAL",  "99926030", "NSE"),
    "^CNXREALTY":   ("NIFTY REALTY", "99926018", "NSE"),
    # ── BSE Indices ──────────────────────────────────────────────────────────
    "^BSESN":       ("SENSEX",       "99919000", "BSE"),
    # ── NSE Large Cap Stocks ─────────────────────────────────────────────────
    "RELIANCE.NS":   ("RELIANCE-EQ",   "2885",  "NSE"),
    "TCS.NS":        ("TCS-EQ",        "11536", "NSE"),
    "HDFCBANK.NS":   ("HDFCBANK-EQ",   "1333",  "NSE"),
    "INFY.NS":       ("INFY-EQ",       "1594",  "NSE"),
    "ICICIBANK.NS":  ("ICICIBANK-EQ",  "4963",  "NSE"),
    "WIPRO.NS":      ("WIPRO-EQ",      "3787",  "NSE"),
    "AXISBANK.NS":   ("AXISBANK-EQ",   "5900",  "NSE"),
    "BAJFINANCE.NS": ("BAJFINANCE-EQ", "317",   "NSE"),
    "SBIN.NS":       ("SBIN-EQ",       "3045",  "NSE"),
    "ADANIENT.NS":   ("ADANIENT-EQ",   "25",    "NSE"),
    "LT.NS":         ("LT-EQ",         "11483", "NSE"),
    "HINDUNILVR.NS": ("HINDUNILVR-EQ", "1394",  "NSE"),
    "ITC.NS":        ("ITC-EQ",        "1660",  "NSE"),
    "MARUTI.NS":     ("MARUTI-EQ",     "10999", "NSE"),
    "TATASTEEL.NS":  ("TATASTEEL-EQ",  "3499",  "NSE"),
    "SUNPHARMA.NS":  ("SUNPHARMA-EQ",  "3351",  "NSE"),
    "ONGC.NS":       ("ONGC-EQ",       "2475",  "NSE"),
    "NTPC.NS":       ("NTPC-EQ",       "11630", "NSE"),
    "POWERGRID.NS":  ("POWERGRID-EQ",  "14977", "NSE"),
    "COALINDIA.NS":  ("COALINDIA-EQ",  "20374", "NSE"),
    "BHARTIARTL.NS": ("BHARTIARTL-EQ", "10604", "NSE"),
    "KOTAKBANK.NS":  ("KOTAKBANK-EQ",  "1922",  "NSE"),
    "ULTRACEMCO.NS": ("ULTRACEMCO-EQ", "11532", "NSE"),
    "TITAN.NS":      ("TITAN-EQ",      "3506",  "NSE"),
}

INTERVAL_MAP = {
    "15s": "ONE_MINUTE", "30s": "ONE_MINUTE", "45s": "ONE_MINUTE",
    "1m":  "ONE_MINUTE",
    "2m":  "ONE_MINUTE",
    "3m":  "THREE_MINUTE",
    "4m":  "THREE_MINUTE",
    "5m":  "FIVE_MINUTE",
    "10m": "TEN_MINUTE",
    "15m": "FIFTEEN_MINUTE",
    "30m": "THIRTY_MINUTE",
    "60m": "ONE_HOUR", "1h": "ONE_HOUR",
    "75m": "ONE_HOUR", "125m": "ONE_HOUR",
    "1d":  "ONE_DAY", "1D": "ONE_DAY", "1wk": "ONE_DAY",
}

# Cache TTL per interval (seconds)
CACHE_TTL = {
    "ONE_MINUTE":    60,   # cache 60s — Angel One rate limit is ~3 req/min
    "THREE_MINUTE":  90,
    "FIVE_MINUTE":   90,
    "TEN_MINUTE":    180,
    "FIFTEEN_MINUTE":180,
    "THIRTY_MINUTE": 300,
    "ONE_HOUR":      600,
    "ONE_DAY":       3600,
}

# Period → days of history to fetch
PERIOD_TO_DAYS = {
    "1d": 1, "2d": 2, "5d": 5,
    "1mo": 30, "3mo": 90, "6mo": 180,
    "1y": 365, "2y": 400,   # Angel One intraday limit ~400 days
    "5y": 400, "max": 400,
}

# Angel One intraday data limits (max days back per interval)
INTERVAL_MAX_DAYS = {
    "ONE_MINUTE":     30,
    "THREE_MINUTE":   60,
    "FIVE_MINUTE":    100,
    "TEN_MINUTE":     100,
    "FIFTEEN_MINUTE": 200,
    "THIRTY_MINUTE":  200,
    "ONE_HOUR":       400,
    "ONE_DAY":        2000,
}


def _get_api():
    """Return a cached authenticated SmartConnect instance."""
    if _api_cache["api"] and time.time() < _api_cache["expires_at"]:
        return _api_cache["api"]

    from SmartApi import SmartConnect
    api = SmartConnect(api_key=settings.ANGEL_API_KEY)
    api.timeout = 15  # increase timeout from default 7s to 15s
    totp = pyotp.TOTP(settings.ANGEL_TOTP_SECRET).now()
    session = api.generateSession(
        clientCode=settings.ANGEL_CLIENT_ID,
        password=settings.ANGEL_PIN,
        totp=totp,
    )
    if not session or session.get("status") is False:
        raise ValueError(f"Angel One login failed: {session}")

    _api_cache["api"] = api
    _api_cache["expires_at"] = time.time() + 3600
    log.info("[AngelOne] Session refreshed")
    return api


def _is_index(angel_symbol: str) -> bool:
    """Indices don't use -EQ suffix."""
    return not angel_symbol.endswith("-EQ")


def _fetch_quote_sync(yf_symbol: str) -> dict:
    mapping = SYMBOL_MAP.get(yf_symbol)
    if not mapping:
        return {"symbol": yf_symbol, "price": 0, "error": "Not in Angel One map"}

    angel_symbol, token, exchange = mapping

    cache_key = f"q_{yf_symbol}"
    cached = _quote_cache.get(cache_key)
    if cached and time.time() - cached[1] < 5:
        return cached[0]

    try:
        api = _get_api()
        data = api.ltpData(exchange, angel_symbol, token)
        if not data or data.get("status") is False:
            raise ValueError(f"LTP failed: {data}")

        d = data.get("data", {})
        result = {
            "symbol":   yf_symbol,
            "label":    angel_symbol,
            "price":    float(d.get("ltp", 0)),
            "open":     float(d.get("open", 0)),
            "high":     float(d.get("high", 0)),
            "low":      float(d.get("low", 0)),
            "close":    float(d.get("close", 0)),
            "exchange": exchange,
            "source":   "angel_one_live",
        }
        _quote_cache[cache_key] = (result, time.time())
        return result

    except Exception as e:
        log.error(f"[AngelOne] Quote error {yf_symbol}: {e}")
        # Invalidate session on auth errors so next call re-logins
        if "token" in str(e).lower() or "auth" in str(e).lower():
            _api_cache["expires_at"] = 0
        return {"symbol": yf_symbol, "price": 0, "error": str(e)}


def _fetch_history_sync(yf_symbol: str, interval: str = "5m", days: int = 5) -> dict:
    mapping = SYMBOL_MAP.get(yf_symbol)
    if not mapping:
        return {"symbol": yf_symbol, "bars": [], "error": "Not in Angel One map"}

    angel_symbol, token, exchange = mapping
    angel_interval = INTERVAL_MAP.get(interval, "FIVE_MINUTE")

    # Respect Angel One's max lookback per interval
    max_days = INTERVAL_MAX_DAYS.get(angel_interval, 100)
    days = min(days, max_days)

    cache_key = f"h_{yf_symbol}_{interval}"
    cached = _hist_cache.get(cache_key)
    ttl = CACHE_TTL.get(angel_interval, 60)
    if cached and time.time() - cached[1] < ttl:
        return cached[0]

    try:
        api = _get_api()
        to_date   = datetime.now()
        from_date = to_date - timedelta(days=days)

        params = {
            "exchange":    exchange,
            "symboltoken": token,
            "interval":    angel_interval,
            "fromdate":    from_date.strftime("%Y-%m-%d %H:%M"),
            "todate":      to_date.strftime("%Y-%m-%d %H:%M"),
        }
        data = api.getCandleData(params)

        if not data or data.get("status") is False:
            raise ValueError(f"History failed: {data}")

        raw_bars = data.get("data", [])
        if not raw_bars:
            return {"symbol": yf_symbol, "bars": [], "error": "No data returned (market may be closed)"}

        bars = []
        for b in raw_bars:
            # Format: [timestamp_str, open, high, low, close, volume]
            try:
                dt_str = b[0][:19].replace("T", " ")
                dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
                bars.append({
                    "time":   int(dt.timestamp()),
                    "open":   round(float(b[1]), 2),
                    "high":   round(float(b[2]), 2),
                    "low":    round(float(b[3]), 2),
                    "close":  round(float(b[4]), 2),
                    "volume": int(b[5]) if len(b) > 5 else 0,
                })
            except Exception:
                continue

        if not bars:
            return {"symbol": yf_symbol, "bars": [], "error": "Failed to parse bars"}

        last = bars[-1]
        prev = bars[-2] if len(bars) >= 2 else last
        change     = last["close"] - prev["close"]
        change_pct = (change / prev["close"] * 100) if prev["close"] else 0

        # Day high/low from today's bars only
        today = datetime.now().date()
        today_ts = datetime(today.year, today.month, today.day).timestamp()
        today_bars = [b for b in bars if b["time"] >= today_ts] or bars[-20:]

        result = {
            "symbol":     yf_symbol,
            "label":      angel_symbol.replace("-EQ", ""),
            "exchange":   exchange,
            "bars":       bars,
            "last_close": last["close"],
            "prev_close": prev["close"],
            "change":     round(change, 2),
            "change_pct": round(change_pct, 4),
            "day_high":   max(b["high"] for b in today_bars),
            "day_low":    min(b["low"]  for b in today_bars),
            "day_open":   today_bars[0]["open"],
            "volume":     last["volume"],
            "total_bars": len(bars),
            "source":     "angel_one_live",
        }
        _hist_cache[cache_key] = (result, time.time())
        return result

    except Exception as e:
        log.error(f"[AngelOne] History error {yf_symbol}: {e}")
        if "token" in str(e).lower() or "auth" in str(e).lower():
            _api_cache["expires_at"] = 0
        return {"symbol": yf_symbol, "bars": [], "error": str(e)}


async def get_angel_quote(yf_symbol: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _fetch_quote_sync, yf_symbol)


async def get_angel_history(yf_symbol: str, interval: str = "5m", days: int = 5) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _fetch_history_sync, yf_symbol, interval, days)


def is_configured() -> bool:
    return bool(
        settings.ANGEL_API_KEY and
        settings.ANGEL_CLIENT_ID and
        settings.ANGEL_PIN and
        settings.ANGEL_TOTP_SECRET
    )


def get_status() -> dict:
    configured = is_configured()
    session_alive = bool(_api_cache["api"] and time.time() < _api_cache["expires_at"])
    return {
        "configured":        configured,
        "session_alive":     session_alive,
        "session_expires_in": max(0, int(_api_cache["expires_at"] - time.time())),
        "supported_symbols": list(SYMBOL_MAP.keys()),
        "missing_env":       [k for k in ["ANGEL_API_KEY", "ANGEL_CLIENT_ID", "ANGEL_PIN", "ANGEL_TOTP_SECRET"]
                              if not getattr(settings, k, "")],
    }
