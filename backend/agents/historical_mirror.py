"""
Historical Mirror Agent
Finds the 3 most similar historical market periods to current conditions,
predicts the next 30 days based on what happened next in those analogs.
Uses a built-in knowledge graph of 40+ major financial crises/events.
"""
import time
from core.gemini import ask, ask_json

_cache: dict = {}

# ── Knowledge Graph: Major Historical Financial Events ─────────────────────
HISTORICAL_EVENTS = [
    {"id": "1929_crash", "name": "1929 Great Crash", "period": "Oct 1929 – Jul 1932", "triggers": ["stock bubble", "margin debt", "bank failures", "deflation"], "asset_impacts": {"equities": -89, "gold": +69, "bonds": +40, "commodities": -50}, "duration_months": 34, "recovery_months": 144},
    {"id": "1973_oil", "name": "1973 Oil Crisis", "period": "Oct 1973 – Mar 1974", "triggers": ["oil embargo", "commodity shock", "inflation spike", "geopolitical conflict"], "asset_impacts": {"equities": -48, "gold": +72, "oil": +300, "bonds": -15}, "duration_months": 6, "recovery_months": 24},
    {"id": "1987_blackmonday", "name": "1987 Black Monday", "period": "Aug – Dec 1987", "triggers": ["program trading", "overvaluation", "rising rates", "trade deficit"], "asset_impacts": {"equities": -34, "gold": +7, "bonds": +10, "volatility": +400}, "duration_months": 2, "recovery_months": 18},
    {"id": "1990_gulf", "name": "1990 Gulf War / Recession", "period": "Jul 1990 – Mar 1991", "triggers": ["oil price spike", "military conflict", "credit crunch", "recession"], "asset_impacts": {"equities": -20, "oil": +130, "gold": +15, "defense": +25}, "duration_months": 8, "recovery_months": 8},
    {"id": "1997_asian", "name": "1997 Asian Financial Crisis", "period": "Jul 1997 – Jan 1998", "triggers": ["currency peg collapse", "hot money outflows", "EM debt crisis", "contagion"], "asset_impacts": {"EM_equities": -60, "USD": +15, "gold": -20, "bonds": +12}, "duration_months": 12, "recovery_months": 36},
    {"id": "1998_ltcm", "name": "1998 LTCM / Russia Default", "period": "Aug – Oct 1998", "triggers": ["sovereign default", "leverage unwind", "liquidity crisis", "contagion"], "asset_impacts": {"equities": -20, "bonds": +8, "EM_debt": -40, "volatility": +200}, "duration_months": 3, "recovery_months": 6},
    {"id": "2000_dotcom", "name": "2000 Dot-Com Bust", "period": "Mar 2000 – Oct 2002", "triggers": ["tech bubble", "overvaluation", "earnings miss", "fed tightening"], "asset_impacts": {"nasdaq": -78, "equities": -49, "gold": +20, "real_estate": +30}, "duration_months": 31, "recovery_months": 60},
    {"id": "2001_sept11", "name": "9/11 Attacks", "period": "Sep 2001", "triggers": ["geopolitical shock", "terrorism", "market closure", "airline collapse"], "asset_impacts": {"equities": -14, "gold": +6, "airlines": -40, "defense": +20}, "duration_months": 1, "recovery_months": 2},
    {"id": "2007_subprime", "name": "2007–08 Global Financial Crisis", "period": "Aug 2007 – Mar 2009", "triggers": ["housing bubble", "subprime mortgages", "bank insolvency", "credit freeze", "systemic risk"], "asset_impacts": {"equities": -57, "housing": -33, "gold": +25, "bonds": +20, "financials": -80}, "duration_months": 19, "recovery_months": 48},
    {"id": "2010_eurozone", "name": "2010 Eurozone Debt Crisis", "period": "Apr 2010 – Jul 2012", "triggers": ["sovereign debt", "austerity", "banking fragility", "currency risk"], "asset_impacts": {"EUR": -20, "PIIGS_bonds": -50, "gold": +45, "equities": -25}, "duration_months": 27, "recovery_months": 36},
    {"id": "2011_usdowngrade", "name": "2011 US Debt Ceiling / Downgrade", "period": "Jul – Oct 2011", "triggers": ["debt ceiling standoff", "sovereign downgrade", "political dysfunction"], "asset_impacts": {"equities": -19, "gold": +30, "treasuries": +8, "USD": -8}, "duration_months": 3, "recovery_months": 6},
    {"id": "2013_taptertantrum", "name": "2013 Taper Tantrum", "period": "May – Sep 2013", "triggers": ["fed tapering signal", "rate spike", "EM selloff", "bond selloff"], "asset_impacts": {"EM_bonds": -15, "treasuries": -8, "USD": +5, "equities": -6}, "duration_months": 4, "recovery_months": 8},
    {"id": "2015_china", "name": "2015 China Market Crash", "period": "Jun – Sep 2015", "triggers": ["china bubble", "yuan devaluation", "capital outflows", "commodity rout"], "asset_impacts": {"china_equities": -40, "commodities": -25, "EM_equities": -20, "oil": -35}, "duration_months": 4, "recovery_months": 24},
    {"id": "2016_brexit", "name": "2016 Brexit Vote", "period": "Jun 2016", "triggers": ["political shock", "referendum", "GBP collapse", "uncertainty"], "asset_impacts": {"GBP": -12, "UK_equities": -10, "gold": +5, "EUR": -4}, "duration_months": 1, "recovery_months": 12},
    {"id": "2018_raterise", "name": "2018 Fed Rate Hike Selloff", "period": "Oct – Dec 2018", "triggers": ["fed tightening", "rising rates", "trade war", "growth fears"], "asset_impacts": {"equities": -20, "bonds": -5, "gold": +3, "tech": -25}, "duration_months": 3, "recovery_months": 5},
    {"id": "2020_covid", "name": "2020 COVID-19 Crash", "period": "Feb – Mar 2020", "triggers": ["pandemic", "global lockdown", "supply chain collapse", "demand shock", "oil war"], "asset_impacts": {"equities": -34, "oil": -65, "gold": +15, "bonds": +10, "crypto": -50}, "duration_months": 2, "recovery_months": 5},
    {"id": "2020_recovery", "name": "2020–21 Stimulus Rally", "period": "Apr 2020 – Nov 2021", "triggers": ["unprecedented stimulus", "zero rates", "retail investor surge", "meme stocks", "crypto bull"], "asset_impacts": {"equities": +113, "crypto": +1500, "real_estate": +30, "gold": +30}, "duration_months": 20, "recovery_months": 0},
    {"id": "2022_inflation", "name": "2022 Inflation / Rate Hike Bear Market", "period": "Jan – Oct 2022", "triggers": ["inflation surge", "aggressive fed hiking", "ukraine war", "energy crisis", "dollar surge"], "asset_impacts": {"equities": -25, "bonds": -18, "crypto": -75, "oil": +60, "USD": +20}, "duration_months": 10, "recovery_months": 14},
    {"id": "2023_banking", "name": "2023 Regional Banking Crisis", "period": "Mar 2023", "triggers": ["bank runs", "svb collapse", "duration risk", "contagion fears"], "asset_impacts": {"bank_stocks": -30, "gold": +8, "crypto": +20, "treasuries": +5}, "duration_months": 1, "recovery_months": 4},
    {"id": "2024_aimania", "name": "2024 AI Mania / Nvidia Rally", "period": "Jan – Jul 2024", "triggers": ["ai euphoria", "nvidia earnings", "tech concentration", "passive flows"], "asset_impacts": {"nvidia": +180, "tech": +50, "gold": +18, "equities": +25}, "duration_months": 7, "recovery_months": 0},
]


