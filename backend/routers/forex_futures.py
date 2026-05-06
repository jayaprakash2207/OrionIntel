"""
Forex & Futures Router
"""
from fastapi import APIRouter
from typing import Optional
from services.forex import get_forex_rates, get_forex_pair, get_forex_history, get_forex_analysis
from services.futures import get_all_futures, get_futures_by_category, get_futures_history, get_futures_analysis

router = APIRouter()


# ── Forex ──────────────────────────────────────────────────────────────────────

@router.get("/forex/rates")
async def forex_rates():
    try:
        return {"success": True, "data": await get_forex_rates()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/forex/pair/{pair}")
async def forex_pair(pair: str):
    try:
        # pair like EUR-USD → EUR/USD
        normalized = pair.replace("-", "/").upper()
        return {"success": True, "data": await get_forex_pair(normalized)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/forex/history/{pair}")
async def forex_history(pair: str, period: str = "1mo"):
    try:
        normalized = pair.replace("-", "/").upper()
        return {"success": True, "data": await get_forex_history(normalized, period)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/forex/analysis/{pair}")
async def forex_analysis(pair: str):
    try:
        normalized = pair.replace("-", "/").upper()
        return {"success": True, "data": await get_forex_analysis(normalized)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Futures ────────────────────────────────────────────────────────────────────

@router.get("/futures")
async def all_futures():
    try:
        return {"success": True, "data": await get_all_futures()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/futures/category/{category}")
async def futures_by_category(category: str):
    """Categories: index, energy, metals, agriculture, bonds, currency"""
    try:
        return {"success": True, "data": await get_futures_by_category(category)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/futures/history/{symbol}")
async def futures_history(symbol: str, period: str = "1mo"):
    try:
        return {"success": True, "data": await get_futures_history(symbol, period)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/futures/analysis/{category}")
async def futures_ai_analysis(category: str):
    try:
        return {"success": True, "data": await get_futures_analysis(category)}
    except Exception as e:
        return {"success": False, "error": str(e)}
