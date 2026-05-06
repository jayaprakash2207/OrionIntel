// @ts-nocheck
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, NewsArticle } from "@/lib/api";
import NewsCard from "./NewsCard";
import { Newspaper, RefreshCw, Search } from "lucide-react";

export default function NewsFeed() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("financial markets");
  const [search, setSearch] = useState("");

  const fetchNews = useCallback(
    async (q = query) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.latestNews(q, 20);
        setArticles(result.articles || []);
      } catch (e) {
        setError("Failed to load news. Check your NewsAPI key.");
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => fetchNews(), 300000); // 5 min
    return () => clearInterval(interval);
  }, [fetchNews]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (search.trim()) {
      setQuery(search);
      fetchNews(search);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search financial news..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary text-sm font-medium transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => fetchNews(query)}
          disabled={loading}
          className="h-10 w-10 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </form>

      {/* Quick Topics */}
      <div className="flex flex-wrap gap-2">
        {["financial markets", "S&P 500", "Federal Reserve", "Bitcoin", "Tech stocks", "Earnings"].map(
          (topic) => (
            <button
              key={topic}
              onClick={() => {
                setQuery(topic);
                setSearch(topic);
                fetchNews(topic);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                query === topic
                  ? "bg-primary/20 border-primary/30 text-primary"
                  : "bg-secondary/30 border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              {topic}
            </button>
          )
        )}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-lg bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-3 w-3/4 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center">
          <Newspaper className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <Newspaper className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No articles found for &quot;{query}&quot;</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article, i) => (
            <NewsCard key={i} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
