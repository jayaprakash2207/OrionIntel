import asyncio
from core.gemini import ask_json


async def score_article(title: str, description: str = "", source: str = "") -> dict:
    try:
        result = await ask_json(
            f'News: "{title}" — {description}\nReturn JSON: {{"impact_score": 1-10, "affected_assets": [str], "direction": "bullish/bearish/neutral", "urgency": "low/medium/high/critical", "summary": str, "category": str}}\nRespond ONLY in valid JSON. No markdown.',
            fast=True,
        )
        return {**result, "title": title, "source": source}
    except Exception:
        return {
            "title": title,
            "source": source,
            "impact_score": 5,
            "affected_assets": [],
            "direction": "neutral",
            "urgency": "low",
            "summary": "",
            "category": "general",
        }


async def score_batch(articles: list) -> list:
    tasks = [
        score_article(a.get("title", ""), a.get("description", ""), a.get("source", ""))
        for a in articles
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    scored = []
    for i, r in enumerate(results):
        article = articles[i].copy()
        if isinstance(r, dict):
            article.update(r)
        scored.append(article)
    return scored
