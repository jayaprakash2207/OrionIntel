from fastapi import APIRouter
from services import market as market_svc

router = APIRouter()


@router.get("/overview")
async def market_overview():
    try:
        return {"success": True, "data": await market_svc.get_overview()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/crypto")
async def crypto():
    try:
        return {"success": True, "data": await market_svc.get_crypto()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/commodities")
async def commodities():
    try:
        return {"success": True, "data": await market_svc.get_commodities()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/fear-greed")
async def fear_greed():
    try:
        return {"success": True, "data": await market_svc.get_fear_greed()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/macro")
async def macro():
    from services.fred import get_key_indicators
    try:
        return {"success": True, "data": await get_key_indicators()}
    except Exception as e:
        return {"success": False, "error": str(e)}
