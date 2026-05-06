"""
Cultural Calendar AI
Tracks how religious/cultural events affect markets
"""
import time
from core.gemini import ask, ask_json
import datetime

_cache: dict = {}


async def get_current_cultural_events() -> dict:
    month = datetime.datetime.now().strftime("%B %Y")
    cache_key = f"cultural_{month}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 21600:
        return cached[0]

    result = await ask_json(f"""Current month: {month}

What cultural, religious, or seasonal events this month typically affect financial markets?
Consider: Ramadan, Diwali, Chinese New Year, harvest seasons, fiscal year ends, religious holidays.

Return JSON:
{{
  "month": str,
  "active_events": [
    {{
      "event": str,
      "region": str,
      "dates": str,
      "market_effects": [
        {{"asset": str, "typical_move": str, "direction": str, "reason": str}}
      ],
      "historical_data": str,
      "trading_tip": str
    }}
  ],
  "upcoming_this_quarter": [str],
  "seasonal_patterns": [str]
}}""")
    _cache[cache_key] = (result, time.time())
    return result


async def analyze_cultural_impact(event: str, region: str) -> dict:
    result = await ask_json(f"""Cultural/Religious event: {event}
Region/Country: {region}

Analyze historical market impact. Return JSON:
{{
  "event_overview": str,
  "duration": str,
  "affected_assets": [
    {{"asset": str, "typical_direction": str, "magnitude": str, "confidence": int}}
  ],
  "affected_industries": [str],
  "historical_pattern": str,
  "this_year_outlook": str,
  "trading_strategy": str
}}""")
    return result
