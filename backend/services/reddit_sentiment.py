"""
Reddit Social Sentiment Service
Scrapes r/wallstreetbets, r/investing, r/CryptoCurrency for market sentiment.
Falls back to StockTwits if Reddit keys not configured.
"""
import time
import httpx
from core.config import settings
from core.gemini import ask_json

_cache: dict = {}

SUBREDDITS = {
    "stocks": ["wallstreetbets", "investing", "stocks", "StockMarket"],
    "crypto": ["CryptoCurrency", "Bitcoin", "ethereum", "CryptoMarkets"],
    "general": ["finance", "economics", "worldnews"],
}


async def _fetch_stocktwits(symbol: str) -> list:
    """Fetch StockTwits messages for a symbol (no key needed)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://api.stocktwits.com/api/2/streams/symbol/{symbol}.json",
                headers={"User-Agent": "OrionIntel/1.0"},
            )
            messages = r.json().get("messages", [])
            return [
                {
                    "text": m.get("body", ""),
                    "sentiment": m.get("entities", {}).get("sentiment", {}).get("basic", "neutral"),
                    "created_at": m.get("created_at", ""),
                    "source": "stocktwits",
                }
                for m in messages[:30]
            ]
    except Exception:
        return []


async def _fetch_reddit_posts(subreddit: str, query: str, limit: int = 10) -> list:
    """Fetch Reddit posts via JSON API (no auth needed for public posts)."""
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "OrionIntel:v1.0"}) as client:
            r = await client.get(
                f"https://www.reddit.com/r/{subreddit}/search.json",
                params={"q": query, "sort": "new", "limit": limit, "t": "day"},
            )
            posts = r.json().get("data", {}).get("children", [])
            return [
                {
                    "title": p["data"].get("title", ""),
                    "score": p["data"].get("score", 0),
                    "comments": p["data"].get("num_comments", 0),
                    "text": p["data"].get("selftext", "")[:300],
                    "source": f"reddit/r/{subreddit}",
                }
                for p in posts
            ]
    except Exception:
        return []


async def get_social_sentiment(asset: str) -> dict:
    """Get combined Reddit + StockTwits sentiment for an asset."""
    cache_key = f"social_{asset.lower()}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 300:
        return cached[0]

    # Fetch from multiple sources concurrently
    import asyncio

    symbol = asset.upper().replace(" ", "")
    is_crypto = asset.lower() in ["bitcoin", "btc", "ethereum", "eth", "crypto"]
    subs = SUBREDDITS["crypto"] if is_crypto else SUBREDDITS["stocks"]

    tasks = [_fetch_stocktwits(symbol)]
    for sub in subs[:2]:
        tasks.append(_fetch_reddit_posts(sub, asset, 8))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    stocktwits_posts = results[0] if not isinstance(results[0], Exception) else []
    reddit_posts = []
    for r in results[1:]:
        if not isinstance(r, Exception):
            reddit_posts.extend(r)

    all_text = stocktwits_posts[:15] + reddit_posts[:15]

    if not all_text:
        return {"asset": asset, "error": "No social data available", "posts": []}

    # AI sentiment analysis
    posts_summary = "\n".join([
        f"- [{p.get('source', '')}] {p.get('title', p.get('text', ''))[:150]}"
        for p in all_text[:20]
    ])

    analysis = await ask_json(f"""Analyze social media sentiment for {asset} from these recent posts:

{posts_summary}

Return JSON:
{{
  "overall_sentiment": "very_bearish/bearish/neutral/bullish/very_bullish",
  "sentiment_score": -100 to 100,
  "retail_mood": str,
  "dominant_narrative": str,
  "bull_arguments": [str],
  "bear_arguments": [str],
  "divergence_signal": str,
  "meme_factor": int (0-10, how much hype/meme energy),
  "smart_money_vs_retail": str,
  "actionable_insight": str
}}""", fast=True)

    # Count StockTwits bullish/bearish
    bull_count = sum(1 for p in stocktwits_posts if p.get("sentiment") == "Bullish")
    bear_count = sum(1 for p in stocktwits_posts if p.get("sentiment") == "Bearish")

    result = {
        "asset": asset,
        "sources": {
            "stocktwits_posts": len(stocktwits_posts),
            "reddit_posts": len(reddit_posts),
            "stocktwits_bull": bull_count,
            "stocktwits_bear": bear_count,
        },
        "ai_analysis": analysis,
        "top_posts": all_text[:10],
        "cached_at": int(time.time()),
    }
    _cache[cache_key] = (result, time.time())
    return result


async def get_trending_tickers() -> dict:
    """Get trending tickers from StockTwits (no key needed)."""
    cache_key = "trending_tickers"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 300:
        return cached[0]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.stocktwits.com/api/2/trending/symbols.json",
                headers={"User-Agent": "OrionIntel/1.0"},
            )
            symbols = r.json().get("symbols", [])
            result = {
                "trending": [
                    {
                        "symbol": s.get("symbol"),
                        "title": s.get("title"),
                        "watchlist_count": s.get("watchlist_count", 0),
                    }
                    for s in symbols[:20]
                ],
                "source": "stocktwits",
            }
            _cache[cache_key] = (result, time.time())
            return result
    except Exception:
        return {"trending": [], "error": "StockTwits unavailable"}


async def get_wsb_sentiment() -> dict:
    """Get WallStreetBets daily mood — most discussed tickers."""
    cache_key = "wsb_mood"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 600:
        return cached[0]

    posts = await _fetch_reddit_posts("wallstreetbets", "stock market", 25)
    if not posts:
        return {"error": "WSB unavailable", "posts": []}

    posts_text = "\n".join([f"- {p['title']}" for p in posts[:20]])
    analysis = await ask_json(f"""Analyze these WallStreetBets posts from today:

{posts_text}

Return JSON:
{{
  "overall_mood": "panic/bearish/neutral/bullish/euphoric",
  "most_discussed_tickers": [str],
  "dominant_theme": str,
  "yolo_risk_level": int (0-10),
  "contrarian_signal": str,
  "top_plays_mentioned": [str]
}}""", fast=True)

    result = {"posts_analyzed": len(posts), "analysis": analysis, "sample_posts": posts[:5]}
    _cache[cache_key] = (result, time.time())
    return result
