"""
Trading Engine — Alpaca Paper/Live Trading
Handles: account info, positions, orders, watchlist,
         options chain, AI trade signals, P&L tracking
"""
import time
import asyncio
import httpx
from core.config import settings
from core.gemini import ask_json

_cache: dict = {}

# ── Alpaca client ─────────────────────────────────────────────────────────────
def _trading_client():
    from alpaca.trading.client import TradingClient
    is_paper = "paper" in settings.ALPACA_BASE_URL
    return TradingClient(settings.ALPACA_API_KEY, settings.ALPACA_SECRET_KEY, paper=is_paper)

def _data_client():
    from alpaca.data.historical import StockHistoricalDataClient
    return StockHistoricalDataClient(settings.ALPACA_API_KEY, settings.ALPACA_SECRET_KEY)

def _is_paper():
    return "paper" in settings.ALPACA_BASE_URL


# ── Account ───────────────────────────────────────────────────────────────────

async def get_account() -> dict:
    try:
        client = _trading_client()
        acc = client.get_account()
        return {
            "status": str(acc.status),
            "buying_power": float(acc.buying_power),
            "portfolio_value": float(acc.portfolio_value),
            "cash": float(acc.cash),
            "equity": float(acc.equity),
            "currency": acc.currency,
            "pattern_day_trader": acc.pattern_day_trader,
            "trading_blocked": acc.trading_blocked,
            "is_paper": _is_paper(),
            "day_trade_count": acc.daytrade_count,
        }
    except Exception as e:
        return {"error": str(e)}


# ── Positions ─────────────────────────────────────────────────────────────────

async def get_positions() -> list:
    try:
        client = _trading_client()
        positions = client.get_all_positions()
        return [
            {
                "symbol": p.symbol,
                "qty": float(p.qty),
                "side": str(p.side),
                "avg_entry_price": float(p.avg_entry_price),
                "current_price": float(p.current_price) if p.current_price else 0,
                "market_value": float(p.market_value) if p.market_value else 0,
                "unrealized_pl": float(p.unrealized_pl) if p.unrealized_pl else 0,
                "unrealized_plpc": float(p.unrealized_plpc) if p.unrealized_plpc else 0,
                "change_today": float(p.change_today) if p.change_today else 0,
            }
            for p in positions
        ]
    except Exception as e:
        return []


# ── Orders ────────────────────────────────────────────────────────────────────

async def get_orders(status: str = "all", limit: int = 20) -> list:
    try:
        from alpaca.trading.requests import GetOrdersRequest
        from alpaca.trading.enums import QueryOrderStatus
        client = _trading_client()
        status_map = {
            "open": QueryOrderStatus.OPEN,
            "closed": QueryOrderStatus.CLOSED,
            "all": QueryOrderStatus.ALL,
        }
        req = GetOrdersRequest(status=status_map.get(status, QueryOrderStatus.ALL), limit=limit)
        orders = client.get_orders(req)
        return [
            {
                "id": str(o.id),
                "symbol": o.symbol,
                "qty": float(o.qty) if o.qty else 0,
                "side": str(o.side),
                "type": str(o.order_type),
                "status": str(o.status),
                "filled_avg_price": float(o.filled_avg_price) if o.filled_avg_price else None,
                "limit_price": float(o.limit_price) if o.limit_price else None,
                "stop_price": float(o.stop_price) if o.stop_price else None,
                "created_at": str(o.created_at),
                "filled_at": str(o.filled_at) if o.filled_at else None,
            }
            for o in orders
        ]
    except Exception as e:
        return []


# ── Place Order ───────────────────────────────────────────────────────────────