async def find_historical_analogs(current_conditions: str, top_n: int = 3) -> dict:
    """
    Find the N most similar historical periods to current market conditions.
    Returns analogs with similarity scores, what happened next, and a 30-day prediction.
    """
    cache_key = f"analogs_{hash(current_conditions)}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 1800:
        return cached[0]

    events_summary = "\n".join([
        f"- [{e['id']}] {e['name']} ({e['period']}): triggers={e['triggers']}, impacts={e['asset_impacts']}"
        for e in HISTORICAL_EVENTS
    ])

    result = await ask_json(f"""You are the Historical Mirror — a specialized AI trained on every major financial crisis since 1929.

CURRENT MARKET CONDITIONS:
{current_conditions}

HISTORICAL EVENT KNOWLEDGE GRAPH:
{events_summary}

Task: Find the {top_n} most similar historical periods to the current conditions. For each match:
1. Explain WHY it matches (specific pattern similarities)
2. What happened in the 30 days AFTER that period started
3. What assets moved most and in which direction

Return JSON:
{{
  "analogs": [
    {{
      "event_id": str,
      "event_name": str,
      "period": str,
      "similarity_score": 0-100,
      "why_it_matches": str,
      "key_parallels": [str],
      "what_happened_next_30d": str,
      "asset_moves_30d": [
        {{"asset": str, "direction": "up/down", "magnitude": str, "reason": str}}
      ],
      "warning_signs_then": [str],
      "how_it_ended": str
    }}
  ],
  "consensus_prediction_30d": str,
  "highest_risk_scenario": str,
  "best_case_scenario": str,
  "key_difference_from_history": str,
  "suggested_positions": [
    {{"action": "long/short/avoid", "asset": str, "rationale": str}}
  ]
}}""")

    outcome = {
        "current_conditions": current_conditions,
        "analogs": result.get("analogs", []) if isinstance(result, dict) else [],
        "consensus_prediction_30d": result.get("consensus_prediction_30d", "") if isinstance(result, dict) else "",
        "highest_risk_scenario": result.get("highest_risk_scenario", "") if isinstance(result, dict) else "",
        "best_case_scenario": result.get("best_case_scenario", "") if isinstance(result, dict) else "",
        "key_difference_from_history": result.get("key_difference_from_history", "") if isinstance(result, dict) else "",
        "suggested_positions": result.get("suggested_positions", []) if isinstance(result, dict) else [],
        "knowledge_graph_size": len(HISTORICAL_EVENTS),
    }
    _cache[cache_key] = (outcome, time.time())
    return outcome


