from fastapi import APIRouter, Query
from pydantic import BaseModel
from services import news as news_svc
from agents import news_scorer
from typing import List

router = APIRouter()


@router.get("")
async def get_news(limit: int = Query(30, le=50)):
    try:
        return {"success": True, "data": await news_svc.fetch_news(limit)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/search")
async def search_news(q: str = Query(...), limit: int = Query(10, le=20)):
    try:
        return {"success": True, "data": await news_svc.search_news(q, limit)}
    except Exception as e:
        return {"success": False, "error": str(e)}


class AnalyzeRequest(BaseModel):
    articles: List[dict]


@router.post("/analyze")
async def analyze_news(req: AnalyzeRequest):
    try:
        return {"success": True, "data": await news_scorer.score_batch(req.articles)}
    except Exception as e:
        return {"success": False, "error": str(e)}
