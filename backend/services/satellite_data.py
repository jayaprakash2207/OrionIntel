"""
Satellite / Alternative Data Service
Fetches real weather data from OpenWeather API and uses AI to map signals
to commodity/market impacts.
"""
import asyncio
import time
from core.config import settings
from core.gemini import ask_json
import httpx

_cache: dict = {}


def _cached(key: str, ttl: int = 300):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < ttl:
            return data
    return None


def _set_cache(key: str, data):
    _cache[key] = (data, time.time())


# --- Region / city mapping ---------------------------------------------------

AGRICULTURAL_REGIONS = [
    {"name": "US Midwest",  "city": "Des Moines",   "commodities": ["Corn", "Soybeans", "Wheat"]},
    {"name": "Brazil",      "city": "Sao Paulo",    "commodities": ["Soybeans", "Coffee", "Sugar"]},
    {"name": "India",       "city": "Mumbai",       "commodities": ["Rice", "Cotton", "Wheat"]},
    {"name": "Ukraine",     "city": "Kyiv",         "commodities": ["Wheat", "Sunflower Oil", "Corn"]},
    {"name": "Australia",   "city": "Sydney",       "commodities": ["Wheat", "Barley", "Wool"]},
]

WEATHER_COMMODITY_MAP = {
    # condition keyword -> (impact_description, direction)
    "extreme heat":    ("Severe heat stress reduces yields; expect supply contraction", "bearish"),
    "drought":         ("Drought conditions threaten crop production", "bearish"),
    "flood":           ("Flood damage disrupts planting/harvest schedules", "bearish"),
    "freeze":          ("Frost / freeze risk to winter crops and citrus", "bearish"),
    "heavy rain":      ("Excess moisture may delay harvest and promote disease", "bearish"),
    "ideal":           ("Favourable growing conditions support higher yields", "bullish"),
    "normal":          ("Seasonal norms; no material supply disruption expected", "neutral"),
}


def _classify_weather(temp_c: float, description: str, precipitation: float) -> tuple[str, str]:
    """Return (condition_label, commodity_impact_str)."""
    desc_lower = description.lower()

    if temp_c > 38:
        return "extreme heat", "Extreme heat stress likely to reduce crop yields significantly"
    if temp_c < -10:
        return "freeze", "Freezing temperatures risk damaging winter crops and orchards"
    if "thunderstorm" in desc_lower or "heavy rain" in desc_lower or precipitation > 50:
        return "heavy rain", "Heavy precipitation may waterlog fields and delay harvests"
    if "drizzle" in desc_lower or "rain" in desc_lower:
        return "normal", "Moderate rainfall within seasonal norms; neutral crop impact"
    if "clear" in desc_lower and 15 <= temp_c <= 30:
        return "ideal", "Clear skies and optimal temperatures favour strong yields"
    return "normal", "Weather within seasonal range; no significant commodity disruption"


