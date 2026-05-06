"""
On-Chain Crypto Intelligence
Whale movements, exchange flows, DeFi data — all free APIs
"""
import httpx
from core.gemini import ask_json


async def get_bitcoin_onchain() -> dict:
    data = {}
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            # Blockchain.info — free, no key
            r = await client.get("https://blockchain.info/stats?format=json")
            stats = r.json()
            data["bitcoin"] = {
                "total_transactions_24h": stats.get("n_tx", 0),
                "total_sent_24h_btc": round(stats.get("total_btc_sent", 0) / 1e8, 2),
                "mempool_size": stats.get("mempool_size", 0),
                "hash_rate": stats.get("hash_rate", 0),
                "difficulty": stats.get("difficulty", 0),
            }
        except Exception:
            data["bitcoin"] = {"error": "Blockchain.info unavailable"}
        
        try:
            # CoinGecko exchange flows — free
            r = await client.get("https://api.coingecko.com/api/v3/exchanges?per_page=5")
            exchanges = r.json()
            data["top_exchanges"] = [{"name": e["name"], "volume_24h": e.get("trade_volume_24h_btc", 0)} for e in exchanges[:5]]
        except Exception:
            data["top_exchanges"] = []
    
    # AI interpretation
    interpretation = await ask_json(f"""On-chain Bitcoin data: {data}
What does this tell us about market conditions and whale behavior?
Return JSON:
{{
  "network_health": "weak/fair/strong/very_strong",
  "whale_activity": str,
  "exchange_flow": "inflow/neutral/outflow",
  "inflow_signal": "bearish/neutral/bullish",
  "miner_behavior": str,
  "key_insight": str
}}""", fast=True)
    
    return {**data, "interpretation": interpretation}


async def get_defi_overview() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            # DeFiLlama — completely free, no key
            r = await client.get("https://api.llama.fi/protocols")
            protocols = r.json()[:10]
            total_r = await client.get("https://api.llama.fi/v2/historicalChainTvl")
            tvl_history = total_r.json()[-30:]
            
            return {
                "top_protocols": [{"name": p.get("name"), "tvl": p.get("tvl", 0), "chain": p.get("chain", "")} for p in protocols],
                "tvl_trend": [{"date": t.get("date"), "tvl": t.get("tvl", 0)} for t in tvl_history[-7:]],
                "source": "DeFiLlama (free)"
            }
        except Exception:
            return {"error": "DeFi data unavailable", "top_protocols": [], "tvl_trend": []}
