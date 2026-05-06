"""
Nifty OI Router — Open Interest data + smart alerts
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from services.nse_oi import get_nifty_oi, get_nifty_oi_summary
from services.alert_service import send_alert, send_strong_alerts, get_alert_config_status
from services.oi_scheduler import get_scheduler_status

router = APIRouter()


@router.get("/nifty")
async def nifty_oi(refresh: bool = False):
    """Full Nifty option chain OI data + alert signals."""
    try:
        data = await get_nifty_oi(force_refresh=False)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/nifty/summary")
async def nifty_oi_summary():
    """Lightweight OI summary for widgets."""
    try:
        data = await get_nifty_oi_summary()
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/nifty/send-alerts")
async def trigger_send_alerts(
    min_strength: str = Query("strong", description="minimum strength: weak/medium/strong"),
    channels: str = Query("email,whatsapp,sms", description="comma-separated channels"),
):
    """Fetch current OI, run analysis, send strong alerts to configured channels."""
    try:
        data = await get_nifty_oi(force_refresh=True)
        alerts = data.get("alerts", [])
        spot = data.get("spot_price", 0)
        channel_list = [c.strip() for c in channels.split(",")]
        results = await send_strong_alerts(alerts, spot, min_strength=min_strength)
        return {
            "success": True,
            "alerts_found": len(alerts),
            "alerts_sent": len(results),
            "results": results,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/alert-config")
async def alert_config():
    """Check which alert channels are configured."""
    return {"success": True, "data": get_alert_config_status()}


@router.get("/scheduler/status")
async def scheduler_status():
    """Auto-scheduler status — is it running, market open, stats."""
    return {"success": True, "data": get_scheduler_status()}


@router.get("/angel/status")
async def angel_status():
    """Angel One SmartAPI connection status."""
    try:
        from services.angel_one import get_status
        return {"success": True, "data": get_status()}
    except Exception as e:
        return {"success": False, "error": str(e)}


class ManualAlertRequest(BaseModel):
    alert: str
    direction: str
    action: str
    strength: str = "strong"
    reason: str
    confidence: str = "high"
    channels: list = ["email", "whatsapp", "sms"]
    spot_price: float = 0


@router.post("/send-manual")
async def send_manual_alert(req: ManualAlertRequest):
    """Manually send a custom alert to configured channels."""
    try:
        alert_dict = req.dict(exclude={"channels", "spot_price"})
        result = await send_alert(alert_dict, req.spot_price, req.channels)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
