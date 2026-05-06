from core.gemini import ask_json


async def run_stress_test(event: str, region: str = "Global") -> dict:
    # Agent 1: Historian
    historical = await ask_json(f"""Event: {event} in {region}
Find the 3 most similar historical geopolitical/economic events.
Return JSON: {{"matches": [{{"year": int, "event": str, "similarity_pct": int, "what_moved": [{{"asset": str, "direction": str, "pct_move": str, "timeframe": str}}]}}]}}
Respond ONLY in valid JSON. No markdown.""")

    # Agent 2: Supply Chain (gets historian output as context)
    hist_context = str(historical)
    supply = await ask_json(f"""Event: {event} in {region}
Historical context: {hist_context}

Identify affected supply chains, industries and companies.
Return JSON: {{"impacts": [{{"industry": str, "affected_companies": [str], "impact_type": str, "severity": int, "reason": str}}]}}
Respond ONLY in valid JSON. No markdown.""")

    # Agent 3: Predictor (gets both previous outputs as context)
    supply_context = str(supply)
    predictions = await ask_json(f"""Event: {event}
Historical precedents: {hist_context}
Supply chain impacts: {supply_context}

Generate price predictions for the next 48h, 7 days, 30 days.
Return JSON: {{"predictions": [{{"timeframe": str, "assets": [{{"name": str, "direction": str, "magnitude": str, "confidence": int}}], "narrative": str}}], "overall_confidence": int, "key_risk": str}}
Respond ONLY in valid JSON. No markdown.""")

    return {
        "event": event,
        "region": region,
        "historical_matches": historical.get("matches", []),
        "supply_chain": supply.get("impacts", []),
        "predictions": predictions.get("predictions", []),
        "overall_confidence": predictions.get("overall_confidence", 50),
        "key_risk": predictions.get("key_risk", ""),
    }
