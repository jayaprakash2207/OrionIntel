"""
Wealth Migration & Smart Money Flow Tracker AI
Tracks sovereign wealth funds, family offices, hedge funds, and institutional repositioning
"""
from core.gemini import ask, ask_json
from datetime import datetime


async def track_wealth_flows(region: str = "Global", asset_class: str = "all") -> dict:
    result = await ask_json(f"""You are an elite capital flow intelligence analyst with access to institutional filings, sovereign wealth fund disclosures, and high-net-worth repositioning data.

Region focus: {region}
Asset class filter: {asset_class}
Analysis date: {datetime.now().strftime("%B %Y")}

Analyze where smart money (sovereign wealth funds, family offices, major hedge funds, billionaire allocators) is currently repositioning. Consider:
- SEC 13F filings and changes
- Sovereign wealth fund public disclosures (Norway GPFG, Saudi PIF, Abu Dhabi ADIA, Singapore GIC/Temasek, China CIC)
- Family office allocation trend surveys
- Hedge fund positioning data (COT reports, prime broker data)
- Private equity dry powder deployment patterns
- Billionaire public statements vs actual portfolio moves
- Capital flight patterns from specific jurisdictions
- Currency diversification away from USD

Return JSON:
{{
  "analysis_date": "{datetime.now().strftime("%B %Y")}",
  "region": "{region}",
  "inflows": [
    {{
      "destination": str,
      "capital_type": str,
      "estimated_flow": str,
      "key_players": [str],
      "thesis": str
    }}
  ],
  "outflows": [
    {{
      "source": str,
      "reason": str,
      "affected_assets": [str],
      "timeline": str
    }}
  ],
  "rotation_themes": [str],
  "contrarian_signals": [str],
  "retail_lag_indicator": str,
  "recommended_attention": [str]
}}""")
    return result


async def analyze_sovereign_wealth(country: str) -> dict:
    result = await ask_json(f"""You are a sovereign wealth fund intelligence analyst.

Country: {country}

Analyze this country's sovereign wealth fund(s) in depth. Cover:
- Fund structure, mandate, and governance
- Known sector and geographic allocations
- Recent publicly disclosed moves and shifts
- Strategic thesis (resource diversification, geopolitical alignment, return maximization)
- How geopolitical events affect their investment behavior
- What their positioning signals for global markets
- Risk factors specific to this fund
- Comparison to other major SWFs

Return JSON:
{{
  "country": "{country}",
  "fund_name": str,
  "estimated_aum": str,
  "known_sectors": [str],
  "recent_moves": [str],
  "strategic_thesis": str,
  "geopolitical_alignment": str,
  "market_signals": [str],
  "risk_factors": [str]
}}""")
    return result


async def get_smart_money_divergence(asset: str) -> dict:
    result = await ask_json(f"""You are a market microstructure analyst specializing in institutional vs retail divergence.

Asset: {asset}

Identify where institutional/smart money positioning diverges from retail sentiment. Analyze:
- Retail sentiment indicators (social media, options flow from small accounts, survey data)
- Institutional signals (large block trades, dark pool activity, 13F changes, options market maker positioning)
- COT (Commitment of Traders) positioning if applicable
- Historically, when this divergence reached similar extremes, what happened?
- What narrative is smart money building vs what retail believes?
- Timing signals: is the divergence fresh or has it been building?

Return JSON:
{{
  "asset": "{asset}",
  "retail_sentiment": str,
  "institutional_signal": str,
  "divergence_level": "low|medium|high|extreme",
  "historical_accuracy": str,
  "what_smart_money_sees": str,
  "timing_signal": str,
  "trade_thesis": str
}}""")
    return result
