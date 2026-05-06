"""
Geopolitical Risk Scorer
Live tension index per country pair, risk scoring 0-100
"""
import time
from core.gemini import ask, ask_json

_cache: dict = {}

RISK_CATEGORIES = ["military_conflict", "sanctions_risk", "election_instability", "economic_crisis", "supply_chain_disruption", "currency_crisis"]


async def score_country_risk(country: str) -> dict:
    result = await ask_json(f"""Assess geopolitical and economic risk for: {country}
Score each risk category 0-100 (0=no risk, 100=extreme risk).
Return JSON:
{{
  "country": str,
  "overall_risk_score": 0-100,
  "risk_level": "low/medium/high/critical",
  "categories": {{
    "military_conflict": int,
    "sanctions_risk": int,
    "election_instability": int,
    "economic_crisis": int,
    "supply_chain": int,
    "currency_crisis": int
  }},
  "key_risks": [str],
  "market_impact": {{
    "local_stocks": str,
    "currency": str,
    "commodities": str
  }},
  "trend": "improving/stable/worsening",
  "hotspots": [str]
}}""")
    return result


async def get_global_risk_map() -> dict:
    """Risk scores for major regions/countries (cached 1hr)"""
    cached = _cache.get("global_risk_map")
    if cached and time.time() - cached[1] < 3600:
        return cached[0]
    countries = ["United States", "China", "Russia", "European Union", "Middle East", "India", "Japan", "Brazil", "UK", "South Korea"]
    result = await ask_json(f"""Score geopolitical risk for these countries/regions: {countries}
Return JSON: {{
  "scores": [
    {{
      "country": str,
      "risk_score": 0-100,
      "risk_level": "low/medium/high/critical",
      "primary_concern": str,
      "market_watch": str
    }}
  ],
  "global_risk_level": str,
  "most_at_risk": str,
  "safest": str,
  "key_flashpoint": str
}}""")
    _cache["global_risk_map"] = (result, time.time())
    return result


async def compare_country_pair(country1: str, country2: str) -> dict:
    """Risk assessment for two specific countries in relation to each other"""
    result = await ask_json(f"""Analyze the relationship and risk between: {country1} and {country2}
Return JSON:
{{
  "relationship_status": str,
  "tension_score": 0-100,
  "risk_factors": [str],
  "economic_interdependence": str,
  "trade_volume": str,
  "conflict_probability_12m": int,
  "sanctions_probability": int,
  "market_implications": [str],
  "historical_context": str
}}""")
    return result
