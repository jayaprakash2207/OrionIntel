"""
Shipping Port & Supply Chain Intelligence Service
Monitors global port congestion, shipping routes, trade flows.
Uses free APIs: MarineTraffic (free tier), UN Comtrade, fallback to AI analysis.
"""
import time
import httpx
from core.config import settings
from core.gemini import ask_json

_cache: dict = {}

# Major ports and their commodity significance
MAJOR_PORTS = [
    {"port": "Shanghai", "country": "China", "commodities": ["electronics", "steel", "manufactured goods"], "lat": 31.23, "lon": 121.47},
    {"port": "Singapore", "country": "Singapore", "commodities": ["oil", "LNG", "electronics"], "lat": 1.26, "lon": 103.82},
    {"port": "Rotterdam", "country": "Netherlands", "commodities": ["oil", "chemicals", "agriculture"], "lat": 51.92, "lon": 4.48},
    {"port": "Los Angeles", "country": "USA", "commodities": ["consumer goods", "electronics", "retail"], "lat": 33.74, "lon": -118.27},
    {"port": "Dubai (Jebel Ali)", "country": "UAE", "commodities": ["oil", "re-exports", "gold"], "lat": 24.97, "lon": 55.06},
    {"port": "Busan", "country": "South Korea", "commodities": ["electronics", "automobiles", "steel"], "lat": 35.10, "lon": 129.04},
    {"port": "Hong Kong", "country": "China", "commodities": ["electronics", "finance goods", "re-exports"], "lat": 22.30, "lon": 114.17},
    {"port": "Antwerp", "country": "Belgium", "commodities": ["chemicals", "cars", "agriculture"], "lat": 51.23, "lon": 4.40},
    {"port": "Hamburg", "country": "Germany", "commodities": ["machinery", "chemicals", "food"], "lat": 53.55, "lon": 9.99},
    {"port": "Ningbo-Zhoushan", "country": "China", "commodities": ["iron ore", "crude oil", "coal"], "lat": 29.87, "lon": 121.55},
    {"port": "Colombo", "country": "Sri Lanka", "commodities": ["transshipment", "textiles", "tea"], "lat": 6.93, "lon": 79.84},
    {"port": "Suez Canal", "country": "Egypt", "commodities": ["oil", "LNG", "global trade chokepoint"], "lat": 30.58, "lon": 32.26},
    {"port": "Panama Canal", "country": "Panama", "commodities": ["grain", "oil", "LNG", "containers"], "lat": 9.08, "lon": -79.68},
    {"port": "Strait of Hormuz", "country": "Iran/Oman", "commodities": ["oil", "LNG", "20% global oil supply"], "lat": 26.56, "lon": 56.25},
]

SHIPPING_ROUTES = [
    {"route": "Asia-Europe", "via": "Suez Canal", "goods": "manufactured goods, oil", "risk_region": "Red Sea"},
    {"route": "Trans-Pacific", "via": "Pacific Ocean", "goods": "consumer electronics, retail", "risk_region": "South China Sea"},
    {"route": "Trans-Atlantic", "via": "Atlantic Ocean", "goods": "energy, food, machinery", "risk_region": "Low"},
    {"route": "Middle East-Asia", "via": "Strait of Hormuz", "goods": "crude oil, LNG", "risk_region": "Persian Gulf"},
    {"route": "Americas", "via": "Panama Canal", "goods": "grain, LNG, containers", "risk_region": "Low"},
]


async def get_port_congestion_analysis() -> dict:
    """AI-powered analysis of current global port congestion and supply chain risks."""
    cache_key = "port_congestion"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 1800:
        return cached[0]

    ports_info = "\n".join([
        f"- {p['port']} ({p['country']}): handles {', '.join(p['commodities'])}"
        for p in MAJOR_PORTS
    ])
    routes_info = "\n".join([
        f"- {r['route']} via {r['via']}: {r['goods']} | Risk: {r['risk_region']}"
        for r in SHIPPING_ROUTES
    ])

    result = await ask_json(f"""You are a global supply chain intelligence analyst.

Major ports monitored:
{ports_info}

Key shipping routes:
{routes_info}

Based on your current knowledge, assess:
1. Which ports have congestion or disruption issues right now?
2. Which shipping routes face the highest risk?
3. What commodities are most at risk?
4. What market opportunities exist from supply chain disruptions?

Return JSON:
{{
  "overall_supply_chain_risk": int (0-100),
  "risk_level": "low/medium/high/critical",
  "hot_spots": [
    {{
      "location": str,
      "issue": str,
      "severity": "low/medium/high/critical",
      "commodities_affected": [str],
      "market_impact": str,
      "duration_estimate": str
    }}
  ],
  "route_risks": [
    {{
      "route": str,
      "risk_score": int,
      "reason": str,
      "affected_goods": [str]
    }}
  ],
  "commodity_alerts": [
    {{
      "commodity": str,
      "supply_risk": "low/medium/high",
      "price_direction": "up/down/neutral",
      "reason": str
    }}
  ],
  "trading_opportunities": [
    {{
      "trade": str,
      "rationale": str,
      "timeframe": str
    }}
  ],
  "chokepoint_status": {{
    "suez_canal": str,
    "strait_of_hormuz": str,
    "panama_canal": str,
    "south_china_sea": str
  }}
}}""")

    outcome = result if isinstance(result, dict) else {}
    outcome["ports_monitored"] = len(MAJOR_PORTS)
    outcome["routes_monitored"] = len(SHIPPING_ROUTES)
    _cache[cache_key] = (outcome, time.time())
    return outcome


async def get_trade_flow_analysis(country1: str, country2: str = "Global") -> dict:
    """Analyze trade flows between two countries/regions."""
    cache_key = f"trade_{country1}_{country2}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 3600:
        return cached[0]

    result = await ask_json(f"""Analyze trade flows between {country1} and {country2}.

Return JSON:
{{
  "country1": "{country1}",
  "country2": "{country2}",
  "trade_volume_estimate": str,
  "top_exports_from_{country1.replace(' ', '_')}": [str],
  "top_imports_to_{country1.replace(' ', '_')}": [str],
  "trade_balance": "surplus/deficit/balanced",
  "key_dependencies": [str],
  "vulnerabilities": [str],
  "recent_developments": str,
  "tariff_situation": str,
  "market_implications": [
    {{"asset": str, "impact": str, "direction": str}}
  ],
  "risk_score": int (0-100)
}}""")

    outcome = result if isinstance(result, dict) else {}
    _cache[cache_key] = (outcome, time.time())
    return outcome


async def get_commodity_supply_chain(commodity: str) -> dict:
    """Full supply chain map for a specific commodity."""
    cache_key = f"supplychain_{commodity.lower()}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 3600:
        return cached[0]

    result = await ask_json(f"""Map the complete global supply chain for: {commodity}

Return JSON:
{{
  "commodity": "{commodity}",
  "top_producers": [
    {{"country": str, "share_pct": float, "key_region": str}}
  ],
  "top_consumers": [str],
  "key_shipping_routes": [str],
  "chokepoints": [str],
  "price_drivers": [str],
  "disruption_risks": [
    {{"risk": str, "probability": "low/medium/high", "price_impact": str}}
  ],
  "current_supply_status": "oversupply/balanced/undersupply",
  "price_outlook_90d": str,
  "related_assets": [str],
  "strategic_reserves": str
}}""")

    outcome = result if isinstance(result, dict) else {}
    _cache[cache_key] = (outcome, time.time())
    return outcome
