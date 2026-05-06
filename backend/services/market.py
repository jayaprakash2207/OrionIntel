import httpx
import asyncio
import time
from core.config import settings

_cache = {}


def cached(key: str, ttl: int = 60):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < ttl:
            return data
    return None


def set_cache(key: str, data):
    _cache[key] = (data, time.time())


MOCK_STOCKS = [
    {"symbol": "SPY", "name": "S&P 500", "price": 512.34, "change": 1.23, "change_pct": 0.24},
    {"symbol": "QQQ", "name": "NASDAQ", "price": 438.12, "change": -0.87, "change_pct": -0.20},
    {"symbol": "DIA", "name": "Dow Jones", "price": 389.45, "change": 2.10, "change_pct": 0.54},
]
MOCK_CRYPTO = [
    {"symbol": "BTC", "name": "Bitcoin", "price": 67543.21, "change_24h": 2.34, "market_cap": 1320000000000},
    {"symbol": "ETH", "name": "Ethereum", "price": 3821.45, "change_24h": -1.12, "market_cap": 458000000000},
]


async def get_crypto() -> list:
    cached_data = cached("crypto", 60)
    if cached_data:
        return cached_data
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.coingecko.com/api/v3/coins/markets",
                params={
                    "vs_currency": "usd",
                    "order": "market_cap_desc",
                    "per_page": 10,
                    "sparkline": "false",
                },
            )
            data = r.json()
            result = [
                {
                    "symbol": c["symbol"].upper(),
                    "name": c["name"],
                    "price": c["current_price"],
                    "change_24h": c["price_change_percentage_24h"],
                    "market_cap": c["market_cap"],
                    "volume": c["total_volume"],
                    "image": c["image"],
                }
                for c in data
            ]
            set_cache("crypto", result)
            return result
    except Exception:
        return MOCK_CRYPTO


async def _finnhub_quote(client: httpx.AsyncClient, symbol: str) -> dict:
    """Fetch a single quote from Finnhub."""
    try:
        r = await client.get(
            "https://finnhub.io/api/v1/quote",
            params={"symbol": symbol, "token": settings.FINNHUB_API_KEY},
        )
        return r.json()
    except Exception:
        return {}


async def get_indices() -> list:
    cached_data = cached("indices", 60)
    if cached_data:
        return cached_data
    symbols = {
        "SPY": "S&P 500",
        "QQQ": "NASDAQ 100",
        "DIA": "Dow Jones",
        "EFA": "Intl Developed",
        "FXI": "China Large Cap",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        tasks = [_finnhub_quote(client, s) for s in symbols]
        quotes = await asyncio.gather(*tasks)
    results = []
    for (symbol, name), q in zip(symbols.items(), quotes):
        results.append({
            "symbol": symbol,
            "name": name,
            "price": round(q.get("c", 0), 2),
            "change": round(q.get("d", 0), 2),
            "change_pct": round(q.get("dp", 0), 4),
        })
    if any(r["price"] > 0 for r in results):
        set_cache("indices", results)
        return results
    return MOCK_STOCKS


async def get_commodities() -> list:
    cached_data = cached("commodities", 60)
    if cached_data:
        return cached_data
    symbols = {"GLD": "Gold", "SLV": "Silver", "USO": "Oil (WTI)"}
    async with httpx.AsyncClient(timeout=15) as client:
        tasks = [_finnhub_quote(client, s) for s in symbols]
        quotes = await asyncio.gather(*tasks)
    results = []
    for (symbol, name), q in zip(symbols.items(), quotes):
        results.append({
            "symbol": symbol,
            "name": name,
            "price": round(q.get("c", 0), 2),
            "change_pct": round(q.get("dp", 0), 4),
        })
    if any(r["price"] > 0 for r in results):
        set_cache("commodities", results)
        return results
    return [
        {"symbol": "GLD", "name": "Gold", "price": 2340.50, "change_pct": 0.45},
        {"symbol": "SLV", "name": "Silver", "price": 28.12, "change_pct": -0.23},
        {"symbol": "USO", "name": "Oil (WTI)", "price": 78.34, "change_pct": 1.12},
    ]


async def get_fear_greed() -> dict:
    cached_data = cached("fear_greed", 300)
    if cached_data:
        return cached_data
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get("https://api.alternative.me/fng/?limit=1")
            d = r.json()["data"][0]
            result = {
                "value": int(d["value"]),
                "classification": d["value_classification"],
                "timestamp": d["timestamp"],
            }
            set_cache("fear_greed", result)
            return result
    except Exception:
        return {"value": 50, "classification": "Neutral", "timestamp": ""}


async def get_overview() -> dict:
    indices, crypto, commodities, fear_greed = await asyncio.gather(
        get_indices(), get_crypto(), get_commodities(), get_fear_greed()
    )
    return {"indices": indices, "crypto": crypto, "commodities": commodities, "fear_greed": fear_greed}
