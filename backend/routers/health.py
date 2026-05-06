from fastapi import APIRouter
from core.config import settings
from core.db import get_db

router = APIRouter()


@router.get("/health")
async def health_check():
    checks = {
        "server": True,
        "claude": bool(settings.ANTHROPIC_API_KEY),
        "gemini": bool(settings.GEMINI_API_KEY),
        "finnhub": bool(settings.FINNHUB_API_KEY),
        "alpha_vantage": bool(settings.ALPHA_VANTAGE_KEY),
        "coingecko": bool(settings.COINGECKO_API_KEY),
        "news_api": bool(settings.NEWS_API_KEY),
        "fred": bool(settings.FRED_API_KEY),
        "openweather": bool(settings.OPENWEATHER_API_KEY),
        "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY),
        "supabase_connected": False,
    }

    db = get_db()
    if db:
        try:
            db.table("queries").select("id").limit(1).execute()
            checks["supabase_connected"] = True
        except Exception as e:
            # Table may not exist yet — that's OK, connection still works
            err = str(e)
            table_missing = any(x in err for x in [
                "does not exist", "relation", "schema cache", "PGRST205", "not found"
            ])
            if table_missing:
                checks["supabase_connected"] = True  # connected, table just missing
                checks["supabase_note"] = "queries table not created yet — run migrations"
            else:
                checks["supabase_connected"] = False

    all_ok = checks["server"] and (checks["claude"] or checks["gemini"])
    return {
        "status": "healthy" if all_ok else "degraded",
        "checks": checks,
        "message": "All systems go" if all_ok else "Some services unavailable — check .env keys",
    }
