"""
AI Core — Claude (primary) + Gemini (fallback)
Claude Sonnet 4.6 for deep analysis, Haiku 4.5 for fast calls.
Falls back to Gemini cascade if Anthropic key missing or quota hit.
"""
from langchain_core.messages import HumanMessage, SystemMessage
from core.config import settings
import json
import re
import asyncio

# ── Claude models ─────────────────────────────────────────────────────────────
_CLAUDE_DEEP  = "claude-sonnet-4-6"
_CLAUDE_FAST  = "claude-haiku-4-5-20251001"

# ── Gemini fallback cascade ───────────────────────────────────────────────────
_GEMINI_CASCADE = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
_GEMINI_FAST    = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]


def _make_claude(fast: bool = False):
    from langchain_anthropic import ChatAnthropic
    return ChatAnthropic(
        model=_CLAUDE_FAST if fast else _CLAUDE_DEEP,
        api_key=settings.ANTHROPIC_API_KEY,
        temperature=0.2 if fast else 0.6,
        max_tokens=2048 if fast else 4096,
    )


def _make_gemini(model: str, fast: bool = False):
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.3 if fast else 0.7,
        max_output_tokens=2048 if fast else 4096,
        convert_system_message_to_human=True,
    )


async def _try_claude(messages: list, fast: bool) -> str:
    """Try Claude with 2 retries on transient errors."""
    llm = _make_claude(fast)
    for attempt in range(3):
        try:
            response = await asyncio.wait_for(llm.ainvoke(messages), timeout=60.0)
            return response.content
        except asyncio.TimeoutError:
            raise RuntimeError("Claude timed out after 60s")
        except Exception as e:
            err = str(e)
            if "529" in err or "overloaded" in err.lower():
                if attempt < 2:
                    await asyncio.sleep(3 * (attempt + 1))
                    continue
            raise
    raise RuntimeError("Claude: max retries exceeded")


async def _try_gemini(messages: list, fast: bool) -> str:
    """Gemini cascade fallback."""
    cascade = _GEMINI_FAST if fast else _GEMINI_CASCADE
    last_err = None
    for model_name in cascade:
        llm = _make_gemini(model_name, fast)
        for attempt in range(3):
            try:
                response = await asyncio.wait_for(llm.ainvoke(messages), timeout=60.0)
                return response.content
            except asyncio.TimeoutError:
                last_err = f"Gemini {model_name} timed out"
                break
            except Exception as e:
                err = str(e)
                last_err = err
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    if attempt < 2:
                        await asyncio.sleep(5 * (attempt + 1))
                        continue
                    break
                if "NOT_FOUND" in err or "404" in err:
                    break
                raise
    raise RuntimeError(f"Gemini fallback exhausted. Last: {str(last_err)[:200]}")


async def ask(prompt: str, system: str = "", fast: bool = False, retries: int = 2) -> str:
    """
    Primary: Claude Sonnet 4.6 (deep) / Haiku 4.5 (fast)
    Fallback: Gemini cascade if Anthropic key missing or error
    """
    messages = []
    if system:
        messages.append(SystemMessage(content=system))
    messages.append(HumanMessage(content=prompt))

    # Try Claude first if key is set
    if settings.ANTHROPIC_API_KEY:
        try:
            return await _try_claude(messages, fast)
        except Exception:
            pass  # Fall through to Gemini

    # Gemini fallback
    if settings.GEMINI_API_KEY:
        return await _try_gemini(messages, fast)

    raise RuntimeError("No AI API key configured. Add ANTHROPIC_API_KEY or GEMINI_API_KEY to .env")


async def ask_json(prompt: str, system: str = "", fast: bool = False) -> dict:
    """Send a prompt and parse response as JSON."""
    result = await ask(
        prompt + "\n\nRespond ONLY in valid JSON. No markdown fences. No explanation outside the JSON.",
        system,
        fast,
    )
    cleaned = re.sub(r"```json|```", "", result).strip()
    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"raw": result, "parse_error": True}
