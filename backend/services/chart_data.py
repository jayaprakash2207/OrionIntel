"""
Chart Data Service — Universal OHLCV fetcher via yfinance
Supports: Indian (NSE/BSE), US stocks, Crypto, Forex, Futures, Indices
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=4)

# Watchlist presets
WATCHLIST = {
    "india_indices": [
        {"symbol": "^NSEI",    "label": "NIFTY 50",    "exchange": "NSE"},
        {"symbol": "^BSESN",   "label": "SENSEX",      "exchange": "BSE"},
        {"symbol": "^NSEBANK", "label": "BANKNIFTY",   "exchange": "NSE"},
        {"symbol": "^CNXIT",   "label": "NIFTY IT",    "exchange": "NSE"},
        {"symbol": "^CNXAUTO", "label": "NIFTY AUTO",  "exchange": "NSE"},
        {"symbol": "^CNXPHARMA","label":"NIFTY PHARMA","exchange": "NSE"},
    ],
    "india_stocks": [
        {"symbol": "RELIANCE.NS", "label": "RELIANCE"},
        {"symbol": "TCS.NS",      "label": "TCS"},
        {"symbol": "HDFCBANK.NS", "label": "HDFC BANK"},
        {"symbol": "INFY.NS",     "label": "INFOSYS"},
        {"symbol": "ICICIBANK.NS","label": "ICICI BANK"},
        {"symbol": "WIPRO.NS",    "label": "WIPRO"},
        {"symbol": "AXISBANK.NS", "label": "AXIS BANK"},
        {"symbol": "BAJFINANCE.NS","label":"BAJAJ FIN"},
        {"symbol": "SBIN.NS",     "label": "SBI"},
        {"symbol": "ADANIENT.NS", "label": "ADANI ENT"},
    ],
    "us_indices": [
        {"symbol": "^GSPC", "label": "S&P 500"},
        {"symbol": "^IXIC", "label": "NASDAQ"},
        {"symbol": "^DJI",  "label": "DOW JONES"},
        {"symbol": "^RUT",  "label": "RUSSELL 2000"},
        {"symbol": "^VIX",  "label": "VIX"},
    ],
    "us_stocks": [
        {"symbol": "AAPL",  "label": "APPLE"},
        {"symbol": "NVDA",  "label": "NVIDIA"},
        {"symbol": "MSFT",  "label": "MICROSOFT"},
        {"symbol": "TSLA",  "label": "TESLA"},
        {"symbol": "AMZN",  "label": "AMAZON"},
        {"symbol": "META",  "label": "META"},
        {"symbol": "GOOGL", "label": "GOOGLE"},
    ],
    "crypto": [
        {"symbol": "BTC-USD", "label": "BITCOIN"},
        {"symbol": "ETH-USD", "label": "ETHEREUM"},
        {"symbol": "BNB-USD", "label": "BNB"},
        {"symbol": "SOL-USD", "label": "SOLANA"},
        {"symbol": "XRP-USD", "label": "XRP"},
    ],
    "commodities": [
        {"symbol": "GC=F", "label": "GOLD"},
        {"symbol": "SI=F", "label": "SILVER"},
        {"symbol": "CL=F", "label": "CRUDE OIL"},
        {"symbol": "NG=F", "label": "NAT GAS"},
    ],
}

INTERVAL_MAP = {
    # Seconds → mapped to 1m (yfinance minimum)
    "15s": "1m", "30s": "1m", "45s": "1m",
    # Minutes
    "1m": "1m", "2m": "2m",
    "3m": "5m",   # yfinance fallback (Angel One handles 3m natively)
    "4m": "5m",   # yfinance fallback
    "5m": "5m", "10m": "15m",  # yfinance fallback (Angel One handles 10m natively)
    "15m": "15m", "30m": "30m",
    "75m": "90m", "125m": "90m",  # yfinance fallback
    # Hours / Daily
    "60m": "60m", "90m": "90m",
    "1h": "60m", "4h": "60m",
    "1d": "1d", "5d": "5d", "1wk": "1wk", "1mo": "1mo",
    # aliases
    "1D": "1d", "1W": "1wk", "1M": "1mo",
}

PERIOD_MAP = {
    "1d": "1d", "2d": "2d", "5d": "5d", "1mo": "1mo", "3mo": "3mo",
    "6mo": "6mo", "1y": "1y", "2y": "2y", "5y": "5y", "max": "max",
}


def _fetch_bars_sync(symbol: str, period: str = "1y", interval: str = "1d") -> dict:
    try:
        import yfinance as yf
        # Normalize interval for yfinance
        yf_interval = INTERVAL_MAP.get(interval, interval)
        # Intraday limits enforced by yfinance
        if yf_interval == "1m":
            # 1m: fetch 2d so we always get data even if today is partial/weekend
            period = "2d"
            # After fetching we'll filter to most recent trading day only
        elif yf_interval in ("2m", "5m", "15m", "30m", "90m"):
            # max 60 days
            if period in ("1y", "2y", "5y", "max"):
                period = "1mo"
        elif yf_interval == "60m":
            # max 730 days
            if period in ("5y", "max"):
                period = "1y"
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=yf_interval)
        # If no data (market closed / weekend for 1m), try falling back to 5d
        if hist.empty and yf_interval == "1m":
            hist = ticker.history(period="5d", interval="1m")
        if hist.empty:
            return {"symbol": symbol, "bars": [], "error": "No data"}

        # For 1m: keep only the most recent trading day
        if yf_interval == "1m" and not hist.empty:
            last_date = hist.index[-1].date()
            hist = hist[hist.index.date == last_date]
            # If still empty (market not open today), keep all
            if hist.empty:
                hist = ticker.history(period="5d", interval="1m")

        info = ticker.info
        bars = []
        for ts, row in hist.iterrows():
            # Convert timestamp to unix for lightweight-charts
            try:
                t = int(ts.timestamp())
            except Exception:
                t = int(ts.value // 1e9)
            bars.append({
                "time": t,
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row["Volume"]) if row["Volume"] else 0,
            })

        # Latest quote info
        last = bars[-1] if bars else {}
        prev = bars[-2] if len(bars) >= 2 else last
        change = last.get("close", 0) - prev.get("close", 0)
        change_pct = (change / prev.get("close", 1) * 100) if prev.get("close") else 0

        return {
            "symbol": symbol,
            "label": info.get("longName") or info.get("shortName") or symbol,
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", ""),
            "bars": bars,
            "last_close": last.get("close", 0),
            "prev_close": prev.get("close", 0),
            "change": round(change, 4),
            "change_pct": round(change_pct, 4),
            "day_high": last.get("high", 0),
            "day_low": last.get("low", 0),
            "day_open": last.get("open", 0),
            "volume": last.get("volume", 0),
            "total_bars": len(bars),
        }
    except Exception as e:
        return {"symbol": symbol, "bars": [], "error": str(e)}


async def get_chart_data(symbol: str, period: str = "3mo", interval: str = "1d") -> dict:
    # Use Angel One for Indian symbols when configured (real-time, no delay)
    try:
        from services.angel_one import is_configured, get_angel_history, SYMBOL_MAP
        PERIOD_TO_DAYS = {"1d": 1, "2d": 2, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
        if is_configured() and symbol in SYMBOL_MAP:
            days = PERIOD_TO_DAYS.get(period, 1)
            result = await get_angel_history(symbol, interval=interval, days=days)
            if result.get("bars"):
                return result
    except Exception:
        pass
    # Fallback: yfinance (15min delayed)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _fetch_bars_sync, symbol, period, interval)


def _fetch_quote_sync(symbol: str) -> dict:
    try:
        import yfinance as yf
        info = yf.Ticker(symbol).info
        price = info.get("regularMarketPrice") or info.get("previousClose") or 0
        prev = info.get("previousClose") or price
        change = price - prev
        change_pct = (change / prev * 100) if prev else 0
        return {
            "symbol": symbol,
            "price": round(price, 4),
            "change": round(change, 4),
            "change_pct": round(change_pct, 4),
            "label": info.get("shortName") or symbol,
        }
    except Exception as e:
        return {"symbol": symbol, "price": 0, "error": str(e)}


async def get_watchlist_quotes(symbols: list) -> list:
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(_executor, _fetch_quote_sync, s) for s in symbols]
    return await asyncio.gather(*tasks)
