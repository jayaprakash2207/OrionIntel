"""
Custom Alerts Service — Price & indicator alerts with delivery.
Alerts are persisted to alerts_data.json so they survive server restarts.
"""
import asyncio
import json
import os
import time
import uuid
from pathlib import Path
from typing import Optional
from services.chart_data import get_chart_data
from services.alert_service import send_alert


# ── Persistence ───────────────────────────────────────────────────────────────

_DATA_FILE = Path(__file__).parent.parent / "alerts_data.json"

_alerts: dict[str, dict] = {}


def _load():
    global _alerts
    if _DATA_FILE.exists():
        try:
            _alerts = json.loads(_DATA_FILE.read_text())
        except Exception:
            _alerts = {}


def _save():
    try:
        _DATA_FILE.write_text(json.dumps(_alerts, indent=2))
    except Exception:
        pass


_load()


# ── CRUD ──────────────────────────────────────────────────────────────────────

def create_alert(
    symbol: str,
    condition: str,
    threshold: float,
    label: str = "",
    notify_channels: list = None,
    once: bool = True,
) -> dict:
    alert_id = str(uuid.uuid4())[:8]
    record = {
        "id": alert_id,
        "symbol": symbol.upper(),
        "condition": condition,
        "threshold": threshold,
        "label": label or f"{symbol} {condition} {threshold}",
        "notify_channels": notify_channels or ["email"],
        "once": once,
        "active": True,
        "triggered_count": 0,
        "created_at": time.time(),
        "last_triggered": None,
        "last_value": None,
    }
    _alerts[alert_id] = record
    _save()
    return record


def list_alerts(symbol: str = None) -> list:
    alerts = list(_alerts.values())
    if symbol:
        alerts = [a for a in alerts if a["symbol"] == symbol.upper()]
    return sorted(alerts, key=lambda x: x["created_at"], reverse=True)


def delete_alert(alert_id: str) -> bool:
    if alert_id in _alerts:
        del _alerts[alert_id]
        _save()
        return True
    return False


def toggle_alert(alert_id: str) -> Optional[dict]:
    if alert_id in _alerts:
        _alerts[alert_id]["active"] = not _alerts[alert_id]["active"]
        _save()
        return _alerts[alert_id]
    return None


# ── RSI (pure math, no external deps) ────────────────────────────────────────

def _calc_rsi(closes: list, period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains  = [d if d > 0 else 0 for d in deltas[-period:]]
    losses = [-d if d < 0 else 0 for d in deltas[-period:]]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


# ── Condition evaluation ──────────────────────────────────────────────────────

def _evaluate(alert: dict, current_price: float, rsi: float = None, pct_change: float = None) -> bool:
    c = alert["condition"]
    t = alert["threshold"]
    if c == "price_above":
        return current_price > t
    if c == "price_below":
        return current_price < t
    if c == "rsi_above" and rsi is not None:
        return rsi > t
    if c == "rsi_below" and rsi is not None:
        return rsi < t
    if c == "pct_change_above" and pct_change is not None:
        return abs(pct_change) > t and pct_change > 0
    if c == "pct_change_below" and pct_change is not None:
        return pct_change < -t
    return False


async def check_alerts_for_symbol(symbol: str) -> list:
    active = [a for a in _alerts.values() if a["active"] and a["symbol"] == symbol.upper()]
    if not active:
        return []

    needs_rsi = any(a["condition"].startswith("rsi_") for a in active)

    try:
        result = await get_chart_data(symbol, period="5d", interval="5m")
        bars = result.get("bars", []) if isinstance(result, dict) else result
    except Exception:
        return []

    if not bars:
        return []

    current_price = bars[-1]["close"]
    prev_close = bars[-2]["close"] if len(bars) > 1 else current_price
    pct_change = (current_price - prev_close) / prev_close * 100 if prev_close else 0

    rsi = None
    if needs_rsi:
        closes = [b["close"] for b in bars]
        rsi = _calc_rsi(closes)

    triggered = []
    for alert in active:
        alert["last_value"] = current_price
        if _evaluate(alert, current_price, rsi, pct_change):
            alert["triggered_count"] += 1
            alert["last_triggered"] = time.time()
            if alert["once"]:
                alert["active"] = False
            _save()

            payload = {
                "alert": alert["label"],
                "direction": "bullish" if "above" in alert["condition"] else "bearish",
                "action": f"Alert triggered: {alert['condition']} {alert['threshold']}",
                "strength": "strong",
                "confidence": "high",
                "reason": (
                    f"{alert['symbol']} current price {current_price:.2f} "
                    f"triggered condition '{alert['condition']} {alert['threshold']}'"
                ),
            }
            try:
                await send_alert(payload, current_price, alert["notify_channels"])
            except Exception:
                pass

            triggered.append({**alert, "current_price": current_price, "rsi": rsi})

    return triggered


async def check_all_alerts() -> dict:
    symbols = list({a["symbol"] for a in _alerts.values() if a["active"]})
    results = {}
    for symbol in symbols:
        triggered = await check_alerts_for_symbol(symbol)
        if triggered:
            results[symbol] = triggered
    return results
