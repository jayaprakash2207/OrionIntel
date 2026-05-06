"""
Real-Time Price Streaming Service
Connects to Finnhub WebSocket for live tick-by-tick prices.
Exposes a FastAPI WebSocket endpoint that clients subscribe to.
"""
import asyncio
import json
import time
import websockets
from core.config import settings

# Latest prices cache — symbol → {price, volume, timestamp}
_latest: dict = {}
_subscribers: set = set()

DEFAULT_SYMBOLS = ["AAPL", "TSLA", "NVDA", "AMZN", "GOOGL", "MSFT", "META", "SPY", "QQQ", "BINANCE:BTCUSDT", "BINANCE:ETHUSDT"]

_finnhub_task = None
_running = False


async def _finnhub_listener():
    """Background task: connect to Finnhub WebSocket and stream prices."""
    global _running
    if not settings.FINNHUB_API_KEY:
        return

    uri = f"wss://ws.finnhub.io?token={settings.FINNHUB_API_KEY}"

    while _running:
        try:
            async with websockets.connect(uri, ping_interval=20) as ws:
                # Subscribe to all default symbols
                for symbol in DEFAULT_SYMBOLS:
                    await ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))

                while _running:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=30)
                        data = json.loads(msg)

                        if data.get("type") == "trade" and data.get("data"):
                            for trade in data["data"]:
                                symbol = trade.get("s", "")
                                price = trade.get("p", 0)
                                volume = trade.get("v", 0)
                                ts = trade.get("t", int(time.time() * 1000))

                                prev = _latest.get(symbol, {})
                                prev_price = prev.get("price", price)
                                change = price - prev_price
                                change_pct = (change / prev_price * 100) if prev_price else 0

                                _latest[symbol] = {
                                    "symbol": symbol,
                                    "price": round(price, 4),
                                    "volume": volume,
                                    "change": round(change, 4),
                                    "change_pct": round(change_pct, 4),
                                    "timestamp": ts,
                                }

                                # Broadcast to all connected WebSocket clients
                                if _subscribers:
                                    broadcast = json.dumps({
                                        "type": "price",
                                        "symbol": symbol,
                                        "price": round(price, 4),
                                        "change_pct": round(change_pct, 4),
                                        "volume": volume,
                                        "ts": ts,
                                    })
                                    dead = set()
                                    for subscriber in _subscribers.copy():
                                        try:
                                            await subscriber.send_text(broadcast)
                                        except Exception:
                                            dead.add(subscriber)
                                    _subscribers -= dead

                    except asyncio.TimeoutError:
                        # Send ping to keep alive
                        await ws.ping()
                    except Exception:
                        break

        except Exception:
            await asyncio.sleep(5)  # Reconnect after 5s


def start_streaming():
    """Start the Finnhub background streaming task."""
    global _finnhub_task, _running
    if not _running and settings.FINNHUB_API_KEY:
        _running = True
        loop = asyncio.get_event_loop()
        _finnhub_task = loop.create_task(_finnhub_listener())


def stop_streaming():
    global _running, _finnhub_task
    _running = False
    if _finnhub_task:
        _finnhub_task.cancel()


def get_latest_prices(symbols: list = None) -> dict:
    """Get the latest cached prices."""
    if symbols:
        return {s: _latest.get(s) for s in symbols if s in _latest}
    return dict(_latest)


def add_subscriber(ws):
    _subscribers.add(ws)


def remove_subscriber(ws):
    _subscribers.discard(ws)


async def subscribe_symbol(symbol: str):
    """Dynamically add a symbol to the stream."""
    if symbol not in DEFAULT_SYMBOLS:
        DEFAULT_SYMBOLS.append(symbol)
