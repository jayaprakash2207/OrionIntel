"""
Market Predictor — Claude analyzes OI signals and predicts next move.
Called after OI signals are detected; appends prediction to the alert.
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from core.config import settings

_executor = ThreadPoolExecutor(max_workers=2)

_SYSTEM = """You are an expert Nifty 50 derivatives trader. Analyze the given OI signals and market data.
Predict what is likely to happen in the next 30-60 minutes. Be concise and specific.
Reply in exactly this format:
Direction: <bullish/bearish/sideways>
Target: <nearest Nifty level>
Confidence: <high/medium/low>
Reason: <one sentence why>
Risk: <one key risk>"""


def _call_claude_sync(signals: list, oi_data: dict, spot_price: float) -> str:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        signal_lines = "\n".join(
            f"- {s.get('alert')}: {s.get('reason', '')}" for s in signals[:4]
        )
        pcr        = oi_data.get("pcr", "N/A")
        support    = oi_data.get("support_strike", "N/A")
        resistance = oi_data.get("resistance_strike", "N/A")

        msg = (
            f"Nifty Spot: {spot_price:,.0f}\n"
            f"PCR: {pcr} | Support: {support} | Resistance: {resistance}\n\n"
            f"Live OI signals:\n{signal_lines}"
        )

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            system=_SYSTEM,
            messages=[{"role": "user", "content": msg}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        return ""


async def predict_next_move(signals: list, oi_data: dict, spot_price: float) -> str:
    if not settings.ANTHROPIC_API_KEY or not signals:
        return ""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _call_claude_sync, signals, oi_data, spot_price)
