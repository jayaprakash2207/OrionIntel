"""
Financial Education AI
Explains concepts, market events, and builds personalized learning paths
"""
from core.gemini import ask, ask_json


async def explain_concept(concept: str, level: str = "intermediate", context: str = "") -> dict:
    level_guide = {
        "beginner": "Use everyday analogies, no jargon, simple vocabulary. Assume zero financial background.",
        "intermediate": "Use standard financial terminology with brief definitions. Assume basic market knowledge.",
        "expert": "Use precise technical language. Assume CFA/MBA-level knowledge. Include nuances and edge cases."
    }
    level_instruction = level_guide.get(level, level_guide["intermediate"])

    result = await ask_json(f"""You are a world-class financial educator who teaches at {level} level.

Concept to explain: {concept}
Level: {level} — {level_instruction}
Additional context: {context if context else "None"}

Create a complete educational breakdown. Make it genuinely useful and memorable.

Return JSON:
{{
  "concept": "{concept}",
  "level": "{level}",
  "simple_definition": str,
  "detailed_explanation": str,
  "real_world_example": str,
  "common_misconceptions": [str],
  "related_concepts": [str],
  "further_reading": [str],
  "quiz_question": str,
  "quiz_answer": str
}}""")
    return result


async def explain_market_event(event: str, level: str = "intermediate") -> dict:
    level_guide = {
        "beginner": "Plain English only. No jargon. Use analogies to everyday life.",
        "intermediate": "Standard financial terms with brief context. Assume basic market knowledge.",
        "expert": "Full technical depth. Mechanisms, second-order effects, policy implications."
    }
    level_instruction = level_guide.get(level, level_guide["intermediate"])

    result = await ask_json(f"""You are a financial journalist and educator explaining market events clearly.

Event: {event}
Level: {level} — {level_instruction}

Explain this event comprehensively and educationally.

Return JSON:
{{
  "event": "{event}",
  "explanation": str,
  "why_it_matters": str,
  "historical_context": str,
  "what_to_watch": [str],
  "key_terms": [
    {{
      "term": str,
      "definition": str
    }}
  ]
}}""")
    return result


async def generate_learning_path(goal: str, current_level: str = "beginner") -> dict:
    result = await ask_json(f"""You are a financial curriculum designer creating personalized learning paths.

Learning goal: {goal}
Current level: {current_level}

Design a practical, structured curriculum. Make modules progressive, each building on the last. Include hands-on exercises — not just reading. Be specific about what to learn and practice each week.

Return JSON:
{{
  "goal": "{goal}",
  "starting_level": "{current_level}",
  "estimated_weeks": int,
  "modules": [
    {{
      "week": int,
      "topic": str,
      "key_concepts": [str],
      "practical_exercise": str
    }}
  ],
  "recommended_resources": [str],
  "milestone_checkpoints": [str]
}}""")
    return result


async def answer_financial_question(question: str, level: str = "intermediate") -> dict:
    level_guide = {
        "beginner": "Answer simply with analogies. No jargon.",
        "intermediate": "Answer with standard terminology and practical nuance.",
        "expert": "Full technical depth with caveats, edge cases, and professional context."
    }
    level_instruction = level_guide.get(level, level_guide["intermediate"])

    result = await ask_json(f"""You are an expert financial advisor and educator. Answer questions with depth and clarity.

Question: {question}
Level: {level} — {level_instruction}

Return JSON:
{{
  "question": "{question}",
  "answer": str,
  "key_takeaway": str,
  "related_questions": [str],
  "confidence": "high|medium|low"
}}""")
    return result
