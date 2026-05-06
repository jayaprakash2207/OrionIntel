"""
Regulatory Time Machine Agent
Simulates how a company/asset would have performed if a specific law/regulation
had existed at a point in the past. Provides "future resilience" prediction.
"""
import time
from core.gemini import ask, ask_json

_cache: dict = {}

# ── Preset regulation library ──────────────────────────────────────────────
REGULATION_PRESETS = [
    {"id": "gdpr_2018", "name": "GDPR (EU Data Privacy)", "year": 2018, "region": "EU", "sector": "Tech/Data", "summary": "Strict data privacy rules, heavy fines for breaches"},
    {"id": "dodd_frank_2010", "name": "Dodd-Frank Act", "year": 2010, "region": "USA", "sector": "Finance/Banking", "summary": "Post-GFC banking reform, derivative restrictions, Volcker Rule"},
    {"id": "basel_iii_2010", "name": "Basel III", "year": 2010, "region": "Global", "sector": "Banking", "summary": "Higher capital requirements, liquidity ratios for banks"},
    {"id": "eu_dma_2022", "name": "EU Digital Markets Act", "year": 2022, "region": "EU", "sector": "Big Tech", "summary": "Anti-monopoly rules for digital gatekeepers (Apple, Google, Meta)"},
    {"id": "mifid_ii_2018", "name": "MiFID II", "year": 2018, "region": "EU", "sector": "Finance", "summary": "Investment firm transparency, algo trading rules"},
    {"id": "sec_crypto_2023", "name": "SEC Crypto Crackdown", "year": 2023, "region": "USA", "sector": "Crypto", "summary": "Classifying tokens as securities, exchange registration requirements"},
    {"id": "carbon_tax_eu_2021", "name": "EU Carbon Border Tax (CBAM)", "year": 2021, "region": "EU", "sector": "Energy/Industry", "summary": "Carbon tariff on imports, incentivizes green transition"},
    {"id": "china_tech_crackdown_2021", "name": "China Tech Crackdown", "year": 2021, "region": "China", "sector": "Tech", "summary": "Antitrust, data security, education reforms targeting Alibaba, Tencent, Didi"},
    {"id": "us_chips_act_2022", "name": "US CHIPS Act", "year": 2022, "region": "USA", "sector": "Semiconductors", "summary": "Subsidies for domestic chip manufacturing, export controls on China"},
    {"id": "ira_2022", "name": "Inflation Reduction Act", "year": 2022, "region": "USA", "sector": "Energy/EV", "summary": "Clean energy tax credits, EV subsidies, pharma price negotiation"},
    {"id": "volcker_rule_2015", "name": "Volcker Rule", "year": 2015, "region": "USA", "sector": "Banking", "summary": "Restricts banks from proprietary trading"},
    {"id": "sarbanes_oxley_2002", "name": "Sarbanes-Oxley Act", "year": 2002, "region": "USA", "sector": "Corporate", "summary": "Post-Enron accounting reforms, CEO accountability"},
]


