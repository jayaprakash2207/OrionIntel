from core.gemini import ask, ask_json

BULL_SYSTEM = "You are a confident Bull analyst. Argue the BULLISH case using: growth data, earnings momentum, positive macro trends, technical breakouts, institutional buying. Be specific with numbers. Max 200 words per argument."
BEAR_SYSTEM = "You are a skeptical Bear analyst. Argue the BEARISH case using: overvaluation, debt levels, historical crash patterns, geopolitical risks, technical breakdowns. Be specific. Max 200 words."
JUDGE_SYSTEM = "You are a neutral market judge. Summarize the bull-bear debate fairly and give a final balanced verdict."


async def run_debate(asset: str, question: str) -> dict:
    rounds = []
    context = f"Asset: {asset}\nQuestion: {question}\n\n"

    # Round 1 Bull
    bull1 = await ask(context + "Make your opening bullish argument.", system=BULL_SYSTEM)
    rounds.append({"agent": "bull", "argument": bull1, "round": 1})

    # Round 1 Bear
    bear1 = await ask(context + f"Bull argued: {bull1}\n\nNow make your opening bearish counter-argument.", system=BEAR_SYSTEM)
    rounds.append({"agent": "bear", "argument": bear1, "round": 1})

    # Round 2 Bull
    bull2 = await ask(context + f"Bear countered: {bear1}\n\nGive your rebuttal and final bullish case.", system=BULL_SYSTEM)
    rounds.append({"agent": "bull", "argument": bull2, "round": 2})

    # Round 2 Bear
    bear2 = await ask(context + f"Bull rebutted: {bull2}\n\nGive your final bearish argument.", system=BEAR_SYSTEM)
    rounds.append({"agent": "bear", "argument": bear2, "round": 2})

    # Judge verdict
    debate_summary = "\n".join([f"{r['agent'].upper()} (Round {r['round']}): {r['argument']}" for r in rounds])
    verdict_data = await ask_json(
        f"Debate about {asset}:\n{debate_summary}\n\nProvide verdict as JSON: {{verdict: str, bull_score: 0-10, bear_score: 0-10, recommendation: str, what_changes_outlook: str}}",
        system=JUDGE_SYSTEM
    )

    return {"asset": asset, "question": question, "rounds": rounds, "verdict": verdict_data}
