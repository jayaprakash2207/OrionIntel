"""
Portfolio Exposure & Risk Analysis AI
Maps geographic, sector, currency, and factor exposures with stress-testing capabilities
"""
from core.gemini import ask, ask_json


async def analyze_exposure(positions: list, total_capital: float = 100000) -> dict:
    positions_text = "\n".join([
        f"- {p.get('asset', 'Unknown')}: ${p.get('value', 0):,.0f} ({p.get('type', 'unknown')})"
        for p in positions
    ])
    total_analyzed = sum(p.get('value', 0) for p in positions)

    result = await ask_json(f"""You are a senior portfolio risk manager with expertise in multi-asset exposure analysis.

Total capital: ${total_capital:,.0f}
Total analyzed: ${total_analyzed:,.0f}
Positions:
{positions_text}

Perform comprehensive exposure analysis:
- Map each position to geographic regions (North America, Europe, Asia-Pacific, EM, etc.)
- Identify sector concentrations (Technology, Financials, Energy, Healthcare, etc.)
- Assess currency exposures (USD, EUR, JPY, CNY, GBP, EM currencies)
- Detect hidden correlations and factor crowding (growth/value, momentum, quality)
- Flag concentration risks (single position > 10%, single sector > 30%, etc.)
- Score diversification quality (not just count, but true decorrelation)
- Identify tail risk positions (high beta, illiquid, leveraged)

Return JSON:
{{
  "total_analyzed": {total_analyzed},
  "geographic_exposure": [
    {{
      "region": str,
      "percentage": float,
      "risk_score": int (0-100),
      "key_risks": [str]
    }}
  ],
  "sector_exposure": [
    {{
      "sector": str,
      "percentage": float,
      "top_holdings": [str],
      "outlook": str
    }}
  ],
  "currency_exposure": [
    {{
      "currency": str,
      "percentage": float,
      "fx_risk": str
    }}
  ],
  "concentration_risks": [str],
  "diversification_score": int (0-100),
  "top_risks": [str],
  "recommended_hedges": [str],
  "rebalancing_suggestions": [str]
}}""")
    return result


async def stress_test_portfolio(positions: list, scenario: str) -> dict:
    positions_text = "\n".join([
        f"- {p.get('asset', 'Unknown')}: ${p.get('value', 0):,.0f} ({p.get('type', 'unknown')})"
        for p in positions
    ])

    result = await ask_json(f"""You are a quantitative risk analyst performing portfolio stress testing.

Scenario: {scenario}

Portfolio positions:
{positions_text}

Analyze this portfolio against the stress scenario using historical analogues and factor sensitivities. Consider:
- Direct exposure to the scenario (sector, geography, asset class)
- Second-order effects (supply chain, correlation spikes, liquidity)
- Safe haven positioning that would benefit
- Which positions have natural hedging properties in this scenario
- Historical precedents for similar scenarios
- Realistic drawdown estimates per position

Return JSON:
{{
  "scenario": "{scenario}",
  "estimated_portfolio_impact": str,
  "percentage_change": float (negative = loss),
  "most_affected_positions": [
    {{
      "asset": str,
      "estimated_change": str,
      "reason": str
    }}
  ],
  "safe_positions": [
    {{
      "asset": str,
      "expected_behavior": str
    }}
  ],
  "suggested_adjustments": [str],
  "historical_analogue": str
}}""")
    return result


async def get_exposure_summary(positions: list) -> dict:
    positions_text = "\n".join([
        f"- {p.get('asset', 'Unknown')}: ${p.get('value', 0):,.0f} ({p.get('type', 'unknown')})"
        for p in positions
    ])

    result = await ask_json(f"""Quick portfolio exposure triage. Analyze:

{positions_text}

Return JSON:
{{
  "risk_level": "low|moderate|elevated|high",
  "top_3_risks": [str],
  "diversification": "poor|fair|good|excellent",
  "one_line_verdict": str
}}""", fast=True)
    return result
