import httpx
import asyncio
import time
from core.config import settings

_cache = {}


async def get_series(series_id: str, limit: int = 50) -> list:
    if not settings.FRED_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.stlouisfed.org/fred/series/observations",
                params={
                    "series_id": series_id,
                    "api_key": settings.FRED_API_KEY,
                    "file_type": "json",
                    "limit": limit,
                    "sort_order": "desc",
                },
            )
            obs = r.json().get("observations", [])
            return [{"date": o["date"], "value": float(o["value"])} for o in obs if o["value"] != "."]
    except Exception:
        return []


async def get_key_indicators() -> dict:
    if "macro" in _cache:
        data, ts = _cache["macro"]
        if time.time() - ts < 3600:
            return data
    series = {
        "gdp": "GDP",
        "inflation": "CPIAUCSL",
        "unemployment": "UNRATE",
        "fed_rate": "FEDFUNDS",
        "treasury_10yr": "DGS10",
        "m2": "M2SL",
    }
    results = await asyncio.gather(*[get_series(sid, 24) for sid in series.values()])
    data = dict(zip(series.keys(), results))
    _cache["macro"] = (data, time.time())
    return data
