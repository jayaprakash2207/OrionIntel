import asyncio
from core.gemini import ask, ask_json
from typing import Optional

SYSTEM = """You are OrionIntel, a world-class AI financial analyst.
You have deep expertise in: global stock markets (all 80+ exchanges), cryptocurrency and DeFi, commodities (gold silver oil agriculture), forex, geopolitical events and market impact, economic history going back 200 years, government laws and regulations.
Rules: give specific numbers and percentages, cite historical examples, mention both opportunities AND risks, be direct and confident."""


async def run_query(question: str, history: Optional[list] = None) -> dict:
    if history is None:
        history = []

    # Build conversation context from last 6 messages
    context = ""
    for msg in history[-6:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        context += f"\n{role.upper()}: {content}"

    full_prompt = f"{context}\n\nUSER: {question}" if context else question

    # Run answer and suggestions in parallel
    answer_coro = ask(full_prompt, system=SYSTEM)
    suggestions_coro = ask_json(
        f'Give 3 short follow-up questions a user might ask after: "{question}". '
        f'Return a JSON array of exactly 3 strings.',
        fast=True,
    )
    answer, suggestions_raw = await asyncio.gather(answer_coro, suggestions_coro, return_exceptions=True)

    if isinstance(answer, Exception):
        answer = "Analysis unavailable. Please try again."
    suggestions = (
        suggestions_raw
        if isinstance(suggestions_raw, list)
        else ["What are the risks?", "Show historical data", "What to watch next?"]
    )

    return {"answer": answer, "suggestions": suggestions, "model": "gemini-2.5-flash"}
