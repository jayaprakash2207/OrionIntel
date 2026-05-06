"""
Election Outcome Simulator
190+ countries, candidate policies mapped to asset impacts
"""
import time
from core.gemini import ask, ask_json

_cache: dict = {}


async def simulate_election(country: str, candidates: list = [], election_date: str = "") -> dict:
    candidates_text = ", ".join(candidates) if candidates else "major candidates"
    
    result = await ask_json(f"""Election simulation:
Country: {country}
Candidates/Parties: {candidates_text}
Election date: {election_date if election_date else "upcoming"}

Simulate market impact for each possible outcome. Return JSON:
{{
  "country": str,
  "election_overview": str,
  "scenarios": [
    {{
      "candidate_or_party": str,
      "win_probability": int,
      "economic_policy": str,
      "market_impact": {{
        "local_stocks": str,
        "currency": str,
        "bonds": str,
        "foreign_investment": str,
        "key_sectors": [str]
      }},
      "global_impact": str,
      "investor_sentiment": str
    }}
  ],
  "base_case": str,
  "biggest_risk_scenario": str,
  "trading_strategies": [str],
  "key_date_to_watch": str
}}""")
    return result


async def get_upcoming_elections() -> dict:
    """List upcoming elections and their market significance (cached 6hr)"""
    cached = _cache.get("upcoming_elections")
    if cached and time.time() - cached[1] < 21600:
        return cached[0]
    result = await ask_json("""List the most market-significant upcoming elections globally in the next 12 months.
Return JSON:
{
  "elections": [
    {
      "country": str,
      "election_type": str,
      "expected_date": str,
      "market_significance": 1-10,
      "key_issue": str,
      "affected_assets": [str],
      "current_frontrunner": str
    }
  ],
  "most_impactful": str
}""")
    _cache["upcoming_elections"] = (result, time.time())
    return result