async def place_order(
    symbol: str,
    qty: float,
    side: str,
    order_type: str = "market",
    limit_price: float = None,
    stop_price: float = None,
    time_in_force: str = "day",
) -> dict:
    try:
        from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest, StopLimitOrderRequest
        from alpaca.trading.enums import OrderSide, TimeInForce

        client = _trading_client()
        side_enum = OrderSide.BUY if side.lower() == "buy" else OrderSide.SELL
        tif = TimeInForce.DAY if time_in_force == "day" else TimeInForce.GTC

        if order_type == "market":
            req = MarketOrderRequest(symbol=symbol, qty=qty, side=side_enum, time_in_force=tif)
        elif order_type == "limit" and limit_price:
            req = LimitOrderRequest(symbol=symbol, qty=qty, side=side_enum, time_in_force=tif, limit_price=limit_price)
        else:
            return {"success": False, "error": "Invalid order type or missing price"}

        order = client.submit_order(req)
        return {
            "success": True,
            "order_id": str(order.id),
            "symbol": order.symbol,
            "qty": float(order.qty),
            "side": str(order.side),
            "status": str(order.status),
            "type": str(order.order_type),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def cancel_order(order_id: str) -> dict:
    try:
        client = _trading_client()
        client.cancel_order_by_id(order_id)
        return {"success": True, "cancelled": order_id}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def close_position(symbol: str) -> dict:
    try:
        client = _trading_client()
        result = client.close_position(symbol)
        return {"success": True, "symbol": symbol, "order_id": str(result.id)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Live Quote ────────────────────────────────────────────────────────────────

async def get_quote(symbol: str) -> dict:
    cache_key = f"quote_{symbol}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 15:
        return cached[0]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://data.alpaca.markets/v2/stocks/{symbol}/quotes/latest",
                headers={
                    "APCA-API-KEY-ID": settings.ALPACA_API_KEY,
                    "APCA-API-SECRET-KEY": settings.ALPACA_SECRET_KEY,
                },
            )
            q = r.json().get("quote", {})
            result = {
                "symbol": symbol,
                "ask": q.get("ap", 0),
                "bid": q.get("bp", 0),
                "mid": round((q.get("ap", 0) + q.get("bp", 0)) / 2, 2),
                "timestamp": q.get("t", ""),
            }
            _cache[cache_key] = (result, time.time())
            return result
    except Exception as e:
        return {"symbol": symbol, "error": str(e)}


async def get_bars(symbol: str, timeframe: str = "1Day", limit: int = 30) -> list:
    """Get historical OHLCV bars for a symbol."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://data.alpaca.markets/v2/stocks/{symbol}/bars",
                params={"timeframe": timeframe, "limit": limit, "feed": "iex"},
                headers={
                    "APCA-API-KEY-ID": settings.ALPACA_API_KEY,
                    "APCA-API-SECRET-KEY": settings.ALPACA_SECRET_KEY,
                },
            )
            bars = r.json().get("bars", [])
            return [
                {
                    "time": b.get("t", ""),
                    "open": b.get("o", 0),
                    "high": b.get("h", 0),
                    "low": b.get("l", 0),
                    "close": b.get("c", 0),
                    "volume": b.get("v", 0),
                }
                for b in bars
            ]
    except Exception as e:
        return []


# ── Options Chain ─────────────────────────────────────────────────────────────

async def get_options_chain(symbol: str, expiry: str = None) -> dict:
    """Get options chain via Alpaca (calls + puts with Greeks)."""
    cache_key = f"options_{symbol}_{expiry}"
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[1] < 60:
        return cached[0]
    try:
        params = {"underlying_symbols": symbol, "feed": "indicative", "limit": 100}
        if expiry:
            params["expiration_date"] = expiry
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://data.alpaca.markets/v1beta1/options/snapshots",
                params=params,
                headers={
                    "APCA-API-KEY-ID": settings.ALPACA_API_KEY,
                    "APCA-API-SECRET-KEY": settings.ALPACA_SECRET_KEY,
                },
            )
            data = r.json()
            snapshots = data.get("snapshots", {})

            calls, puts = [], []
            for contract_id, snap in snapshots.items():
                greeks = snap.get("greeks", {})
                quote = snap.get("latestQuote", {})
                details = snap.get("details", {})
                contract = {
                    "contract": contract_id,
                    "strike": details.get("strike_price", 0),
                    "expiry": details.get("expiration_date", ""),
                    "type": details.get("option_type", ""),
                    "bid": quote.get("bp", 0),
                    "ask": quote.get("ap", 0),
                    "mid": round((quote.get("bp", 0) + quote.get("ap", 0)) / 2, 2),
                    "iv": snap.get("impliedVolatility", 0),
                    "delta": greeks.get("delta", 0),
                    "gamma": greeks.get("gamma", 0),
                    "theta": greeks.get("theta", 0),
                    "vega": greeks.get("vega", 0),
                    "open_interest": snap.get("openInterest", 0),
                    "volume": snap.get("dailyBar", {}).get("v", 0),
                }
                if details.get("option_type", "").lower() == "call":
                    calls.append(contract)
                else:
                    puts.append(contract)

            calls.sort(key=lambda x: x["strike"])
            puts.sort(key=lambda x: x["strike"])

            result = {
                "symbol": symbol,
                "calls": calls,
                "puts": puts,
                "total_contracts": len(calls) + len(puts),
            }
            _cache[cache_key] = (result, time.time())
            return result
    except Exception as e:
        return {"symbol": symbol, "error": str(e), "calls": [], "puts": []}


# ── AI Trade Signal ───────────────────────────────────────────────────────────

async def get_ai_trade_signal(symbol: str, context: str = "") -> dict:
    """AI generates a trade signal with entry, target, stop loss."""
    bars = await get_bars(symbol, "1Day", 30)
    prices = [b["close"] for b in bars[-10:]] if bars else []
    current_price = prices[-1] if prices else 0

    result = await ask_json(f"""You are an expert quantitative trader analyzing {symbol}.

Current price: ${current_price}
Recent 10-day closes: {prices}
Additional context: {context if context else 'No additional context'}

Generate a precise trade signal. Return JSON:
{{
  "symbol": "{symbol}",
  "signal": "strong_buy/buy/hold/sell/strong_sell",
  "confidence": int (0-100),
  "current_price": {current_price},
  "entry_price": float,
  "target_price": float,
  "stop_loss": float,
  "risk_reward_ratio": float,
  "timeframe": str,
  "strategy": str,
  "reasoning": str,
  "key_levels": [
    {{"level": float, "type": "support/resistance", "significance": str}}
  ],
  "options_play": {{
    "recommendation": str,
    "type": "call/put/none",
    "strike": float,
    "expiry": str,
    "rationale": str
  }},
  "risk_factors": [str],
  "catalysts": [str]
}}""")
    return result if isinstance(result, dict) else {"error": "Signal generation failed"}


# ── P&L Summary ───────────────────────────────────────────────────────────────

async def get_pnl_summary() -> dict:
    """Get full P&L summary — account + positions + today's performance."""
    account, positions = await asyncio.gather(get_account(), get_positions())

    total_unrealized = sum(p.get("unrealized_pl", 0) for p in positions)
    total_market_value = sum(p.get("market_value", 0) for p in positions)
    winners = [p for p in positions if p.get("unrealized_pl", 0) > 0]
    losers = [p for p in positions if p.get("unrealized_pl", 0) < 0]

    return {
        "account": account,
        "positions_count": len(positions),
        "positions": positions,
        "total_unrealized_pl": round(total_unrealized, 2),
        "total_market_value": round(total_market_value, 2),
        "winners": len(winners),
        "losers": len(losers),
        "win_rate": round(len(winners) / len(positions) * 100, 1) if positions else 0,
        "best_position": max(positions, key=lambda p: p.get("unrealized_pl", 0)) if positions else None,
        "worst_position": min(positions, key=lambda p: p.get("unrealized_pl", 0)) if positions else None,
    }
