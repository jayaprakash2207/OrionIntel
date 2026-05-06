import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, time as dtime, timedelta
from zoneinfo import ZoneInfo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import health, alerts
from services.custom_alerts import check_all_alerts

log = logging.getLogger("alerts_scheduler")

IST = ZoneInfo("Asia/Kolkata")
MARKET_OPEN  = dtime(9, 15)
MARKET_CLOSE = dtime(15, 30)
CHECK_INTERVAL = 300  # 5 minutes during market hours

_scheduler_task: asyncio.Task = None
_running = False


def _is_market_open() -> bool:
    now = datetime.now(IST)
    if now.weekday() >= 5:  # Saturday / Sunday
        return False
    return MARKET_OPEN <= now.time() <= MARKET_CLOSE


def _seconds_until_market_open() -> float:
    """Seconds to sleep until next 9:15 AM IST on a weekday."""
    now = datetime.now(IST)
    target = now.replace(hour=9, minute=15, second=0, microsecond=0)
    if now.time() >= MARKET_OPEN:
        target += timedelta(days=1)
    # Skip to Monday if target lands on weekend
    while target.weekday() >= 5:
        target += timedelta(days=1)
    return (target - now).total_seconds()


async def _alert_scheduler_loop():
    log.info("[Alerts Scheduler] Started — active Mon–Fri 09:15–15:30 IST")
    while _running:
        if not _is_market_open():
            secs = _seconds_until_market_open()
            hrs = int(secs // 3600)
            mins = int((secs % 3600) // 60)
            log.info(f"[Alerts Scheduler] Market closed — sleeping {hrs}h {mins}m until next open")
            await asyncio.sleep(secs)
            continue

        try:
            results = await check_all_alerts()
            total = sum(len(v) for v in results.values())
            if total:
                log.info(f"[Alerts Scheduler] {total} alert(s) triggered")
        except Exception as e:
            log.error(f"[Alerts Scheduler] Error: {e}")

        await asyncio.sleep(CHECK_INTERVAL)

    log.info("[Alerts Scheduler] Stopped")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_task, _running
    print("\n OrionIntel Alerts Backend Starting...")
    print(f"   Email:    {'set' if settings.ALERT_EMAIL_FROM else 'not configured'}")
    print(f"   Telegram: {'set' if settings.TELEGRAM_BOT_TOKEN else 'not configured'}")
    print(f"   Discord:  {'set' if settings.DISCORD_WEBHOOK_URL else 'not configured'}")
    print(f"   WhatsApp: {'set' if settings.TWILIO_ACCOUNT_SID else 'not configured'}")
    print(f"\n   Docs: http://localhost:{settings.PORT}/docs\n")
    _running = True
    _scheduler_task = asyncio.create_task(_alert_scheduler_loop())
    yield
    _running = False
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()


app = FastAPI(
    title="OrionIntel Alerts API",
    description="Price & indicator alerts with email / Telegram / Discord / WhatsApp delivery",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])


@app.get("/")
async def root():
    return {
        "name": "OrionIntel Alerts",
        "status": "running",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
