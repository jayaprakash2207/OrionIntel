"""
Anti-Deepfake & Misinformation Detection AI
Analyzes content for manipulation signals, fabricated claims, and disinformation tactics
"""
from core.gemini import ask, ask_json


async def verify_content(content: str, source_url: str = "", media_type: str = "article") -> dict:
    result = await ask_json(f"""You are an expert disinformation analyst and forensic linguist.

Media type: {media_type}
Source URL: {source_url if source_url else "Not provided"}
Content to analyze:
{content}

Perform a deep credibility audit. Detect:
- Fabricated or unverifiable statistical claims
- Emotional manipulation language (fear, outrage, urgency triggers)
- Source laundering (citing anonymous/obscure sources as authoritative)
- Narrative inconsistencies and logical gaps
- Linguistic fingerprints of AI-generated or template-written disinfo
- Missing context that changes meaning
- Financial market manipulation intent (pump/dump signals, panic induction)
- Cross-reference gaps (claims that no credible outlet would corroborate)

Return JSON:
{{
  "credibility_score": int (0-100, 100 = fully credible),
  "verdict": "verified|suspicious|likely_fake",
  "red_flags": [str],
  "manipulation_tactics": [str],
  "key_claims_to_verify": [str],
  "recommended_sources": [str],
  "financial_risk_if_believed": str,
  "confidence": str
}}""")
    return result


async def batch_verify(articles: list) -> dict:
    articles_text = "\n\n".join([
        f"[{i}] Title: {a.get('title', 'Untitled')}\nSource: {a.get('source', 'Unknown')}\nContent: {a.get('content', '')[:300]}..."
        for i, a in enumerate(articles)
    ])

    result = await ask_json(f"""You are a rapid disinformation triage analyst. Process {len(articles)} articles quickly.

Articles:
{articles_text}

For each article, assign a credibility score and top red flag.

Return JSON:
{{
  "results": [
    {{
      "id": int,
      "title": str,
      "credibility_score": int (0-100),
      "verdict": "verified|suspicious|likely_fake",
      "top_red_flag": str
    }}
  ],
  "overall_quality": str,
  "suspicious_count": int
}}""", fast=True)
    return result
