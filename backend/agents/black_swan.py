"""
Black Swan & Systemic Risk Detection AI
Identifies silent panic indicators, tail risk precursors, and regime-breaking anomalies
"""
import time
from core.gemini import ask, ask_json

_cache: dict = {}


async def scan_for_black_swan(market_context: str) -> dict:
    result = await ask_json(f"""You are a quantitative tail-risk analyst trained on every major market crisis since 1929.

Market context provided:
{market_context}

Scan for black swan precursors and silent panic signals. Analyze:
- Correlation breakdown between normally linked assets (equity/bond, USD/gold, etc.)
- Sudden liquidity evaporation in normally deep markets
- Volatility term structure inversions or extreme skew
- Credit spread divergences (IG vs HY, sovereign vs corporate)
- Options market positioning showing institutional hedging spikes
- Smart money/dumb money divergence extremes
- Repo market stress or overnight rate anomalies
- Historical pattern matches to 1987, 1998, 2000, 2008, 2011, 2018, 2020

Return JSON:
{{
  "overall_risk_level": "low|elevated|high|critical",
  "risk_score": int (0-100),
  "anomalies_detected": [
    {{
      "signal": str,
      "description": str,
      "severity": "low|medium|high|critical",
      "historical_precedent": str
    }}
  ],
  "correlation_breaks": [str],
  "liquidity_warnings": [str],
  "early_warning_indicators": [str],
  "time_to_act": str,
  "recommended_hedges": [str]
}}""")
    return result


async def analyze_volatility_regime(asset: str, context: str = "") -> dict:
    result = await ask_json(f"""You are a volatility regime specialist with deep knowledge of VIX term structure, realized vs implied vol relationships, and regime transitions.

Asset: {asset}
Additional context: {context if context else "None provided"}

Identify the current volatility regime and its historical implications. Consider:
- Low vol / high complacency regime (pre-crash)
- Elevated but stable vol (transition)
- Volatility explosion / panic regime
- Vol compression post-spike (recovery)
- Mean reversion dynamics and regime persistence

Return JSON:
{{
  "asset": "{asset}",
  "current_regime": str,
  "regime_description": str,
  "historical_matches": [str],
  "typical_duration": str,
  "what_breaks_the_regime": str,
  "probability_of_escalation": int (0-100)
}}""")
    return result


async def get_systemic_risk_dashboard() -> dict:
    cached = _cache.get("systemic_dashboard")
    if cached and time.time() - cached[1] < 600:
        return cached[0]
    result = await ask_json("""You are a global systemic risk monitor. Provide a real-time calibrated snapshot of macro stress indicators.

Assess the following domains based on your knowledge of current conditions:
- Credit markets (spreads, defaults, leverage)
- Banking system (capital ratios, shadow banking, repo stress)
- Geopolitical risk (hot wars, trade conflicts, sanctions)
- Currency system stress (dollar strength, EM stress, reserve diversification)
- Equity market structure (concentration, valuation extremes, passive crowding)
- Commodity / energy systemic links
- Debt sustainability (sovereign, corporate, consumer)

Return JSON:
{
  "overall_score": int (0-100, 100 = maximum systemic risk),
  "indicators": [
    {
      "name": str,
      "score": int (0-100),
      "status": "stable|watch|warning|critical",
      "trend": "improving|stable|deteriorating"
    }
  ],
  "most_concerning": str,
  "compared_to_2008": str,
  "compared_to_2020": str,
  "monitoring_recommendations": [str]
}""", fast=True)
    _cache["systemic_dashboard"] = (result, time.time())
    return result
