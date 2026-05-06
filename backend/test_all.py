import httpx
import asyncio
import json

BASE = "http://localhost:8000"


async def test():
    async with httpx.AsyncClient(timeout=30) as client:
        tests = [
            ("GET",  "/",                    None,                                          "Root"),
            ("GET",  "/api/health",          None,                                          "Health"),
            ("GET",  "/api/market/overview", None,                                          "Market overview"),
            ("GET",  "/api/market/crypto",   None,                                          "Crypto"),
            ("GET",  "/api/market/fear-greed", None,                                        "Fear & Greed"),
            ("GET",  "/api/market/macro",    None,                                          "Macro (FRED)"),
            ("GET",  "/api/news",            None,                                          "News feed"),
            ("GET",  "/api/news/search?q=bitcoin", None,                                   "News search"),
            ("POST", "/api/ai/query",        {"question": "What is gold?", "history": []}, "AI Query"),
            ("POST", "/api/ai/butterfly",    {"headline": "Oil prices surge 10%"},          "Butterfly"),
            ("POST", "/api/ai/timeline",     {"event": "Fed cuts rates 50bps"},             "Timeline"),
            ("POST", "/api/ai/opportunities",{"event": "Banking crisis", "affected_asset": "Banks"}, "Opportunities"),
            ("POST", "/api/ai/memory",       {"situation": "Inflation rising rapidly"},    "Memory engine"),
            ("POST", "/api/ai/score-news",   {"articles": [{"title": "Fed raises rates", "description": "The Federal Reserve raised interest rates by 25bps.", "source": "Reuters"}]}, "News scorer"),
        ]

        passed = 0
        failed = 0

        for method, path, body, name in tests:
            try:
                if method == "GET":
                    r = await client.get(BASE + path)
                else:
                    r = await client.post(BASE + path, json=body)

                if r.status_code == 200:
                    status = "PASS"
                    passed += 1
                else:
                    status = f"FAIL (HTTP {r.status_code})"
                    failed += 1
                    try:
                        detail = r.json()
                        status += f" — {json.dumps(detail)[:120]}"
                    except Exception:
                        pass
            except Exception as e:
                status = f"ERROR: {e}"
                failed += 1

            icon = "✓" if status == "PASS" else "✗"
            print(f"  [{icon}] {name:<25} {status}")

        print(f"\n  Results: {passed} passed, {failed} failed out of {len(tests)} tests")


print("\nOrionIntel — Testing all endpoints\n" + "=" * 45)
asyncio.run(test())
print("=" * 45 + "\n")
