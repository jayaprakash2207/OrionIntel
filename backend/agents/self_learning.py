"""
Self-Learning Agent System
Tracks every prediction, scores accuracy, improves prompts over time
Stores predictions in Supabase, resolves them daily
"""
from core.gemini import ask, ask_json
from core.db import get_db
import datetime


async def save_prediction(
    agent_type: str,
    event_trigger: str,
    asset: str,
    predicted_direction: str,
    predicted_magnitude: float,
    timeframe_days: int,
    metadata: dict = {}
) -> dict:
    db = get_db()
    resolution_date = (datetime.datetime.utcnow() + datetime.timedelta(days=timeframe_days)).date().isoformat()
    
    prediction = {
        "agent_type": agent_type,
        "event_trigger": event_trigger,
        "asset": asset,
        "predicted_direction": predicted_direction,
        "predicted_magnitude": predicted_magnitude,
        "timeframe_days": timeframe_days,
        "resolution_date": resolution_date,
        "created_at": datetime.datetime.utcnow().isoformat(),
        "resolved": False,
        "metadata": metadata
    }
    
    if db:
        try:
            result = db.table("predictions").insert(prediction).execute()
            return {"saved": True, "prediction": prediction}
        except Exception as e:
            return {"saved": False, "error": str(e), "prediction": prediction}
    
    return {"saved": False, "reason": "No database connection", "prediction": prediction}


async def get_agent_performance(agent_type: str = None) -> dict:
    db = get_db()
    if not db:
        return {"error": "No database", "performance": []}
    
    try:
        query = db.table("predictions").select("*").eq("resolved", True)
        if agent_type:
            query = query.eq("agent_type", agent_type)
        result = query.execute()
        predictions = result.data or []
        
        if not predictions:
            return {"performance": [], "summary": "No resolved predictions yet"}
        
        correct = [p for p in predictions if p.get("was_correct")]
        accuracy = len(correct) / len(predictions) * 100 if predictions else 0
        
        by_agent = {}
        for p in predictions:
            agent = p["agent_type"]
            if agent not in by_agent:
                by_agent[agent] = {"total": 0, "correct": 0}
            by_agent[agent]["total"] += 1
            if p.get("was_correct"):
                by_agent[agent]["correct"] += 1
        
        for agent, stats in by_agent.items():
            stats["accuracy"] = round(stats["correct"] / stats["total"] * 100, 1)
        
        return {
            "total_predictions": len(predictions),
            "correct": len(correct),
            "overall_accuracy": round(accuracy, 1),
            "by_agent": by_agent,
            "best_agent": max(by_agent, key=lambda x: by_agent[x]["accuracy"]) if by_agent else None
        }
    except Exception as e:
        return {"error": str(e)}


async def resolve_predictions() -> dict:
    """Called daily to score predictions that have matured"""
    db = get_db()
    if not db:
        return {"resolved": 0, "error": "No database"}
    
    today = datetime.date.today().isoformat()
    
    try:
        result = db.table("predictions").select("*").eq("resolved", False).lte("resolution_date", today).execute()
        pending = result.data or []
        
        resolved_count = 0
        for pred in pending:
            # AI assesses if prediction came true based on known outcomes
            assessment = await ask_json(f"""Prediction made: {pred['event_trigger']}
Asset: {pred['asset']}
Predicted direction: {pred['predicted_direction']}
Predicted magnitude: {pred['predicted_magnitude']}%
Timeframe: {pred['timeframe_days']} days
Made on: {pred['created_at'][:10]}
Due: {pred['resolution_date']}

Based on your knowledge of what happened in markets, was this prediction correct?
Return JSON: {{"was_correct": bool, "actual_direction": str, "actual_magnitude": float, "accuracy_score": 0-100, "notes": str}}""", fast=True)
            
            db.table("predictions").update({
                "resolved": True,
                "was_correct": assessment.get("was_correct", False),
                "accuracy_score": assessment.get("accuracy_score", 0),
                "resolution_notes": assessment.get("notes", ""),
                "resolved_at": datetime.datetime.utcnow().isoformat()
            }).eq("id", pred["id"]).execute()
            resolved_count += 1
        
        return {"resolved": resolved_count, "pending_found": len(pending)}
    except Exception as e:
        return {"resolved": 0, "error": str(e)}