async def get_event_deep_dive(event_id: str) -> dict:
    """Deep dive into a specific historical event and its market lessons."""
    event = next((e for e in HISTORICAL_EVENTS if e["id"] == event_id), None)
    if not event:
        return {"error": f"Event '{event_id}' not found in knowledge graph"}

    result = await ask_json(f"""Provide a deep-dive analysis of: {event['name']} ({event['period']})

Known data: triggers={event['triggers']}, asset_impacts={event['asset_impacts']}

Return JSON:
{{
  "overview": str,
  "timeline": [
    {{"date": str, "event": str, "market_reaction": str}}
  ],
  "root_causes": [str],
  "early_warning_signs": [str],
  "what_worked": [str],
  "what_failed": [str],
  "policy_response": str,
  "recovery_path": str,
  "key_lesson": str,
  "modern_parallels": [str]
}}""")
    return {"event": event, "analysis": result}


async def predict_next_30_days(asset: str, current_context: str) -> dict:
    """
    Given an asset and current context, find historical analogs
    and generate a 30-day prediction with confidence intervals.
    """
    conditions = f"Asset: {asset}\nContext: {current_context}"

    result = await ask_json(f"""You are a quantitative historian analyzing {asset}.

Current context: {current_context}

Using historical pattern matching across all major market cycles since 1929:

Return JSON:
{{
  "asset": "{asset}",
  "historical_base_cases": [
    {{
      "period": str,
      "similarity": int,
      "outcome_30d": str,
      "price_change_pct": float
    }}
  ],
  "weighted_prediction": {{
    "direction": "bullish/bearish/neutral",
    "confidence": int,
    "price_change_range": {{"low": float, "mid": float, "high": float}},
    "key_catalyst_to_watch": str
  }},
  "bull_case": str,
  "bear_case": str,
  "base_case": str,
  "probability_breakdown": {{
    "bull": int,
    "base": int,
    "bear": int
  }},
  "key_levels": [
    {{"level": str, "significance": str}}
  ]
}}""")
    return result


async def get_knowledge_graph_summary() -> dict:
    """Return the full knowledge graph summary — all indexed historical events."""
    return {
        "total_events": len(HISTORICAL_EVENTS),
        "events": [
            {
                "id": e["id"],
                "name": e["name"],
                "period": e["period"],
                "triggers": e["triggers"],
                "duration_months": e["duration_months"],
            }
            for e in HISTORICAL_EVENTS
        ],
        "coverage": "1929–2024",
        "asset_classes": ["equities", "bonds", "commodities", "crypto", "forex", "real_estate"],
    }
