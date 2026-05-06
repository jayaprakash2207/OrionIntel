from core.config import settings

supabase = None


def get_db():
    """Return a Supabase client singleton, or None if not configured."""
    global supabase
    if supabase is None and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            from supabase import create_client
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        except Exception as e:
            print(f"Supabase init failed: {e}")
    return supabase


async def save_query(question: str, answer: str, agent_type: str = "query", metadata: dict = None):
    """Persist a query/answer pair. Silent no-op if Supabase is not configured."""
    db = get_db()
    if not db:
        return None
    try:
        return (
            db.table("queries")
            .insert(
                {
                    "question": question,
                    "answer": answer,
                    "agent_type": agent_type,
                    "metadata": metadata or {},
                }
            )
            .execute()
        )
    except Exception:
        return None


async def get_recent_queries(limit: int = 10, agent_type: str = None) -> list:
    """Fetch recent queries from Supabase."""
    db = get_db()
    if not db:
        return []
    try:
        q = (
            db.table("queries")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if agent_type:
            q = q.eq("agent_type", agent_type)
        result = q.execute()
        return result.data or []
    except Exception:
        return []
