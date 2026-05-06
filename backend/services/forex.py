"""
Forex Service — Major currency pairs, exchange rates, historical data
Uses Finnhub for live rates + Yahoo Finance (yfinance) for history
"""
import time
import httpx
import asyncio
from core.config import settings

_cache: dict = {}

# Major currency pairs (symbol, label, base, quote)
MAJOR_PAIRS = [
    ("OANDA:EUR_USD", "EUR/USD", "EUR", "USD"),
    ("OANDA:GBP_USD", "GBP/USD", "GBP", "USD"),
    ("OANDA:USD_JPY", "USD/JPY", "USD", "JPY"),
    ("OANDA:USD_CHF", "USD/CHF", "USD", "CHF"),
    ("OANDA:AUD_USD", "AUD/USD", "AUD", "USD"),
    ("OANDA:USD_CAD", "USD/CAD", "USD", "CAD"),
    ("OANDA:NZD_USD", "NZD/USD", "NZD", "USD"),
    ("OANDA:EUR_GBP", "EUR/GBP", "EUR", "GBP"),
    ("OANDA:EUR_JPY", "EUR/JPY", "EUR", "JPY"),
    ("OANDA:GBP_JPY", "GBP/JPY", "GBP", "JPY"),
    ("OANDA:USD_CNH", "USD/CNH", "USD", "CNH"),
    ("OANDA:USD_INR", "USD/INR", "USD", "INR"),
    ("OANDA:USD_SGD", "USD/SGD", "USD", "SGD"),
    ("OANDA:USD_HKD", "USD/HKD", "USD", "HKD"),
    ("OANDA:USD_KRW", "USD/KRW", "USD", "KRW"),
    ("OANDA:USD_MXN", "USD/MXN", "USD", "MXN"),
    ("OANDA:USD_BRL", "USD/BRL", "USD", "BRL"),
    ("OANDA:USD_RUB", "USD/RUB", "USD", "RUB"),
    ("OANDA:USD_TRY", "USD/TRY", "USD", "TRY"),
    ("OANDA:USD_ZAR", "USD/ZAR", "USD", "ZAR"),
]

# Yahoo Finance FX symbols
YF_FX_MAP = {
    "EUR/USD": "EURUSD=X", "GBP/USD": "GBPUSD=X", "USD/JPY": "JPY=X",
    "USD/CHF": "CHF=X", "AUD/USD": "AUDUSD=X", "USD/CAD": "CAD=X",
    "NZD/USD": "NZDUSD=X", "EUR/GBP": "EURGBP=X", "EUR/JPY": "EURJPY=X",
    "GBP/JPY": "GBPJPY=X", "USD/CNH": "CNH=X", "USD/INR": "INR=X",
    "USD/SGD": "SGD=X", "USD/HKD": "HKD=X", "USD/KRW": "KRW=X",
    "USD/MXN": "MXN=X", "USD/BRL": "BRL=X", "USD/TRY": "TRY=X",
    "USD/ZAR": "ZAR=X",
}


async def _finnhub_forex_quote(client: httpx.AsyncClient, symbol: str) -> dict:
    try:
        r = await client.get(
            "https://finnhub.io/api/v1/quote",
            params={"symbol": symbol, "token": settings.FINNHUB_API_KEY},
            timeout=8,
        )
        return r.json()
    except Exception:
        return {}


async def get_forex_rates() -> list:
    """Get all major forex pairs with live rates."""
    cache_key = "forex_all"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 30:
        return cached[0]

    try:
        async with httpx.AsyncClient() as client:
            tasks = [_finnhub_forex_quote(client, sym) for sym, *_ in MAJOR_PAIRS]
            quotes = await asyncio.gather(*tasks)

        result = []
        for i, (sym, label, base, quote_ccy) in enumerate(MAJOR_PAIRS):
            q = quotes[i]
            price = q.get("c", 0)
            prev_close = q.get("pc", 0)
            change = price - prev_close if price and prev_close else 0
            change_pct = (change / prev_close * 100) if prev_close else 0
            result.append({
                "pair": label,
                "symbol": sym,
                "base": base,
                "quote": quote_ccy,
                "price": round(price, 5),
                "change": round(change, 5),
                "change_pct": round(change_pct, 4),
                "high": q.get("h", 0),
                "low": q.get("l", 0),
                "open": q.get("o", 0),
            })

        _cache[cache_key] = (result, time.time())
        return result
    except Exception as e:
        return [{"error": str(e)}]


async def get_forex_pair(pair: str) -> dict:
    """Get a specific forex pair quote. pair = 'EUR/USD'"""
    rates = await get_forex_rates()
    for r in rates:
        if r.get("pair") == pair.upper():
            return r
    return {"error": f"Pair {pair} not found"}


async def get_forex_history(pair: str, period: str = "1mo") -> list:
    """Get historical OHLCV for a forex pair using yfinance."""
    try:
        import yfinance as yf
        yf_sym = YF_FX_MAP.get(pair.upper(), pair.replace("/", "") + "=X")
        ticker = yf.Ticker(yf_sym)
        hist = ticker.history(period=period)
        result = []
        for ts, row in hist.iterrows():
            result.append({
                "time": ts.strftime("%Y-%m-%d"),
                "open": round(row["Open"], 5),
                "high": round(row["High"], 5),
                "low": round(row["Low"], 5),
                "close": round(row["Close"], 5),
                "volume": int(row["Volume"]) if row["Volume"] else 0,
            })
        return result
    except Exception as e:
        return [{"error": str(e)}]


async def get_forex_analysis(pair: str) -> dict:
    """AI analysis of a forex pair."""
    from core.gemini import ask_json
    rates = await get_forex_rates()
    pair_data = next((r for r in rates if r.get("pair") == pair.upper()), {})

    result = await ask_json(f"""You are an expert forex analyst. Analyze the {pair} currency pair.

Current data:
{pair_data}

Return JSON:
{{
  "pair": "{pair}",
  "outlook": "bullish/bearish/neutral",
  "strength": "strong/moderate/weak",
  "key_drivers": [str],
  "support_levels": [float],
  "resistance_levels": [float],
  "central_bank_impact": str,
  "geopolitical_factors": str,
  "recommendation": "buy/sell/hold",
  "target": float,
  "stop_loss": float,
  "reasoning": str
}}""")
    return result if isinstance(result, dict) else {"error": "Analysis failed"}
