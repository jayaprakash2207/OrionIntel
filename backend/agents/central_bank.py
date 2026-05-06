"""
Central Bank Language AI
Reads Fed/ECB/BOJ statements, detects hawkish/dovish tone shifts
"""
import time
from core.gemini import ask, ask_json

_cache: dict = {}
import httpx

CENTRAL_BANKS = {
    "fed": {"name": "US Federal Reserve", "rss": "https://www.federalreserve.gov/feeds/press_all.xml"},
    "ecb": {"name": "European Central Bank", "rss": "https://www.ecb.europa.eu/rss/fns.html"},
    "boj": {"name": "Bank of Japan", "url": "https://www.boj.or.jp/en/"},
    "boe": {"name": "Bank of England", "url": "https://www.bankofengland.co.uk/"},
}

HAWKISH_WORDS = ["inflation", "tighten", "raise rates", "restrictive", "overheating", "above target", "vigilant"]
DOVISH_WORDS = ["support", "accommodative", "lower rates", "stimulus", "below target", "growth concerns", "ease"]


async def analyze_statement(statement_text: str, bank: str = "fed") -> dict:
    bank_info = CENTRAL_BANKS.get(bank, {"name": "Central Bank"})
    
    # Keyword scoring
    text_lower = statement_text.lower()
    hawkish_count = sum(1 for w in HAWKISH_WORDS if w in text_lower)
    dovish_count = sum(1 for w in DOVISH_WORDS if w in text_lower)
    
    # AI deep analysis
    result = await ask_json(f"""{bank_info['name']} statement:
"{statement_text[:3000]}"

Hawkish keywords found: {hawkish_count}
Dovish keywords found: {dovish_count}

Analyze tone and market implications. Return JSON:
{{
  "tone": "very_hawkish/hawkish/neutral/dovish/very_dovish",
  "tone_score": -100 to 100 (negative=dovish, positive=hawkish),
  "key_phrases": [str],
  "rate_signal": "hike/hold/cut/unclear",
  "next_meeting_expectation": str,
  "market_implications": {{
    "bonds": str,
    "stocks": str,
    "gold": str,
    "usd": str,
    "crypto": str
  }},
  "change_from_previous": str,
  "surprise_factor": 1-10,
  "summary": str
}}""")
    
    return {
        "bank": bank_info["name"],
        "analysis": result,
        "keyword_scores": {"hawkish": hawkish_count, "dovish": dovish_count}
    }


async def get_rate_outlook() -> dict:
    """Current rate outlook for major central banks (cached 1hr)"""
    cached = _cache.get("rate_outlook")
    if cached and time.time() - cached[1] < 3600:
        return cached[0]
    result = await ask_json("""Based on your knowledge of current global monetary policy:
Return the rate outlook for major central banks as JSON:
{
  "central_banks": [
    {
      "name": str,
      "country": str,
      "current_rate": float,
      "next_meeting": str,
      "expected_action": "hike/hold/cut",
      "probability_cut": int,
      "probability_hold": int,
      "probability_hike": int,
      "stance": "hawkish/neutral/dovish",
      "key_concern": str
    }
  ],
  "global_trend": str,
  "market_impact": str
}""")
    _cache["rate_outlook"] = (result, time.time())
    return result
