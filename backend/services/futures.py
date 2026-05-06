"""
Futures Service — Index, Commodity, Currency, Bond futures
Uses yfinance (Yahoo Finance) — free, no API key needed
"""
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor

_cache: dict = {}
_executor = ThreadPoolExecutor(max_workers=8)

# (yf_symbol, label, category, unit)
FUTURES_CATALOG = [
    # Index Futures
    ("ES=F",  "S&P 500 Futures",      "index",     "points"),
    ("NQ=F",  "Nasdaq 100 Futures",   "index",     "points"),
    ("YM=F",  "Dow Jones Futures",    "index",     "points"),
    ("RTY=F", "Russell 2000 Futures", "index",     "points"),
    ("VX=F",  "VIX Futures",          "index",     "points"),
    # Commodity — Energy
    ("CL=F",  "Crude Oil (WTI)",      "energy",    "USD/bbl"),
    ("BZ=F",  "Brent Crude",          "energy",    "USD/bbl"),
    ("NG=F",  "Natural Gas",          "energy",    "USD/MMBtu"),
    ("RB=F",  "RBOB Gasoline",        "energy",    "USD/gal"),
    ("HO=F",  "Heating Oil",          "energy",    "USD/gal"),
    # Commodity — Metals
    ("GC=F",  "Gold Futures",         "metals",    "USD/oz"),
    ("SI=F",  "Silver Futures",       "metals",    "USD/oz"),
    ("HG=F",  "Copper Futures",       "metals",    "USD/lb"),
    ("PL=F",  "Platinum Futures",     "metals",    "USD/oz"),
    ("PA=F",  "Palladium Futures",    "metals",    "USD/oz"),
    # Commodity — Agriculture
    ("ZC=F",  "Corn Futures",         "agriculture","USD/bu"),
    ("ZW=F",  "Wheat Futures",        "agriculture","USD/bu"),
    ("ZS=F",  "Soybean Futures",      "agriculture","USD/bu"),
    ("ZO=F",  "Oat Futures",          "agriculture","USD/bu"),
    ("KC=F",  "Coffee Futures",       "agriculture","USD/lb"),
    ("CT=F",  "Cotton Futures",       "agriculture","USD/lb"),
    ("SB=F",  "Sugar Futures",        "agriculture","USD/lb"),
    ("CC=F",  "Cocoa Futures",        "agriculture","USD/MT"),
    ("OJ=F",  "Orange Juice",         "agriculture","USD/lb"),
    # Bonds
    ("ZB=F",  "30-Year T-Bond",       "bonds",     "USD"),
    ("ZN=F",  "10-Year T-Note",       "bonds",     "USD"),
    ("ZF=F",  "5-Year T-Note",        "bonds",     "USD"),
    ("ZT=F",  "2-Year T-Note",        "bonds",     "USD"),
    # Currency Futures
    ("6E=F",  "Euro Futures",         "currency",  "USD"),
    ("6J=F",  "Japanese Yen Futures", "currency",  "USD"),
    ("6B=F",  "British Pound Futures","currency",  "USD"),
    ("6C=F",  "Canadian Dollar",      "currency",  "USD"),
    ("6A=F",  "Australian Dollar",    "currency",  "USD"),
    ("6S=F",  "Swiss Franc Futures",  "currency",  "USD"),
]


def _fetch_ticker_sync(symbol: str) -> dict:
    """Synchronous yfinance fetch — runs in thread pool."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        price = info.get("regularMarketPrice") or info.get("previousClose") or 0
        prev = info.get("previousClose") or info.get("regularMarketPreviousClose") or price
        change = price - prev if price and prev else 0
        change_pct = (change / prev * 100) if prev else 0
        return {
            "price": round(price, 4),
            "prev_close": round(prev, 4),
            "change": round(change, 4),
            "change_pct": round(change_pct, 4),
            "high": round(info.get("dayHigh") or info.get("regularMarketDayHigh") or 0, 4),
            "low": round(info.get("dayLow") or info.get("regularMarketDayLow") or 0, 4),
            "volume": info.get("regularMarketVolume") or 0,
            "name": info.get("longName") or info.get("shortName") or symbol,
        }
    except Exception as e:
        return {"price": 0, "error": str(e)}


async def _fetch_ticker(symbol: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _fetch_ticker_sync, symbol)


async def get_futures_by_category(category: str = "all") -> list:
    """Get futures quotes filtered by category."""
    cache_key = f"futures_{category}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 20:
        return cached[0]

    catalog = FUTURES_CATALOG if category == "all" else [
        f for f in FUTURES_CATALOG if f[2] == category
    ]

    tasks = [_fetch_ticker(sym) for sym, *_ in catalog]
    quotes = await asyncio.gather(*tasks)

    result = []
    for i, (sym, label, cat, unit) in enumerate(catalog):
        q = quotes[i]
        result.append({
            "symbol": sym,
            "label": label,
            "category": cat,
            "unit": unit,
            **q,
        })

    _cache[cache_key] = (result, time.time())
    return result


async def get_all_futures() -> dict:
    """Get all futures grouped by category."""
    cache_key = "futures_all_grouped"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 20:
        return cached[0]

    all_syms = [sym for sym, *_ in FUTURES_CATALOG]
    tasks = [_fetch_ticker(sym) for sym in all_syms]
    quotes = await asyncio.gather(*tasks)

    grouped: dict = {}
    for i, (sym, label, cat, unit) in enumerate(FUTURES_CATALOG):
        q = quotes[i]
        entry = {"symbol": sym, "label": label, "unit": unit, **q}
        grouped.setdefault(cat, []).append(entry)

    _cache[cache_key] = (grouped, time.time())
    return grouped


async def get_futures_history(symbol: str, period: str = "1mo") -> list:
    """Get OHLCV history for a futures contract."""
    def _fetch():
        import yfinance as yf
        t = yf.Ticker(symbol)
        hist = t.history(period=period)
        rows = []
        for ts, row in hist.iterrows():
            rows.append({
                "time": ts.strftime("%Y-%m-%d"),
                "open": round(row["Open"], 4),
                "high": round(row["High"], 4),
                "low": round(row["Low"], 4),
                "close": round(row["Close"], 4),
                "volume": int(row["Volume"]) if row["Volume"] else 0,
            })
        return rows

    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, _fetch)
    except Exception as e:
        return [{"error": str(e)}]


async def get_futures_analysis(category: str = "energy") -> dict:
    """AI analysis of futures market for a category."""
    from core.gemini import ask_json
    data = await get_futures_by_category(category)

    result = await ask_json(f"""You are an expert commodities/futures analyst.

Analyze these {category} futures:
{data[:8]}

Return JSON:
{{
  "category": "{category}",
  "overall_trend": "bullish/bearish/neutral",
  "key_drivers": [str],
  "top_mover": str,
  "geopolitical_factors": str,
  "supply_demand": str,
  "seasonal_factors": str,
  "opportunities": [
    {{"symbol": str, "label": str, "direction": "long/short", "rationale": str, "target": float, "stop": float}}
  ],
  "risks": [str],
  "outlook_30d": str
}}""")
    return result if isinstance(result, dict) else {"error": "Analysis failed"}
