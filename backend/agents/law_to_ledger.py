"""
Law-to-Ledger RAG Agent
Reads government laws/bills, extracts key clauses, maps to affected companies.
Upgraded with ChromaDB vector store + LangChain text-splitter RAG pipeline.
Falls back to direct Gemini analysis when ChromaDB is unavailable.
"""
import hashlib
import time
import uuid
from datetime import datetime
from core.gemini import ask, ask_json
import httpx

# ── Optional RAG dependencies ─────────────────────────────────────────────────
try:
    import chromadb
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

# ── ChromaDB client (lazy-initialised) ────────────────────────────────────────
_chroma_client = None
_laws_collection = None


def _get_collection():
    """Return (or lazily create) the persistent ChromaDB 'laws' collection."""
    global _chroma_client, _laws_collection
    if not CHROMADB_AVAILABLE:
        return None
    if _laws_collection is not None:
        return _laws_collection
    try:
        _chroma_client = chromadb.PersistentClient(path="./chroma_db")
        _laws_collection = _chroma_client.get_or_create_collection(
            name="laws",
            metadata={"hnsw:space": "cosine"},
        )
        return _laws_collection
    except Exception:
        return None


# ── Simple TF-IDF embedding fallback ─────────────────────────────────────────

def _tfidf_embed(texts: list[str], vocab_size: int = 256) -> list[list[float]]:
    """
    Minimal TF-IDF-style embedding that produces a fixed-length float vector.
    Used when sentence-transformers are not installed.
    """
    import math

    # Build a small vocabulary from all texts combined
    all_tokens: list[str] = []
    tokenised: list[list[str]] = []
    for text in texts:
        tokens = text.lower().split()
        tokenised.append(tokens)
        all_tokens.extend(tokens)

    # Pick the top-N most-frequent tokens as our vocabulary
    from collections import Counter
    vocab_counts = Counter(all_tokens)
    vocab = [tok for tok, _ in vocab_counts.most_common(vocab_size)]
    vocab_index = {tok: i for i, tok in enumerate(vocab)}

    n_docs = len(texts)
    # Document frequency for IDF
    df = [0] * len(vocab)
    for tokens in tokenised:
        unique = set(tokens)
        for tok in unique:
            if tok in vocab_index:
                df[vocab_index[tok]] += 1

    embeddings = []
    for tokens in tokenised:
        tf_counter = Counter(tokens)
        vec = [0.0] * len(vocab)
        for tok, freq in tf_counter.items():
            if tok in vocab_index:
                idx = vocab_index[tok]
                tf = freq / max(len(tokens), 1)
                idf = math.log((n_docs + 1) / (df[idx] + 1)) + 1.0
                vec[idx] = tf * idf
        # L2-normalise
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        embeddings.append([v / norm for v in vec])

    return embeddings


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# ── In-memory fallback store (when ChromaDB unavailable) ─────────────────────
_mem_store: list[dict] = []   # [{chunk, metadata, embedding}]


# ── Core analysis functions (preserved from original) ────────────────────────

async def analyze_law(law_text: str, title: str = "") -> dict:
    """
    Analyse a law/bill and map financially relevant clauses to companies.
    If ChromaDB is available, relevant stored law chunks are retrieved first
    to enrich the analysis context.
    """
    # RAG context enrichment
    rag_context = ""
    if title:
        try:
            search_result = await search_laws(title, n_results=3)
            relevant_chunks = search_result.get("results", [])
            if relevant_chunks:
                chunks_text = "\n\n".join(r["chunk"] for r in relevant_chunks)
                rag_context = f"\n\nRelated law excerpts from knowledge base:\n{chunks_text}\n"
        except Exception:
            pass

    # Step 1: Extract key clauses
    clauses = await ask_json(f"""Legal document title: {title}
Full text: {law_text[:4000]}{rag_context}

Extract the financially relevant parts. Return JSON:
{{
  "title": str,
  "effective_date": str,
  "key_clauses": [
    {{"clause": str, "industries_affected": [str], "impact_type": "positive/negative/neutral", "severity": 1-10}}
  ],
  "regulated_activities": [str],
  "penalties": str,
  "summary": str
}}""")

    # Step 2: Map to companies
    industries = [c.get("industries_affected", []) for c in clauses.get("key_clauses", [])]
    flat_industries = list(set([i for sub in industries for i in sub]))

    companies = await ask_json(f"""Law: {title}
Affected industries: {flat_industries}
Key regulated activities: {clauses.get("regulated_activities", [])}

List specific publicly traded companies affected. Return JSON:
{{
  "companies": [
    {{
      "name": str,
      "ticker": str,
      "exchange": str,
      "impact": "positive/negative/neutral",
      "reason": str,
      "severity": 1-10,
      "historical_precedent": str
    }}
  ],
  "sectors_to_buy": [str],
  "sectors_to_avoid": [str],
  "recommendation": str
}}""")

    return {
        "law_title": title,
        "analysis": clauses,
        "company_impacts": companies,
        "processed_at": datetime.utcnow().isoformat(),
        "rag_context_used": bool(rag_context),
    }


async def fetch_and_analyze_recent_laws(country: str = "US") -> dict:
    """Fetch recent bills from free government APIs."""
    laws = []
    async with httpx.AsyncClient(timeout=15) as client:
        if country == "US":
            try:
                r = await client.get(
                    "https://api.congress.gov/v3/bill?limit=5&sort=updateDate+desc&api_key=DEMO_KEY"
                )
                data = r.json()
                for bill in data.get("bills", [])[:3]:
                    laws.append({
                        "title": bill.get("title", ""),
                        "number": bill.get("number", ""),
                        "type": bill.get("type", ""),
                        "url": bill.get("url", ""),
                    })
            except Exception:
                laws = [{"title": "Recent US Financial Regulation Bill", "number": "HR-XXXX", "type": "HR", "url": ""}]

    return {"country": country, "recent_laws": laws, "note": "Add CONGRESS_API_KEY in .env for full access"}


