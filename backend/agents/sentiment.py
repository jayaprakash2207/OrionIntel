"""
Emotion + Sentiment AI Agent
Tracks fear index, social sentiment, retail vs institutional divergence
"""
import time
from core.gemini import ask, ask_json
import httpx, asyncio

_cache: dict = {}


async def get_fear_greed_extended() -> dict:
    """Extended fear and greed with components (cached 5min)"""
    cached = _cache.get("fear_greed")
    if cached and time.time() - cached[1] < 300:
        return cached[0]
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get("https://api.alternative.me/fng/?limit=30")
            data = r.json()["data"]
            current = data[0]
            history = [{"date": d["timestamp"], "value": int(d["value"]), "classification": d["value_classification"]} for d in data[:30]]
            
            # AI interpretation
            interpretation = await ask_json(f"""Current Fear & Greed Index: {current['value']} ({current['value_classification']})
30-day history shows: {[d['value'] for d in history[:10]]}

Analyze this and return JSON:
{{
  "current_sentiment": str,
  "trend": "improving/worsening/stable",
  "interpretation": str,
  "market_signal": "buy/sell/hold/wait",
  "historical_context": str,
  "contrarian_view": str
}}""", fast=True)
            
            result = {
                "current": {"value": int(current["value"]), "classification": current["value_classification"]},
                "history": history,
                "ai_analysis": interpretation
            }
            _cache["fear_greed"] = (result, time.time())
            return result
        except Exception:
            return {"current": {"value": 50, "classification": "Neutral"}, "history": [], "ai_analysis": {}}


a_sync_lock = asyncio.Lock()


async def analyze_sentiment(asset: str, news_headlines: list = []) -> dict:
    """Analyze sentiment for a specific asset"""
    headlines_text = "\n".join(news_headlines[:10]) if news_headlines else "No headlines provided"
    
    # Gemini prefers shorter bursts; ensure only one concurrent call for sentiment
    async with a_sync_lock:
        result = await ask_json(f"""Asset: {asset}
Recent news headlines:
{headlines_text}

Analyze market sentiment. Return JSON:
{{
  "overall_sentiment": "very_bearish/bearish/neutral/bullish/very_bullish",
  "sentiment_score": -100 to 100,
  "retail_sentiment": str,
  "institutional_sentiment": str,
  "divergence": bool,
  "divergence_meaning": str,
  "social_buzz": "low/medium/high/extreme",
  "key_narrative": str,
  "contrarian_signal": str
}}""")
    return result


async def get_market_emotions() -> dict:
    """Overall market emotional state across all assets (cached 5min)"""
    cached = _cache.get("market_emotions")
    if cached and time.time() - cached[1] < 300:
        return cached[0]
    result = await ask_json("""Based on your current knowledge of global markets, assess the emotional state.
Return JSON:
{
  "global_risk_appetite": "risk-off/neutral/risk-on",
  "dominant_emotion": "panic/fear/anxiety/neutral/optimism/greed/euphoria",
  "emotion_score": 0-100,
  "hot_sectors": [str],
  "cold_sectors": [str],
  "retail_vs_institutional": str,
  "vix_environment": str,
  "key_driver": str
}""")
    _cache["market_emotions"] = (result, time.time())
    return result
