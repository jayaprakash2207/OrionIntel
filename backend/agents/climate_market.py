"""
Climate-to-Market AI
Traces climate events through their full market impact chain
"""
import time
from core.gemini import ask, ask_json

_cache: dict = {}


async def analyze_climate_event(event: str, location: str, severity: str = "moderate") -> dict:
    result = await ask_json(f"""Climate event: {event}
Location: {location}
Severity: {severity}

Trace the full market impact chain. Return JSON:
{{
  "event_summary": str,
  "immediate_impacts": [
    {{"commodity": str, "direction": str, "estimated_pct": str, "timeframe": str}}
  ],
  "supply_chain_breaks": [
    {{"product": str, "affected_companies": [str], "impact": str}}
  ],
  "inflation_effects": str,
  "agricultural_impact": [
    {{"crop": str, "producing_region": str, "impact_pct": str}}
  ],
  "energy_impact": str,
  "insurance_impact": str,
  "investment_opportunities": [str],
  "assets_to_avoid": [str],
  "timeline": [
    {{"period": str, "key_development": str, "market_move": str}}
  ]
}}""")
    return result


async def get_climate_watchlist() -> dict:
    """Current climate events and risks worth monitoring (cached 1hr)"""
    cached = _cache.get("climate_watchlist")
    if cached and time.time() - cached[1] < 3600:
        return cached[0]
    result = await ask_json("""List current and upcoming climate risks that could impact financial markets.
Return JSON:
{
  "active_risks": [
    {
      "event_type": str,
      "location": str,
      "severity": str,
      "affected_markets": [str],
      "urgency": "low/medium/high/critical"
    }
  ],
  "seasonal_risks": [str],
  "long_term_trends": [str],
  "most_impactful_now": str
}""")
    _cache["climate_watchlist"] = (result, time.time())
    return result
