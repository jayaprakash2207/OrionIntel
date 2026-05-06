"""
India Market Context Service
Fetches FII/DII data, GIFT Nifty, market breadth, and PCR for Indian symbols.
Used to enrich chart analysis predictions with real market context.
"""
import httpx
import asyncio
import re
import time
from datetime import datetime

_cache: dict = {}
CACHE_TTL = 600  # 10 minutes


_NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.nseindia.com/",
    "Origin": "https://www.nseindia.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}


async def _nse_get(client: httpx.AsyncClient, url: str):
    """Hit NSE homepage + market data page first, then the API URL."""
    await client.get("https://www.nseindia.com", timeout=8)
    await asyncio.sleep(0.4)
    await client.get("https://www.nseindia.com/market-data/live-equity-market", timeout=8)
    await asyncio.sleep(0.3)
    return await client.get(url, timeout=10)


async def get_fii_dii() -> dict:
    """Fetch latest FII/DII buy/sell data from NSE."""
    cache_key = "fii_dii"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < CACHE_TTL:
        return cached[0]

    try:
        async with httpx.AsyncClient(timeout=15, headers=_NSE_HEADERS, follow_redirects=True) as client:
            r = await _nse_get(client, "https://www.nseindia.com/api/fiidiiTradeReact")
            data = r.json()

            if isinstance(data, list) and data:
                latest = data[0]
                result = {
                    "date": latest.get("date", ""),
                    "fii_net": float(latest.get("netPurchaseSales_FII", 0) or 0),
                    "dii_net": float(latest.get("netPurchaseSales_DII", 0) or 0),
                    "fii_buy": float(latest.get("buyValue_FII", 0) or 0),
                    "fii_sell": float(latest.get("sellValue_FII", 0) or 0),
                    "dii_buy": float(latest.get("buyValue_DII", 0) or 0),
                    "dii_sell": float(latest.get("sellValue_DII", 0) or 0),
                    "fii_sentiment": "buying" if float(latest.get("netPurchaseSales_FII", 0) or 0) > 0 else "selling",
                    "dii_sentiment": "buying" if float(latest.get("netPurchaseSales_DII", 0) or 0) > 0 else "selling",
                    "source": "NSE",
                }
                _cache[cache_key] = (result, time.time())
                return result
    except Exception:
        pass

    # Fallback: unavailable
    return {"error": "FII/DII data unavailable", "source": "none"}


async def get_gift_nifty() -> dict:
    """Fetch GIFT Nifty (formerly SGX Nifty) — indicator of next-day opening."""
    cache_key = "gift_nifty"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 60:  # 1 min cache for live data
        return cached[0]

    async with httpx.AsyncClient(timeout=15, headers=_NSE_HEADERS, follow_redirects=True) as client:
        try:
            page = await client.get("https://www.nseindia.com/market-data/live-equity-market", timeout=12)
            if page.status_code == 200:
                match = re.search(r'"giftnifty":(\{.*?\}),"ejsHelpers"', page.text, re.S)
                if match:
                    gift = httpx.Response(200, content=match.group(1)).json()
                    if isinstance(gift, dict) and gift.get("LASTPRICE") is not None:
                        ts_raw = (gift.get("TIMESTMP") or "").strip()
                        ts_iso = ""
                        if ts_raw:
                            try:
                                ts_iso = datetime.strptime(ts_raw, "%d-%b-%Y %H:%M").isoformat()
                            except Exception:
                                ts_iso = ts_raw

                        data = {
                            "ltp": round(float(gift.get("LASTPRICE") or 0), 2),
                            "change": round(float(gift.get("DAYCHANGE") or 0), 2),
                            "change_pct": round(float(gift.get("PERCHANGE") or 0), 2),
                            "high": None,
                            "low": None,
                            "expiry": gift.get("EXPIRYDATE", ""),
                            "timestamp": ts_iso,
                            "source": "NSE live-equity-market HTML",
                            "note": "Live GIFT Nifty embedded on NSE market page",
                            "is_estimated": False,
                        }
                        _cache[cache_key] = (data, time.time())
                        return data
        except Exception:
            pass

        try:
            r = await _nse_get(client, "https://www.nseindia.com/api/marketStatus")
            payload = r.json() if r.status_code == 200 else {}
            gift = payload.get("giftnifty") if isinstance(payload, dict) else None

            if isinstance(gift, dict) and gift.get("LASTPRICE") is not None:
                ltp = float(gift.get("LASTPRICE") or 0)
                change = float(gift.get("DAYCHANGE") or 0)
                change_pct = float(gift.get("PERCHANGE") or 0)
                ts_raw = (gift.get("TIMESTMP") or "").strip()
                ts_iso = ""
                if ts_raw:
                    try:
                        ts_iso = datetime.strptime(ts_raw, "%d-%b-%Y %H:%M").isoformat()
                    except Exception:
                        ts_iso = ts_raw

                data = {
                    "ltp": round(ltp, 2),
                    "change": round(change, 2),
                    "change_pct": round(change_pct, 2),
                    "high": None,
                    "low": None,
                    "expiry": gift.get("EXPIRYDATE", ""),
                    "timestamp": ts_iso,
                    "source": "NSE marketStatus.giftnifty",
                    "note": "Live GIFT Nifty futures from NSE",
                    "is_estimated": False,
                }
                _cache[cache_key] = (data, time.time())
                return data
        except Exception:
            pass

    return {"error": "GIFT Nifty unavailable"}


