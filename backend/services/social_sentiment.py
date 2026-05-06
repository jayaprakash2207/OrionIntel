"""
Social Sentiment Service
Reddit (when keys added), free alternatives for now
"""
import httpx
from core.gemini import ask_json


async def get_reddit_sentiment(subreddit: str = "wallstreetbets", keyword: str = "") -> dict:
    # Reddit API — keys will be added later
    # For now use pushshift.io (free, no auth)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            url = f"https://api.pushshift.io/reddit/search/submission/?subreddit={subreddit}&q={keyword}&size=25&sort=score"
            r = await client.get(url)
            posts = r.json().get("data", [])
            
            if not posts:
                return await _mock_sentiment(keyword)
            
            titles = [p.get("title", "") for p in posts[:15]]
            scores = [p.get("score", 0) for p in posts[:15]]
            
            analysis = await ask_json(f"""Reddit posts about {keyword} from r/{subreddit}:
{chr(10).join(titles[:10])}
Upvote scores: {scores[:10]}

Analyze sentiment. Return JSON:
{{
  "sentiment": "very_bearish/bearish/neutral/bullish/very_bullish",
  "sentiment_score": -100 to 100,
  "buzz_level": "low/medium/high/extreme",
  "dominant_narrative": str,
  "key_themes": [str],
  "retail_confidence": str
}}""", fast=True)
            
            return {
                "source": f"r/{subreddit}",
                "keyword": keyword,
                "posts_analyzed": len(titles),
                "analysis": analysis,
                "note": "Reddit API keys not yet added — using public data"
            }
    except Exception:
        return await _mock_sentiment(keyword)


async def _mock_sentiment(keyword: str) -> dict:
    result = await ask_json(f"""Simulate what Reddit and social media sentiment would look like for: {keyword}
Based on current market conditions. Return JSON:
{{
  "sentiment": str,
  "sentiment_score": int,
  "buzz_level": str,
  "dominant_narrative": str,
  "key_themes": [str],
  "retail_confidence": str
}}""", fast=True)
    return {"source": "AI-estimated", "keyword": keyword, "analysis": result, "note": "Add REDDIT_CLIENT_ID to .env for live data"}


async def get_multi_platform_sentiment(asset: str) -> dict:
    """Aggregate sentiment from multiple sources"""
    reddit = await get_reddit_sentiment("investing", asset)
    wsb = await get_reddit_sentiment("wallstreetbets", asset)
    
    combined = await ask_json(f"""Combine these sentiment signals for {asset}:
Reddit/Investing: {reddit.get('analysis', {})}
Reddit/WSB: {wsb.get('analysis', {})}

Return combined analysis as JSON:
{{
  "asset": str,
  "combined_sentiment": str,
  "combined_score": int,
  "platform_breakdown": {{
    "reddit_general": str,
    "wsb": str
  }},
  "divergence": bool,
  "smart_money_vs_retail": str,
  "actionable_signal": str
}}""", fast=True)
    return combined
