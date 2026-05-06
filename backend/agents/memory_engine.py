from core.gemini import ask_json


async def find_historical_pattern(situation: str) -> dict:
    result = await ask_json(f"""Current market situation: {situation}

Compare to historical periods. Use your knowledge of: 1929 crash, 1973 oil shock, 1987 Black Monday, 1997 Asian crisis, 2000 dot-com, 2008 financial crisis, 2020 COVID crash, 2022 inflation shock.
Return JSON: {{
  "matches": [{{
    "year": int,
    "event": str,
    "similarity_pct": int,
    "what_happened": str,
    "asset_outcomes": [{{"asset": str, "outcome": str, "timeframe": str}}]
  }}],
  "current_outlook": str,
  "key_lesson": str,
  "confidence": int
}}
Respond ONLY in valid JSON. No markdown.""")

    if "parse_error" in result:
        return {
            "matches": [],
            "current_outlook": "",
            "key_lesson": "",
            "confidence": 0,
        }
    return result