async def get_nifty_pcr() -> dict:
    """Fetch Nifty Put-Call Ratio from NSE options data."""
    cache_key = "nifty_pcr"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < CACHE_TTL:
        return cached[0]

    try:
        from concurrent.futures import ThreadPoolExecutor
        import asyncio as _aio

        def _fetch_sync():
            from nsepython import nse_optionchain_scrapper
            return nse_optionchain_scrapper("NIFTY")

        loop = _aio.get_event_loop()
        with ThreadPoolExecutor(max_workers=1) as ex:
            data = await loop.run_in_executor(ex, _fetch_sync)

        if not data or "records" not in data:
            raise ValueError("empty response")

        total = data.get("records", {}).get("data", [])
        total_ce_oi = sum(d.get("CE", {}).get("openInterest", 0) or 0 for d in total if "CE" in d)
        total_pe_oi = sum(d.get("PE", {}).get("openInterest", 0) or 0 for d in total if "PE" in d)

        pcr = round(total_pe_oi / total_ce_oi, 2) if total_ce_oi else 0
        sentiment = (
            "very_bullish" if pcr > 1.5 else
            "bullish" if pcr > 1.2 else
            "neutral" if pcr > 0.8 else
            "bearish" if pcr > 0.5 else
            "very_bearish"
        )
        result = {
            "pcr": pcr,
            "sentiment": sentiment,
            "pe_oi": total_pe_oi,
            "ce_oi": total_ce_oi,
            "interpretation": f"PCR {pcr} — {sentiment.replace('_', ' ').title()}",
            "source": "NSE",
        }
        _cache[cache_key] = (result, time.time())
        return result
    except Exception:
        pass

    return {"error": "PCR data unavailable"}


async def get_india_market_context(symbol: str) -> str:
    """
    Returns a formatted string with FII/DII + PCR + GIFT Nifty context.
    Only meaningful for Indian index symbols.
    """
    indian_symbols = {"^NSEI", "^NSEBANK", "^BSESN", "^CNXIT", "^CNXAUTO",
                      "^CNXPHARMA", "^CNXFMCG", "^CNXMETAL", "^CNXREALTY"}

    is_indian = symbol in indian_symbols or symbol.endswith(".NS")
    if not is_indian:
        return ""

    # Fetch all in parallel
    fii_task = asyncio.create_task(get_fii_dii())
    pcr_task = asyncio.create_task(get_nifty_pcr())

    fii = await fii_task
    pcr = await pcr_task

    lines = ["\nIndia Market Context (live):"]

    if "error" not in fii:
        fii_sign = "+" if fii["fii_net"] > 0 else ""
        dii_sign = "+" if fii["dii_net"] > 0 else ""
        lines.append(
            f"  FII: {fii_sign}{fii['fii_net']:,.0f} Cr ({fii['fii_sentiment'].upper()})  |  "
            f"DII: {dii_sign}{fii['dii_net']:,.0f} Cr ({fii['dii_sentiment'].upper()})"
        )
        if fii["fii_net"] < -1000:
            lines.append("  WARNING: Heavy FII selling — strong bearish signal for market")
        elif fii["fii_net"] > 1000:
            lines.append("  NOTE: Strong FII buying — bullish support for market")

    if "error" not in pcr:
        lines.append(f"  Nifty PCR: {pcr['pcr']} — {pcr['interpretation']}")

    return "\n".join(lines) if len(lines) > 1 else ""
