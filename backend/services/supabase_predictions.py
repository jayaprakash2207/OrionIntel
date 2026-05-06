"""
Supabase Prediction Tracking Service
Saves AI predictions, tracks outcomes, measures accuracy over time.
Table: predictions
"""
import time
from datetime import datetime, date
from core.config import settings

_supabase = None


def _get_client():
    global _supabase
    if _supabase is None and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            from supabase import create_client
            _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        except Exception:
            pass
    return _supabase


# ── SQL to create the table (run once in Supabase dashboard) ─────────────────
CREATE_TABLE_SQL = """
create table if not exists predictions (
  id uuid default gen_random_uuid() primary key,
  asset text not null,
  prediction text not null,
  direction text,
  confidence int,
  timeframe text,
  target_date date,
  entry_price float,
  target_price float,
  stop_loss float,
  agent text,
  tags text[],
  actual_outcome text,
  actual_price float,
  was_correct boolean,
  resolved_at timestamp,
  created_at timestamp default now()
);

create index if not exists predictions_asset_idx on predictions(asset);
create index if not exists predictions_created_idx on predictions(created_at desc);
"""


async def save_prediction(
    asset: str,
    prediction: str,
    direction: str = "neutral",
    confidence: int = 50,
    timeframe: str = "1 week",
    target_date: str = None,
    entry_price: float = None,
    target_price: float = None,
    stop_loss: float = None,
    agent: str = "OrionIntel",
    tags: list = None,
) -> dict:
    """Save an AI prediction to Supabase."""
    client = _get_client()
    if not client:
        return {"success": False, "error": "Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env"}

    try:
        data = {
            "asset": asset,
            "prediction": prediction,
            "direction": direction,
            "confidence": confidence,
            "timeframe": timeframe,
            "agent": agent,
            "tags": tags or [],
        }
        if target_date:
            data["target_date"] = target_date
        if entry_price is not None:
            data["entry_price"] = entry_price
        if target_price is not None:
            data["target_price"] = target_price
        if stop_loss is not None:
            data["stop_loss"] = stop_loss

        result = client.table("predictions").insert(data).execute()
        return {"success": True, "id": result.data[0]["id"] if result.data else None}
    except Exception as e:
        err = str(e)
        if "does not exist" in err or "relation" in err:
            return {"success": False, "error": "Table not created yet. Run the SQL in your Supabase dashboard.", "sql": CREATE_TABLE_SQL}
        return {"success": False, "error": err}


async def get_predictions(asset: str = None, limit: int = 20, unresolved_only: bool = False) -> dict:
    """Fetch saved predictions."""
    client = _get_client()
    if not client:
        return {"success": False, "predictions": [], "error": "Supabase not configured"}

    try:
        query = client.table("predictions").select("*").order("created_at", desc=True).limit(limit)
        if asset:
            query = query.eq("asset", asset)
        if unresolved_only:
            query = query.is_("resolved_at", "null")
        result = query.execute()
        return {"success": True, "predictions": result.data, "count": len(result.data)}
    except Exception as e:
        return {"success": False, "predictions": [], "error": str(e)}


async def resolve_prediction(prediction_id: str, actual_outcome: str, actual_price: float = None, was_correct: bool = None) -> dict:
    """Mark a prediction as resolved with actual outcome."""
    client = _get_client()
    if not client:
        return {"success": False, "error": "Supabase not configured"}

    try:
        update_data = {
            "actual_outcome": actual_outcome,
            "resolved_at": datetime.utcnow().isoformat(),
        }
        if actual_price is not None:
            update_data["actual_price"] = actual_price
        if was_correct is not None:
            update_data["was_correct"] = was_correct

        result = client.table("predictions").update(update_data).eq("id", prediction_id).execute()
        return {"success": True, "updated": result.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_accuracy_stats(agent: str = None) -> dict:
    """Get prediction accuracy statistics."""
    client = _get_client()
    if not client:
        return {"success": False, "error": "Supabase not configured"}

    try:
        query = client.table("predictions").select("*").not_.is_("resolved_at", "null")
        if agent:
            query = query.eq("agent", agent)
        result = query.execute()
        predictions = result.data

        if not predictions:
            return {"success": True, "total_resolved": 0, "accuracy": 0, "stats": {}}

        correct = [p for p in predictions if p.get("was_correct") is True]
        incorrect = [p for p in predictions if p.get("was_correct") is False]

        by_direction = {}
        for p in predictions:
            d = p.get("direction", "unknown")
            if d not in by_direction:
                by_direction[d] = {"total": 0, "correct": 0}
            by_direction[d]["total"] += 1
            if p.get("was_correct"):
                by_direction[d]["correct"] += 1

        by_asset = {}
        for p in predictions:
            a = p.get("asset", "unknown")
            if a not in by_asset:
                by_asset[a] = {"total": 0, "correct": 0}
            by_asset[a]["total"] += 1
            if p.get("was_correct"):
                by_asset[a]["correct"] += 1

        return {
            "success": True,
            "total_resolved": len(predictions),
            "correct": len(correct),
            "incorrect": len(incorrect),
            "accuracy_pct": round(len(correct) / len(predictions) * 100, 1) if predictions else 0,
            "by_direction": by_direction,
            "by_asset": by_asset,
            "avg_confidence": round(sum(p.get("confidence", 50) for p in predictions) / len(predictions), 1),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_setup_sql() -> dict:
    """Return the SQL needed to set up the predictions table."""
    return {"sql": CREATE_TABLE_SQL, "instructions": "Run this SQL in your Supabase dashboard under SQL Editor"}
