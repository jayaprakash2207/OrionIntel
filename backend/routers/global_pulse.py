"""
Global Morning Pulse Router
"""
from fastapi import APIRouter
from services.global_pulse import get_morning_pulse, get_european_pulse, get_golden_day_analysis, get_india_day_prediction

router = APIRouter()


@router.get("/morning")
async def morning_pulse():
    try:
        return {"success": True, "data": await get_morning_pulse()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/european")
async def european_pulse():
    try:
        return {"success": True, "data": await get_european_pulse()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/golden-day")
async def golden_day():
    try:
        return {"success": True, "data": await get_golden_day_analysis()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/india-today")
async def india_today():
    try:
        return {"success": True, "data": await get_india_day_prediction()}
    except Exception as e:
        return {"success": False, "error": str(e)}
