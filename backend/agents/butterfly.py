from core.gemini import ask_json


async def run_butterfly(headline: str, description: str = "") -> dict:
    prompt = f"""News event: {headline}
Additional context: {description}

Trace the full market ripple effect in JSON:
{{
  "trigger": {{"event": str, "location": str, "category": str}},
  "ripples": [
    {{"order": 1, "asset": str, "direction": "up/down/neutral", "impact_pct": str, "timeframe": str, "confidence": int, "reason": str}},
    {{"order": 2, "asset": str, "direction": "up/down/neutral", "impact_pct": str, "timeframe": str, "confidence": int, "reason": str}},
    {{"order": 3, "asset": str, "direction": "up/down/neutral", "impact_pct": str, "timeframe": str, "confidence": int, "reason": str}}
  ],
  "opportunity": str,
  "risk": str,
  "severity": int
}}
Include at least 5 ripples across orders 1, 2, and 3. Think: commodities → equities → crypto → currencies → bonds.
Respond ONLY in valid JSON. No markdown."""

    result = await ask_json(prompt)
    if "parse_error" in result:
        return {
            "trigger": {"event": headline},
            "ripples": [],
            "opportunity": "unavailable",
            "risk": "unknown",
            "severity": 5,
        }
    return result