async def simulate_regulation(
    company: str,
    regulation: str,
    apply_from_year: int,
    current_year: int = 2025,
) -> dict:
    """
    Simulate how a company would have performed if a regulation existed from a past year.
    Returns a year-by-year impact timeline and resilience score.
    """
    cache_key = f"rtm_{company}_{regulation}_{apply_from_year}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 3600:
        return cached[0]

    result = await ask_json(f"""You are the Regulatory Time Machine — a specialized AI that simulates alternate financial histories.

SIMULATION PARAMETERS:
- Company/Asset: {company}
- Regulation to Apply: {regulation}
- Apply From Year: {apply_from_year}
- Current Year: {current_year}
- Years Simulated: {current_year - apply_from_year}

TASK: Simulate how {company} would have performed from {apply_from_year} to {current_year} IF "{regulation}" had been active since {apply_from_year}.

Consider:
1. The regulation's direct compliance costs
2. Competitive advantage/disadvantage vs peers
3. Business model changes forced by the regulation
4. Revenue/profit impact per phase
5. Stock price impact trajectory
6. Whether the company would have adapted or struggled

Return JSON:
{{
  "company": "{company}",
  "regulation": "{regulation}",
  "simulation_period": "{apply_from_year}–{current_year}",
  "executive_summary": str,
  "resilience_score": int (0-100, 100 = thrived under regulation),
  "verdict": "thrived/adapted/struggled/collapsed",
  "cumulative_stock_impact_pct": float (estimated % change vs actual history),
  "timeline": [
    {{
      "year": int,
      "phase": str,
      "key_event": str,
      "stock_impact_pct": float,
      "revenue_impact": str,
      "forced_changes": [str],
      "competitive_position": "leader/neutral/laggard"
    }}
  ],
  "business_model_changes": [
    {{
      "change": str,
      "impact": "positive/negative/neutral",
      "magnitude": str
    }}
  ],
  "winners_in_alternate_timeline": [str],
  "losers_in_alternate_timeline": [str],
  "real_world_lesson": str,
  "future_resilience_prediction": str,
  "similar_upcoming_regulations": [str]
}}""")

    outcome = result if isinstance(result, dict) else {"error": "Analysis failed"}
    _cache[cache_key] = (outcome, time.time())
    return outcome


async def compare_companies(
    companies: list,
    regulation: str,
    apply_from_year: int,
) -> dict:
    """Compare how multiple companies would fare under the same regulation."""
    result = await ask_json(f"""You are the Regulatory Time Machine.

COMPARISON SIMULATION:
- Companies: {companies}
- Regulation: {regulation}
- Applied from: {apply_from_year}

Compare how each company would have fared if "{regulation}" existed since {apply_from_year}.

Return JSON:
{{
  "regulation": "{regulation}",
  "apply_from": {apply_from_year},
  "rankings": [
    {{
      "rank": int,
      "company": str,
      "resilience_score": int (0-100),
      "verdict": "thrived/adapted/struggled/collapsed",
      "key_reason": str,
      "stock_impact_pct": float
    }}
  ],
  "most_resilient": str,
  "most_vulnerable": str,
  "industry_wide_impact": str,
  "second_order_effects": [str]
}}""")
    return result if isinstance(result, dict) else {"error": "Comparison failed"}


async def predict_regulation_impact(
    company: str,
    upcoming_regulation: str,
    implementation_year: int,
) -> dict:
    """Predict future impact of an upcoming regulation on a company."""
    result = await ask_json(f"""You are a regulatory impact forecaster.

FORWARD SIMULATION:
- Company: {company}
- Upcoming Regulation: {upcoming_regulation}
- Expected Implementation: {implementation_year}

Predict the impact on {company} when "{upcoming_regulation}" is implemented in {implementation_year}.

Return JSON:
{{
  "company": "{company}",
  "regulation": "{upcoming_regulation}",
  "implementation_year": {implementation_year},
  "pre_implementation_advice": str,
  "impact_score": int (-100 to +100, negative=harmful, positive=beneficial),
  "short_term_impact_1y": str,
  "medium_term_impact_3y": str,
  "long_term_impact_5y": str,
  "compliance_cost_estimate": str,
  "required_adaptations": [str],
  "opportunities_created": [str],
  "risks_created": [str],
  "stock_price_prediction": {{
    "at_announcement": str,
    "at_implementation": str,
    "1_year_after": str
  }},
  "investor_action": "buy_dip/hold/reduce/avoid",
  "confidence": int
}}""")
    return result if isinstance(result, dict) else {"error": "Prediction failed"}


async def get_regulation_presets() -> dict:
    """Return the preset regulation library."""
    return {
        "presets": REGULATION_PRESETS,
        "total": len(REGULATION_PRESETS),
        "sectors": list(set(r["sector"] for r in REGULATION_PRESETS)),
        "regions": list(set(r["region"] for r in REGULATION_PRESETS)),
    }
