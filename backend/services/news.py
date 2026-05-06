import httpx
import time
from core.config import settings

_cache = {}

MOCK_NEWS = [
    {"id": "1", "title": "Global markets steady as investors await Fed decision", "description": "Equity markets held firm across Asia and Europe.", "url": "#", "source": "MarketWatch", "published_at": "", "image": None},
    {"id": "2", "title": "Gold prices rise amid geopolitical uncertainty", "description": "Precious metals gained as safe-haven demand increased.", "url": "#", "source": "Reuters", "published_at": "", "image": None},
    {"id": "3", "title": "Bitcoin holds key support level after volatile week", "description": "Crypto markets showed resilience at key technical levels.", "url": "#", "source": "CoinDesk", "published_at": "", "image": None},
]


async def fetch_news(limit: int = 30) -> list:
    if "news" in _cache:
        data, ts = _cache["news"]
        if time.time() - ts < 300:
            return data[:limit]

    articles = []
    async with httpx.AsyncClient(timeout=15) as client:
        # Source 1: NewsAPI
        if settings.NEWS_API_KEY:
            try:
                r = await client.get(
                    "https://newsapi.org/v2/top-headlines",
                    params={
                        "category": "business",
                        "language": "en",
                        "pageSize": 20,
                        "apiKey": settings.NEWS_API_KEY,
                    },
                )
                for a in r.json().get("articles", []):
                    if a.get("title") and a["title"] != "[Removed]":
                        articles.append({
                            "id": a["url"],
                            "title": a["title"],
                            "description": a.get("description", ""),
                            "url": a["url"],
                            "source": a.get("source", {}).get("name", "NewsAPI"),
                            "published_at": a.get("publishedAt", ""),
                            "image": a.get("urlToImage"),
                        })
            except Exception:
                pass

        # Source 2: GDELT (no key needed)
        try:
            r = await client.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query": "finance economy markets gold oil",
                    "mode": "artlist",
                    "maxrecords": "15",
                    "format": "json",
                    "timespan": "24h",
                },
            )
            for a in r.json().get("articles", []):
                articles.append({
                    "id": a.get("url", ""),
                    "title": a.get("title", ""),
                    "description": "",
                    "url": a.get("url", "#"),
                    "source": a.get("domain", "Global News"),
                    "published_at": a.get("seendate", ""),
                    "image": None,
                })
        except Exception:
            pass

    # Deduplicate by first 50 chars of title
    seen: set = set()
    unique = []
    for a in articles:
        key = a["title"][:50].lower()
        if key not in seen and a["title"]:
            seen.add(key)
            unique.append(a)

    result = unique[:limit] if unique else MOCK_NEWS
    _cache["news"] = (result, time.time())
    return result


async def search_news(keyword: str, limit: int = 10) -> list:
    if not settings.NEWS_API_KEY:
        return MOCK_NEWS[:limit]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": keyword,
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": limit,
                    "apiKey": settings.NEWS_API_KEY,
                },
            )
            articles = r.json().get("articles", [])
            return [
                {
                    "id": a["url"],
                    "title": a["title"],
                    "description": a.get("description", ""),
                    "url": a["url"],
                    "source": a.get("source", {}).get("name", ""),
                    "published_at": a.get("publishedAt", ""),
                    "image": a.get("urlToImage"),
                }
                for a in articles
                if a.get("title")
            ]
    except Exception:
        return MOCK_NEWS[:limit]