async def _fetch_city_weather(client: httpx.AsyncClient, city: str) -> dict:
    """Fetch current weather for a single city from OpenWeather. Returns raw OWM dict."""
    r = await client.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={
            "q": city,
            "appid": settings.OPENWEATHER_API_KEY,
            "units": "metric",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


async def get_weather_market_signals(region: str = "Global") -> dict:
    """
    Fetches current weather for 5 major agricultural regions and maps
    weather extremes to commodity market impacts.

    Returns:
        {
            regions: [{name, condition, temperature, precipitation,
                       commodity_impact: str, affected_commodities: [...]}],
            overall_signal: str,
            high_impact_events: [...]
        }
    """
    cache_key = f"weather_signals_{region}"
    cached = _cached(cache_key, 600)
    if cached:
        return cached

    region_results = []
    high_impact_events = []

    if settings.OPENWEATHER_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                tasks = [_fetch_city_weather(client, r["city"]) for r in AGRICULTURAL_REGIONS]
                raw_results = await asyncio.gather(*tasks, return_exceptions=True)

            for reg_meta, raw in zip(AGRICULTURAL_REGIONS, raw_results):
                if isinstance(raw, Exception):
                    # Individual city failed – use AI fallback for this one
                    region_results.append({
                        "name": reg_meta["name"],
                        "condition": "data unavailable",
                        "temperature": None,
                        "precipitation": 0,
                        "commodity_impact": "Live data unavailable; using seasonal baseline",
                        "affected_commodities": reg_meta["commodities"],
                    })
                    continue

                temp_c = raw.get("main", {}).get("temp", 20)
                description = raw.get("weather", [{}])[0].get("description", "clear sky")
                rain_1h = raw.get("rain", {}).get("1h", 0)
                condition_label, impact_str = _classify_weather(temp_c, description, rain_1h)

                entry = {
                    "name": reg_meta["name"],
                    "condition": condition_label,
                    "temperature": round(temp_c, 1),
                    "precipitation": round(rain_1h, 1),
                    "commodity_impact": impact_str,
                    "affected_commodities": reg_meta["commodities"],
                }
                region_results.append(entry)

                if condition_label in ("extreme heat", "freeze", "flood", "heavy rain"):
                    high_impact_events.append({
                        "region": reg_meta["name"],
                        "event": condition_label,
                        "commodities": reg_meta["commodities"],
                        "impact": impact_str,
                    })

        except Exception:
            # Full API failure – fall through to AI-generated assessment
            region_results = []

    # If we got no results (no key or full failure), ask Gemini
    if not region_results:
        try:
            ai_data = await ask_json(f"""
You are a commodities analyst. Provide a realistic current weather assessment for
major agricultural regions. Region filter: {region}.

Return JSON with this exact structure:
{{
  "regions": [
    {{
      "name": "US Midwest",
      "condition": "normal|ideal|extreme heat|freeze|heavy rain|drought",
      "temperature": <number celsius>,
      "precipitation": <mm in last hour>,
      "commodity_impact": "<one sentence>",
      "affected_commodities": ["Corn", "Soybeans", "Wheat"]
    }}
  ],
  "overall_signal": "<one sentence market signal>",
  "high_impact_events": []
}}
Include all 5 regions: US Midwest, Brazil, India, Ukraine, Australia.
""")
            result = ai_data
            result["_source"] = "ai_generated"
            _set_cache(cache_key, result)
            return result
        except Exception as e:
            return {
                "regions": [],
                "overall_signal": "Weather data temporarily unavailable",
                "high_impact_events": [],
                "error": str(e),
            }

    # Derive overall signal
    bearish_count = sum(1 for r in region_results if "reduce" in r["commodity_impact"].lower()
                        or "risk" in r["commodity_impact"].lower()
                        or "delay" in r["commodity_impact"].lower())
    if bearish_count >= 3:
        overall_signal = "Multiple agricultural stress zones active – commodity prices may face upward pressure"
    elif bearish_count >= 1:
        overall_signal = "Localised weather stress in key growing regions; monitor grain/oilseed prices"
    else:
        overall_signal = "Broadly favourable growing conditions across major agricultural belts; neutral commodity outlook"

    result = {
        "regions": region_results,
        "overall_signal": overall_signal,
        "high_impact_events": high_impact_events,
        "_source": "openweather_api",
    }
    _set_cache(cache_key, result)
    return result


async def get_crop_stress_signals() -> dict:
    """
    Analyses weather patterns for crop stress indicators across key growing regions.

    Returns:
        {
            stress_level: "low|moderate|high|critical",
            affected_crops: [...],
            price_impact_estimate: str,
            regions_at_risk: [...],
            historical_comparison: str
        }
    """
    cache_key = "crop_stress"
    cached = _cached(cache_key, 900)
    if cached:
        return cached

    # First get underlying weather signals
    try:
        weather = await get_weather_market_signals()
    except Exception:
        weather = {"regions": [], "high_impact_events": []}

    high_impact = weather.get("high_impact_events", [])
    regions = weather.get("regions", [])

    # Build context for Gemini
    region_summary = "\n".join(
        f"- {r['name']}: {r['condition']}, {r['temperature']}°C, impact: {r['commodity_impact']}"
        for r in regions if r.get("condition") not in (None, "data unavailable")
    ) or "No live weather data available – use seasonal baseline."

    try:
        result = await ask_json(f"""
You are an agricultural commodities analyst. Based on the following current weather
conditions across major growing regions, assess crop stress levels and price implications.

Weather conditions:
{region_summary}

High-impact events: {len(high_impact)} active

Return JSON:
{{
  "stress_level": "low|moderate|high|critical",
  "affected_crops": ["<crop name>"],
  "price_impact_estimate": "<percentage range or qualitative estimate>",
  "regions_at_risk": ["<region name>"],
  "historical_comparison": "<one sentence comparing to a historical precedent>",
  "key_risks": ["<risk description>"],
  "timeline": "<short|medium|long-term outlook>"
}}
""")
        _set_cache(cache_key, result)
        return result
    except Exception as e:
        fallback = {
            "stress_level": "moderate",
            "affected_crops": ["Wheat", "Corn", "Soybeans"],
            "price_impact_estimate": "2-5% potential upside on grain futures",
            "regions_at_risk": ["Ukraine", "US Midwest"],
            "historical_comparison": "Conditions similar to mild 2019 growing-season stress",
            "key_risks": ["Drought risk in Black Sea region", "Late-season frost in North America"],
            "timeline": "medium-term",
            "error": str(e),
        }
        return fallback


async def get_alternative_signals() -> dict:
    """
    Returns aggregated alternative data signals combining weather, shipping,
    and commodity stress indicators.

    Returns:
        {
            signals: [{category, signal, direction: "bullish|bearish|neutral",
                       confidence, affected_assets: [...]}],
            overall_market_tone: str
        }
    """
    cache_key = "alt_signals"
    cached = _cached(cache_key, 600)
    if cached:
        return cached

    # Gather sub-signals concurrently
    try:
        weather_data, crop_data = await asyncio.gather(
            get_weather_market_signals(),
            get_crop_stress_signals(),
            return_exceptions=True,
        )
    except Exception:
        weather_data, crop_data = {}, {}

    if isinstance(weather_data, Exception):
        weather_data = {}
    if isinstance(crop_data, Exception):
        crop_data = {}

    weather_signal = weather_data.get("overall_signal", "Unavailable")
    crop_stress = crop_data.get("stress_level", "moderate")
    affected_crops = crop_data.get("affected_crops", [])
    regions_at_risk = crop_data.get("regions_at_risk", [])
    high_impact_count = len(weather_data.get("high_impact_events", []))

    # Map crop stress to direction
    stress_direction_map = {
        "low":      ("neutral",  0.55),
        "moderate": ("bearish",  0.60),
        "high":     ("bearish",  0.75),
        "critical": ("bearish",  0.90),
    }
    crop_direction, crop_confidence = stress_direction_map.get(crop_stress, ("neutral", 0.5))

    signals = [
        {
            "category": "Weather / Climate",
            "signal": weather_signal,
            "direction": "bearish" if high_impact_count >= 2 else ("bullish" if high_impact_count == 0 else "neutral"),
            "confidence": round(min(0.5 + high_impact_count * 0.1, 0.9), 2),
            "affected_assets": ["Wheat Futures", "Corn Futures", "Soybean Futures", "Agricultural ETFs"],
        },
        {
            "category": "Crop Stress Index",
            "signal": f"Crop stress level: {crop_stress}. Affected: {', '.join(affected_crops) if affected_crops else 'N/A'}",
            "direction": crop_direction,
            "confidence": crop_confidence,
            "affected_assets": [f"{c} Futures" for c in affected_crops] + ["MOO", "WEAT", "CORN"],
        },
        {
            "category": "Agricultural Supply Risk",
            "signal": f"{len(regions_at_risk)} growing region(s) flagged at elevated risk: {', '.join(regions_at_risk) if regions_at_risk else 'none'}",
            "direction": "bearish" if len(regions_at_risk) >= 2 else ("neutral" if len(regions_at_risk) == 1 else "bullish"),
            "confidence": round(0.5 + len(regions_at_risk) * 0.08, 2),
            "affected_assets": ["Global Food ETFs", "Fertiliser stocks", "Grain Shipping (BWTS)"],
        },
    ]

    # Ask Gemini to enrich with shipping / macro alt signals
    try:
        extra = await ask_json(f"""
You are an alternative data analyst. Add 2-3 additional non-weather alternative
data signals relevant to current global markets (e.g. shipping rates, satellite
cargo tracking, electricity consumption, port congestion).

Each signal must follow this format:
{{
  "category": str,
  "signal": str,
  "direction": "bullish|bearish|neutral",
  "confidence": <0.0-1.0>,
  "affected_assets": [str]
}}

Return JSON array of 2-3 signal objects only (no wrapper key).
""")
        if isinstance(extra, list):
            signals.extend(extra)
        elif isinstance(extra, dict) and "signals" in extra:
            signals.extend(extra["signals"])
    except Exception:
        pass  # Keep existing signals without enrichment

    # Overall tone
    bearish_sigs = sum(1 for s in signals if s.get("direction") == "bearish")
    bullish_sigs = sum(1 for s in signals if s.get("direction") == "bullish")
    if bearish_sigs > bullish_sigs:
        overall_tone = "Cautious / Risk-off – multiple alternative data signals point to commodity supply headwinds"
    elif bullish_sigs > bearish_sigs:
        overall_tone = "Constructive – alternative data signals suggest improving supply conditions"
    else:
        overall_tone = "Mixed – alternative signals are broadly balanced; no strong directional bias"

    result = {
        "signals": signals,
        "overall_market_tone": overall_tone,
        "_sources": ["openweather_api", "gemini_ai"],
    }
    _set_cache(cache_key, result)
    return result
