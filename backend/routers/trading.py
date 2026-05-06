"""
Trading Router — Alpaca Paper/Live Trading endpoints
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.trading import (
    get_account, get_positions, get_orders, place_order,
    cancel_order, close_position, get_quote, get_bars,
    get_options_chain, get_ai_trade_signal, get_pnl_summary,
)

router = APIRouter()


# ── Request models ─────────────────────────────────────────────────────────────

class OrderRequest(BaseModel):
    symbol: str
    qty: float
    side: str                   # "buy" | "sell"
    order_type: str = "market"  # "market" | "limit"
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "day"  # "day" | "gtc"

class SignalRequest(BaseModel):
    symbol: str
    context: str = ""


# ── Account ───────────────────────────────────────────────────────────────────

@router.get("/account")
async def trading_account():
    try:
        return {"success": True, "data": await get_account()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/pnl")
async def pnl_summary():
    try:
        return {"success": True, "data": await get_pnl_summary()}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Positions ─────────────────────────────────────────────────────────────────

@router.get("/positions")
async def positions():
    try:
        return {"success": True, "data": await get_positions()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.delete("/positions/{symbol}")
async def close_pos(symbol: str):
    try:
        return {"success": True, "data": await close_position(symbol.upper())}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Orders ────────────────────────────────────────────────────────────────────

@router.get("/orders")
async def orders(status: str = "all", limit: int = 20):
    try:
        return {"success": True, "data": await get_orders(status, limit)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/orders")
async def submit_order(req: OrderRequest):
    try:
        result = await place_order(
            symbol=req.symbol.upper(),
            qty=req.qty,
            side=req.side,
            order_type=req.order_type,
            limit_price=req.limit_price,
            stop_price=req.stop_price,
            time_in_force=req.time_in_force,
        )
        return {"success": result.get("success", False), "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.delete("/orders/{order_id}")
async def cancel_ord(order_id: str):
    try:
        return {"success": True, "data": await cancel_order(order_id)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Market Data ───────────────────────────────────────────────────────────────

@router.get("/quote/{symbol}")
async def quote(symbol: str):
    try:
        return {"success": True, "data": await get_quote(symbol.upper())}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/bars/{symbol}")
async def bars(symbol: str, timeframe: str = "1Day", limit: int = 30):
    try:
        return {"success": True, "data": await get_bars(symbol.upper(), timeframe, limit)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Options Chain ─────────────────────────────────────────────────────────────

@router.get("/options/{symbol}")
async def options_chain(symbol: str, expiry: Optional[str] = None):
    try:
        return {"success": True, "data": await get_options_chain(symbol.upper(), expiry)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── AI Trade Signal ───────────────────────────────────────────────────────────

@router.post("/signal")
async def ai_signal(req: SignalRequest):
    try:
        return {"success": True, "data": await get_ai_trade_signal(req.symbol.upper(), req.context)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/signal/{symbol}")
async def ai_signal_get(symbol: str):
    try:
        return {"success": True, "data": await get_ai_trade_signal(symbol.upper())}
    except Exception as e:
        return {"success": False, "error": str(e)}
