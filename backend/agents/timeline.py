from core.gemini import ask_json


async def run_timeline(event: str) -> dict:
    result = await ask_json(f"""Financial event: {event}

Generate a 5-stage market reaction timeline.
Return JSON: {{
  "event": str,
  "stages": [
    {{"period": "Hour 1-6", "label": "Algorithmic reaction", "predicted_moves": [{{"asset": str, "direction": str, "magnitude": str}}], "narrative": str, "confidence": int}},
    {{"period": "Day 1-2", "label": "Institutional repositioning", "predicted_moves": [{{"asset": str, "direction": str, "magnitude": str}}], "narrative": str, "confidence": int}},
    {{"period": "Day 3-7", "label": "Retail and media reaction", "predicted_moves": [{{"asset": str, "direction": str, "magnitude": str}}], "narrative": str, "confidence": int}},
    {{"period": "Week 2-4", "label": "Fundamental repricing", "predicted_moves": [{{"asset": str, "direction": str, "magnitude": str}}], "narrative": str, "confidence": int}},
    {{"period": "Month 2-6", "label": "New equilibrium", "predicted_moves": [{{"asset": str, "direction": str, "magnitude": str}}], "narrative": str, "confidence": int}}
  ],
  "opportunity_window": str,
  "key_risk": str
}}
Respond ONLY in valid JSON. No markdown.""")

    if "parse_error" in result:
        return {"event": event, "stages": [], "opportunity_window": "", "key_risk": ""}
    return result
