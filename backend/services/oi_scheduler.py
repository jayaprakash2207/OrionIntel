"""
OI Alert Auto-Scheduler
Runs every 60 seconds during Indian market hours (Mon-Fri 9:15 AM - 3:30 PM IST).
Fetches Nifty OI, detects signals, sends WhatsApp alerts automatically.
Deduplicates — won't send the same alert more than once per 30 minutes.
"""
import asyncio
import logging
from datetime import datetime, time as dtime
from zoneinfo import ZoneInfo

from services.nse_oi import get_nifty_oi
from services.alert_service import send_strong_alerts, get_alert_config_status

log = logging.getLogger("oi_scheduler")

IST = ZoneInfo("Asia/Kolkata")

MARKET_OPEN  = dtime(9, 15)
MARKET_CLOSE = dtime(15, 30)
CHECK_INTERVAL = 60  # seconds

# Track sent alerts to avoid duplicates: {alert_type: last_sent_timestamp}
_sent_cache: dict = {}

# Alert types that send every time they occur — no dedup
NO_DEDUP_ALERTS = {
    "BIG PLAYERS ENTERED",
    "SHORT COVERING — FAST MOVE UP",
    "LONG UNWINDING — FAST MOVE DOWN",
    "PCR EXTREME BULLISH",
    "PCR EXTREME BEARISH",
    "MARKET UP",
    "MARKET DOWN",
}
# Breakouts get 5-min dedup — one alert when breakdown starts, re-alert only after recovery
BREAKOUT_DEDUP_WINDOW = 5 * 60
DEDUP_WINDOW = 10 * 60  # fallback for any other alert types

_scheduler_task: asyncio.Task = None
_running = False
_stats = {
    "checks": 0,
    "alerts_sent": 0,
    "last_check": None,
    "last_alert": None,
    "errors": 0,
}


def _is_market_open() -> bool:
    now = datetime.now(IST)
    # Skip weekends
    if now.weekday() >= 5:  # 5=Saturday, 6=Sunday
        return False
    current_time = now.time()
    return MARKET_OPEN <= current_time <= MARKET_CLOSE


def _is_duplicate(alert: dict) -> bool:
    alert_name = alert.get("alert")
    if alert_name in NO_DEDUP_ALERTS:
        return False
    spot_bucket = round(alert.get("spot_price", 0) / 50) * 50
    key = f"{alert_name}_{alert.get('direction')}_{alert.get('strike', '')}_{alert.get('level', '')}_{spot_bucket}"
    last_sent = _sent_cache.get(key, 0)
    now_ts = datetime.now().timestamp()
    window = BREAKOUT_DEDUP_WINDOW if alert_name in ("BULLISH BREAKOUT", "BEARISH BREAKDOWN") else DEDUP_WINDOW
    return (now_ts - last_sent) < window


def _mark_sent(alert: dict):
    spot_bucket = round(alert.get("spot_price", 0) / 50) * 50
    key = f"{alert.get('alert')}_{alert.get('direction')}_{alert.get('strike', '')}_{alert.get('level', '')}_{spot_bucket}"
    _sent_cache[key] = datetime.now().timestamp()


async def _run_check():
    """Single OI check cycle."""
    global _stats
    _stats["checks"] += 1
    _stats["last_check"] = datetime.now(IST).strftime("%H:%M:%S IST")

    try:
        data = await get_nifty_oi(force_refresh=True, update_snapshot=True)

        if data.get("market_closed"):
            return

        alerts = data.get("alerts", [])
        spot = data.get("spot_price", 0)

        # Inject spot_price into each alert for dedup bucketing
        for a in alerts:
            a.setdefault("spot_price", spot)

        # Filter: strong only + not duplicate
        new_alerts = [
            a for a in alerts
            if a.get("strength") == "strong" and not _is_duplicate(a)
        ]

        if not new_alerts:
            return

        log.info(f"[OI Scheduler] {len(new_alerts)} new strong alert(s) — sending to WhatsApp")

        results = await send_strong_alerts(new_alerts, spot, min_strength="strong")

        for alert, result in zip(new_alerts, results):
            if result.get("any_success"):
                _mark_sent(alert)
                _stats["alerts_sent"] += 1
                _stats["last_alert"] = f"{alert.get('alert')} @ {datetime.now(IST).strftime('%H:%M IST')}"
                log.info(f"[OI Scheduler] Sent: {alert.get('alert')} | {alert.get('direction')}")
            else:
                log.warning(f"[OI Scheduler] Failed to send: {result}")

    except Exception as e:
        _stats["errors"] += 1
        log.error(f"[OI Scheduler] Error: {e}")


async def _scheduler_loop():
    """Main loop — checks every 60s, only active during market hours."""
    log.info("[OI Scheduler] Started — monitoring Nifty OI automatically")

    while _running:
        if _is_market_open():
            await _run_check()
        else:
            now = datetime.now(IST)
            log.debug(f"[OI Scheduler] Market closed ({now.strftime('%a %H:%M IST')}) — waiting")

        await asyncio.sleep(CHECK_INTERVAL)

    log.info("[OI Scheduler] Stopped")


def start_oi_scheduler():
    """Start the background OI alert scheduler. Call from FastAPI lifespan."""
    global _scheduler_task, _running

    cfg = get_alert_config_status()
    if not cfg.get("whatsapp", {}).get("configured") and not cfg.get("email", {}).get("configured"):
        log.warning("[OI Scheduler] No alert channels configured — scheduler running but alerts won't be sent")

    _running = True
    _scheduler_task = asyncio.create_task(_scheduler_loop())
    log.info(f"[OI Scheduler] Auto-alerts active | Check every {CHECK_INTERVAL}s | Market hours 9:15-15:30 IST")


def stop_oi_scheduler():
    """Stop the scheduler. Call from FastAPI lifespan shutdown."""
    global _running, _scheduler_task
    _running = False
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
    log.info("[OI Scheduler] Shutdown complete")


def get_scheduler_status() -> dict:
    """Current status of the auto-scheduler."""
    now = datetime.now(IST)
    return {
        "running": _running,
        "market_open_now": _is_market_open(),
        "current_ist_time": now.strftime("%Y-%m-%d %H:%M:%S IST"),
        "market_hours": "Mon-Fri 09:15 - 15:30 IST",
        "check_interval_seconds": CHECK_INTERVAL,
        "dedup_window_minutes": DEDUP_WINDOW // 60,
        "stats": _stats,
    }
