"""
AI-Powered Strategy Backtesting
Simulates trading strategies against historical periods using AI reasoning
"""
from core.gemini import ask, ask_json


async def backtest_strategy(strategy: str, asset: str, period: str = "10 years", initial_capital: float = 10000) -> dict:
    result = await ask_json(f"""You are a quantitative analyst and backtesting engine. Use your deep knowledge of historical market data to simulate strategy performance.

Strategy: {strategy}
Asset: {asset}
Period: {period}
Initial capital: ${initial_capital:,.0f}

Simulate this strategy against historical data for the specified period. Reason through:
- Major market events during this period and how the strategy would have responded
- Entry and exit triggers that would have fired
- Realistic transaction costs and slippage effects
- Drawdown periods and recovery dynamics
- Best and worst calendar years with specific reasoning
- Comparison to simple buy-and-hold baseline

Provide realistic estimates based on known historical data. Be intellectually honest about limitations.

Return JSON:
{{
  "strategy": "{strategy}",
  "asset": "{asset}",
  "period": "{period}",
  "initial_capital": {initial_capital},
  "simulated_results": {{
    "final_value": float,
    "total_return_pct": float,
    "annualized_return": float,
    "max_drawdown": float (negative number, e.g. -34.5),
    "sharpe_ratio": float,
    "win_rate": float (0-100),
    "best_year": str,
    "worst_year": str,
    "time_in_market": str
  }},
  "vs_buy_and_hold": {{
    "return_pct": float,
    "alpha": float
  }},
  "key_periods": [
    {{
      "date": str,
      "event": str,
    
      "strategy_response": str,
      "outcome": str
    }}
  ],
  "strengths": [str],
  "weaknesses": [str],
  "optimization_suggestions": [str],
  "risk_assessment": str
}}""")
    return result


async def compare_strategies(strategies: list, asset: str, period: str = "10 years") -> dict:
    strategies_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(strategies)])

    result = await ask_json(f"""You are a quantitative strategy comparison analyst.

Asset: {asset}
Period: {period}
Strategies to compare:
{strategies_text}

Evaluate each strategy against historical performance for this asset over the specified period. Use your knowledge of actual market history. Be specific about periods where each strategy excels or fails. Determine a clear winner with detailed reasoning.

Return JSON:
{{
  "asset": "{asset}",
  "period": "{period}",
  "comparison": [
    {{
      "strategy": str,
      "final_return_pct": float,
      "max_drawdown": float,
      "sharpe": float,
      "best_period": str,
      "worst_period": str
    }}
  ],
  "winner": str,
  "winner_reasoning": str,
  "recommended_for": {{
    "conservative": str,
    "moderate": str,
    "aggressive": str
  }}
}}""")
    return result


async def optimize_entry_exit(asset: str, strategy_goal: str, period: str = "5 years") -> dict:
    result = await ask_json(f"""You are a systematic trading strategy optimizer.

Asset: {asset}
Strategy goal: {strategy_goal}
Analysis period: {period}

Based on historical behavior of this asset, identify the optimal entry and exit rules to achieve this goal. Consider:
- Technical indicators with historically high signal accuracy for this asset (RSI, MACD, moving average crossovers, volume patterns)
- Fundamental triggers (earnings, macro events, sector rotation signals)
- Sentiment extremes as contrarian signals
- Volatility-based position sizing (Kelly criterion, fixed fractional)
- Stop loss placement that avoids noise while limiting real damage
- Historical risk/reward ratios for different entry conditions

Return JSON:
{{
  "asset": "{asset}",
  "goal": "{strategy_goal}",
  "optimal_entry_signals": [str],
  "optimal_exit_signals": [str],
  "stop_loss_recommendation": str,
  "position_sizing": str,
  "historical_performance_estimate": str,
  "risk_reward_ratio": str
}}""")
    return result
