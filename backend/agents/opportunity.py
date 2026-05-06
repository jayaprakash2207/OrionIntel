from core.gemini import ask_json


async def find_opportunities(event: str, affected_asset: str = "") -> dict:
    result = await ask_json(f"""Crisis/Event: {event}
Directly affected asset: {affected_asset}

Find investment opportunities that BENEFIT from this event. Think contrarian.
Return JSON: {{
  "opportunities": [{{
    "asset": str,
    "type": str,
    "reason": str,
    "historical_backing": str,
    "timeframe": str,
    "risk_level": "low/medium/high",
    "confidence": int
  }}],
  "assets_to_avoid": [str],
  "contrarian_play": str,
  "time_sensitive": bool
}}
Respond ONLY in valid JSON. No markdown.""")

    if "parse_error" in result:
        return {
            "opportunities": [],
            "assets_to_avoid": [],
            "contrarian_play": "",
            "time_sensitive": False,
        }
    return result
