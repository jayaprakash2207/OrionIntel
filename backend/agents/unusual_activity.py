"""
Unusual Transaction Detector
Flags abnormal options activity, block trades, executive selling
"""
from core.gemini import ask, ask_json


async def analyze_unusual_activity(asset: str, activity_description: str) -> dict:
    result = await ask_json(f"""Asset: {asset}
Unusual activity reported: {activity_description}

Analyze if this is significant. Return JSON:
{{
  "significance": 1-10,
  "activity_type": str,
  "pattern": str,
  "historical_precedent": str,
  "possible_reasons": [str],
  "insider_probability": int,
  "market_signal": "very_bearish/bearish/neutral/bullish/very_bullish",
  "recommended_action": str,
  "risk_warning": str
}}""")
    return result


async def scan_for_anomalies(assets: list) -> dict:
    """AI-based anomaly detection across multiple assets"""
    result = await ask_json(f"""Assets to scan: {assets}
Based on your knowledge of recent market behavior, are there any unusual patterns or activities 
worth flagging for these assets? Look for: unusual options volume, insider patterns, 
abnormal price/volume divergences.

Return JSON:
{{
  "anomalies": [
    {{
      "asset": str,
      "anomaly_type": str,
      "severity": 1-10,
      "description": str,
      "implication": str
    }}
  ],
  "clean_assets": [str],
  "overall_market_anomalies": str
}}""")
    return result
