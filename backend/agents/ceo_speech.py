"""
CEO Speech & Earnings Call Behavioral Analysis AI
Detects deception, hesitation, evasiveness, and confidence shifts in executive communications
"""
from core.gemini import ask, ask_json


async def analyze_speech(transcript: str, company: str = "", speaker: str = "CEO", context: str = "") -> dict:
    result = await ask_json(f"""You are a forensic linguist and behavioral analyst specializing in executive communications. You have studied thousands of earnings calls and can detect deception, stress, and hidden signals in language.

Company: {company if company else "Not specified"}
Speaker: {speaker}
Context: {context if context else "Standard earnings/investor communication"}

Transcript:
{transcript}

Perform deep behavioral analysis. Detect:
- Hedging language and qualifier overuse ("to some extent", "in certain ways", "we believe")
- Topic avoidance and pivot patterns (questions redirected, subjects dropped mid-thought)
- Sudden over-optimism that contradicts prior statements
- Defensive or blame-shifting language
- Passive voice when discussing problems (distancing from accountability)
- Specific vs vague language (vague = hiding something)
- Unusual word choice frequency changes
- Forward guidance confidence versus actual tone confidence gap
- Repetition of positive buzzwords as deflection
- Body language equivalents in text: incomplete sentences, self-corrections, over-explanation

Return JSON:
{{
  "overall_tone": str,
  "confidence_score": int (0-100, 100 = highly confident and transparent),
  "deception_indicators": [
    {{
      "pattern": str,
      "quote": str,
      "severity": "low|medium|high",
      "meaning": str
    }}
  ],
  "positive_signals": [str],
  "concerning_phrases": [str],
  "language_analysis": {{
    "hedging_frequency": str,
    "future_guidance_confidence": str,
    "problem_acknowledgment": bool
  }},
  "behavioral_verdict": str,
  "trading_signal": "bullish|neutral|bearish",
  "key_quotes": [str]
}}""")
    return result


async def compare_speech_baseline(current_transcript: str, previous_transcript: str, company: str = "") -> dict:
    result = await ask_json(f"""You are an executive communication analyst specializing in quarter-over-quarter tone and language shift detection.

Company: {company if company else "Not specified"}

CURRENT TRANSCRIPT:
{current_transcript}

PREVIOUS TRANSCRIPT (baseline):
{previous_transcript}

Compare systematically:
- Overall tone shift (optimistic → defensive, confident → evasive, etc.)
- Topics that received MORE emphasis this quarter
- Topics that were DROPPED or minimized (especially if previously prominent)
- Changes in specific language patterns (more hedging, less specificity, new buzzwords)
- Guidance language changes (specific numbers vs vague ranges)
- New risks mentioned or existing risks minimized
- Leadership confidence change as reflected in syntax complexity and directness

Return JSON:
{{
  "tone_shift": str,
  "confidence_change": int (-50 to +50, positive = more confident),
  "new_concerns": [str],
  "dropped_topics": [str],
  "language_shifts": [str],
  "verdict": str,
  "significance": "low|medium|high|very_high"
}}""")
    return result
