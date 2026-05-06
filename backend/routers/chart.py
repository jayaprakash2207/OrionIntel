"""
Chart Router — OHLCV data + AI candlestick analysis
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.chart_data import get_chart_data, get_watchlist_quotes, WATCHLIST
from services.chart_analysis import analyze_candle_click, analyze_candle_range, get_market_summary, analyze_live_bar, run_chart_backtest

router = APIRouter()


class CandleClickRequest(BaseModel):
    symbol: str
    clicked_candle: dict
    context_bars: list = []
    all_bars: list = []


class CandleRangeRequest(BaseModel):
    symbol: str
    candle_a: dict
    candle_b: dict
    bars_between: list = []
    context_bars: list = []
    all_bars: list = []


class LiveBarRequest(BaseModel):
    symbol: str
    last_bar: dict
    all_bars: list


class MarketSummaryRequest(BaseModel):
    symbol: str
    bars: list


# ── Chart Data ────────────────────────────────────────────────────────────────

@router.get("/data/{symbol}")
async def chart_data(symbol: str, period: str = "3mo", interval: str = "1d"):
    try:
        return {"success": True, "data": await get_chart_data(symbol, period, interval)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/watchlist")
async def watchlist():
    return {"success": True, "data": WATCHLIST}


@router.post("/watchlist/quotes")
async def watchlist_quotes(body: dict):
    try:
        symbols = body.get("symbols", [])
        return {"success": True, "data": await get_watchlist_quotes(symbols)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── AI Analysis ───────────────────────────────────────────────────────────────

@router.post("/analyze/click")
async def analyze_click(req: CandleClickRequest):
    try:
        result = await analyze_candle_click(
            req.symbol,
            req.clicked_candle,
            req.context_bars,
            req.all_bars,
        )
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/analyze/range")
async def analyze_range(req: CandleRangeRequest):
    try:
        result = await analyze_candle_range(
            req.symbol,
            req.candle_a,
            req.candle_b,
            req.bars_between,
            req.context_bars,
            req.all_bars,
        )
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/analyze/live")
async def live_bar_analysis(req: LiveBarRequest):
    try:
        result = await analyze_live_bar(req.symbol, req.last_bar, req.all_bars)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/analyze/summary")
async def market_summary(req: MarketSummaryRequest):
    try:
        result = await get_market_summary(req.symbol, req.bars)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Backtest ──────────────────────────────────────────────────────────────────

@router.get("/backtest/{symbol}")
async def chart_backtest(symbol: str, interval: str = "1d", candles: int = 50):
    """
    Run automated backtest on last N candles for a symbol.
    Tests prediction accuracy and logs results to Supabase.
    """
    try:
        result = await run_chart_backtest(symbol, interval, candles)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
