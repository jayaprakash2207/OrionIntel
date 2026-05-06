"""
Custom Alerts Router — Create, list, delete price/indicator alerts.
POST /api/alerts/create   — create new alert
GET  /api/alerts          — list all alerts (optional ?symbol=)
DELETE /api/alerts/{id}   — delete alert
POST /api/alerts/{id}/toggle — enable/disable
POST /api/alerts/check    — manually check all alerts now
GET  /api/alerts/config   — show delivery channel config status
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.custom_alerts import (
    create_alert, list_alerts, delete_alert, toggle_alert,
    check_alerts_for_symbol, check_all_alerts,
)
from services.alert_service import get_alert_config_status

router = APIRouter()


class CreateAlertRequest(BaseModel):
    symbol: str
    condition: str          # price_above | price_below | rsi_above | rsi_below | pct_change_above | pct_change_below
    threshold: float
    label: str = ""
    notify_channels: list = ["email"]
    once: bool = True       # deactivate after first trigger


@router.post("/create")
async def create(req: CreateAlertRequest):
    alert = create_alert(
        symbol=req.symbol,
        condition=req.condition,
        threshold=req.threshold,
        label=req.label,
        notify_channels=req.notify_channels,
        once=req.once,
    )
    return {"success": True, "data": alert}


@router.get("")
async def get_alerts(symbol: str = None):
    return {"success": True, "data": list_alerts(symbol)}


@router.delete("/{alert_id}")
async def remove_alert(alert_id: str):
    ok = delete_alert(alert_id)
    return {"success": ok, "message": "Deleted" if ok else "Alert not found"}


@router.post("/{alert_id}/toggle")
async def toggle(alert_id: str):
    alert = toggle_alert(alert_id)
    if alert:
        return {"success": True, "data": alert}
    return {"success": False, "message": "Alert not found"}


@router.post("/check/{symbol}")
async def check_symbol(symbol: str):
    """Manually trigger alert check for a symbol."""
    triggered = await check_alerts_for_symbol(symbol)
    return {
        "success": True,
        "symbol": symbol.upper(),
        "triggered_count": len(triggered),
        "triggered": triggered,
    }


@router.post("/check")
async def check_all():
    """Manually check all active alerts across all symbols."""
    results = await check_all_alerts()
    total = sum(len(v) for v in results.values())
    return {"success": True, "total_triggered": total, "results": results}


@router.get("/config")
async def alert_config():
    """Show which delivery channels (email/WhatsApp/SMS) are configured."""
    return {"success": True, "data": get_alert_config_status()}
