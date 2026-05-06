"""
Autonomous Strategy Builder
User states goal → AI builds complete investment strategy
"""
from core.gemini import ask, ask_json

STRATEGY_SYSTEM = """You are an elite portfolio strategist with 30 years of experience managing 
multi-billion dollar funds. You build complete, actionable investment strategies based on user goals.
Always include specific allocation percentages, entry conditions, exit rules, and risk management."""


async def build_strategy(
    goal: str,
    risk_tolerance: str = "moderate",
    time_horizon: str = "1-3 years",
    capital: float = 10000,
    excluded_sectors: list = []
) -> dict:
    
    prompt = f"""Build a complete investment strategy:
Goal: {goal}
Risk tolerance: {risk_tolerance}
Time horizon: {time_horizon}
Capital: ${capital:,.0f}
Excluded sectors: {excluded_sectors if excluded_sectors else "None"}

Return a comprehensive strategy as JSON:
{{
  "strategy_name": str,
  "summary": str,
  "allocation": [
    {{
      "asset_class": str,
      "percentage": float,
      "specific_assets": [str],
      "reason": str
    }}
  ],
  "entry_conditions": [str],
  "exit_rules": [str],
  "stop_loss": str,
  "take_profit": str,
  "rebalancing_frequency": str,
  "risk_management": [str],
  "expected_return": str,
  "max_drawdown": str,
  "hedges": [str],
  "monthly_actions": [str],
  "red_flags_to_watch": [str],
  "total_risk_score": 1-10
}}"""
    
    result = await ask_json(prompt, system=STRATEGY_SYSTEM)
    
    # Add capital amounts to allocations
    if "allocation" in result and isinstance(result["allocation"], list):
        for alloc in result["allocation"]:
            pct = alloc.get("percentage", 0)
            alloc["amount"] = round(capital * pct / 100, 2)
    
    return {
        "strategy": result,
        "inputs": {"goal": goal, "risk": risk_tolerance, "horizon": time_horizon, "capital": capital},
        "disclaimer": "This is AI-generated analysis, not financial advice. Always consult a licensed advisor."
    }


async def adjust_strategy(current_strategy: dict, market_change: str) -> dict:
    """Adjust existing strategy based on new market conditions"""
    result = await ask_json(f"""Current strategy: {current_strategy.get('strategy_name', 'Unknown')}
Current allocation: {current_strategy.get('allocation', [])}
New market condition: {market_change}

How should this strategy be adjusted? Return JSON:
{{
  "changes_needed": bool,
  "urgency": "low/medium/high",
  "adjustments": [{{"action": str, "asset": str, "reason": str, "new_allocation": float}}],
  "reasoning": str
}}""")
    return result