# ── New RAG functions ─────────────────────────────────────────────────────────

async def ingest_law_to_vectorstore(
    law_text: str,
    title: str,
    country: str = "US",
) -> dict:
    """
    Chunk the given law text and store chunks in ChromaDB collection 'laws'.
    Falls back to in-memory store when ChromaDB is unavailable.

    Returns:
        {ingested: bool, chunks_created: int, collection_size: int}
    """
    # Build chunks
    if CHROMADB_AVAILABLE:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " "],
        )
        chunks: list[str] = splitter.split_text(law_text)
    else:
        # Simple fallback splitter
        chunk_size = 800
        overlap = 100
        chunks = []
        start = 0
        while start < len(law_text):
            end = min(start + chunk_size, len(law_text))
            chunks.append(law_text[start:end])
            start += chunk_size - overlap

    if not chunks:
        return {"ingested": False, "chunks_created": 0, "collection_size": 0, "error": "No text to chunk"}

    doc_id = hashlib.md5(f"{title}{country}".encode()).hexdigest()
    ingested_at = datetime.utcnow().isoformat()

    collection = _get_collection()

    if collection is not None:
        # ChromaDB path
        try:
            ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [
                {"title": title, "country": country, "chunk_index": i, "ingested_at": ingested_at}
                for i in range(len(chunks))
            ]
            # Upsert in batches of 100
            batch_size = 100
            for b_start in range(0, len(chunks), batch_size):
                b_end = b_start + batch_size
                collection.upsert(
                    ids=ids[b_start:b_end],
                    documents=chunks[b_start:b_end],
                    metadatas=metadatas[b_start:b_end],
                )
            collection_size = collection.count()
            return {
                "ingested": True,
                "chunks_created": len(chunks),
                "collection_size": collection_size,
                "backend": "chromadb",
            }
        except Exception as e:
            return {
                "ingested": False,
                "chunks_created": 0,
                "collection_size": 0,
                "error": str(e),
                "backend": "chromadb",
            }
    else:
        # In-memory TF-IDF path
        embeddings = _tfidf_embed(chunks)
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            _mem_store.append({
                "id": f"{doc_id}_chunk_{i}",
                "chunk": chunk,
                "metadata": {
                    "title": title,
                    "country": country,
                    "chunk_index": i,
                    "ingested_at": ingested_at,
                },
                "embedding": emb,
            })
        return {
            "ingested": True,
            "chunks_created": len(chunks),
            "collection_size": len(_mem_store),
            "backend": "in_memory_tfidf",
        }


async def search_laws(query: str, n_results: int = 5) -> dict:
    """
    Semantic search across ingested law chunks.

    Returns:
        {query, results: [{chunk, metadata, relevance_score}]}
    """
    collection = _get_collection()

    if collection is not None and collection.count() > 0:
        # ChromaDB path – uses its built-in approximate nearest-neighbour search
        try:
            res = collection.query(
                query_texts=[query],
                n_results=min(n_results, collection.count()),
                include=["documents", "metadatas", "distances"],
            )
            results = []
            docs = res.get("documents", [[]])[0]
            metas = res.get("metadatas", [[]])[0]
            dists = res.get("distances", [[]])[0]
            for doc, meta, dist in zip(docs, metas, dists):
                # ChromaDB cosine distance: 0 = identical, 2 = opposite
                relevance = round(1.0 - dist / 2.0, 4)
                results.append({
                    "chunk": doc,
                    "metadata": meta,
                    "relevance_score": relevance,
                })
            return {"query": query, "results": results, "backend": "chromadb"}
        except Exception as e:
            return {"query": query, "results": [], "error": str(e), "backend": "chromadb"}

    elif _mem_store:
        # In-memory TF-IDF path
        query_emb = _tfidf_embed([query] + [item["chunk"] for item in _mem_store])[0]
        # Recompute embeddings of stored chunks against query vocab
        all_texts = [query] + [item["chunk"] for item in _mem_store]
        all_embs = _tfidf_embed(all_texts)
        q_emb = all_embs[0]
        scored = []
        for idx, item in enumerate(_mem_store):
            sim = _cosine_similarity(q_emb, all_embs[idx + 1])
            scored.append((sim, item))
        scored.sort(key=lambda x: x[0], reverse=True)
        results = [
            {
                "chunk": item["chunk"],
                "metadata": item["metadata"],
                "relevance_score": round(score, 4),
            }
            for score, item in scored[:n_results]
        ]
        return {"query": query, "results": results, "backend": "in_memory_tfidf"}

    else:
        # No data ingested yet – ask Gemini to provide a reasoned answer
        try:
            ai_answer = await ask_json(f"""
A user is searching a legal knowledge base with the query: "{query}"

No laws have been ingested yet. Provide a helpful response about what laws or
regulations might be relevant to this query.

Return JSON:
{{
  "query": "{query}",
  "results": [],
  "ai_suggestion": "<one paragraph about relevant laws>",
  "note": "No laws have been ingested into the vector store yet"
}}
""")
            return ai_answer
        except Exception:
            return {
                "query": query,
                "results": [],
                "note": "No laws ingested. Use POST /law-to-ledger/ingest to add laws first.",
            }
