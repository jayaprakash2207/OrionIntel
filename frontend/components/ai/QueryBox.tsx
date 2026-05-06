// @ts-nocheck
"use client";

import { useState } from "react";
import { api, QueryResponse } from "@/lib/api";
import { Send, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const EXAMPLE_QUERIES = [
  "What are the key risks facing the S&P 500 in the next 6 months?",
  "Explain the impact of Fed rate cuts on tech stocks",
  "Is gold a good hedge against inflation right now?",
  "What does the inverted yield curve signal for recession probability?",
  "Compare NVDA vs AMD investment thesis for 2025",
];

export default function QueryBox() {
  const [question, setQuestion] = useState("");
  const [ticker, setTicker] = useState("");
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await api.query({ question: query, ticker: ticker || undefined });
      setResponse(result);
      if (!q) setQuestion("");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Query failed. Check your Gemini API key.");
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = {
    HIGH: "text-emerald-400 bg-emerald-400/10",
    MEDIUM: "text-yellow-400 bg-yellow-400/10",
    LOW: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="space-y-4">
      {/* Input Area */}
      <div className="glass-card p-4">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Ask any financial question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              className="w-full bg-secondary/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors pr-10"
            />
          </div>
          <input
            type="text"
            placeholder="Ticker (optional)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-28 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors uppercase"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !question.trim()}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Ask
          </button>
        </div>

        <button
          onClick={() => setShowExamples(!showExamples)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Example queries
          {showExamples ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {showExamples && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuestion(q);
                  setShowExamples(false);
                  handleSubmit(q);
                }}
                className="text-xs bg-secondary/50 hover:bg-secondary/80 border border-border/40 hover:border-primary/30 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full transition-all"
              >
                {q.slice(0, 55)}...
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="glass-card p-6 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-sm text-foreground font-medium">Gemini is analyzing...</p>
            <p className="text-xs text-muted-foreground mt-0.5">Processing your financial query</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">OrionIntel Analysis</span>
            </div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full",
                confidenceColor[response.confidence as keyof typeof confidenceColor] ||
                  "text-muted-foreground bg-muted/20"
              )}
            >
              {response.confidence} Confidence
            </span>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {response.answer}
            </p>
          </div>

          {response.key_points && response.key_points.length > 0 && (
            <div className="pt-3 border-t border-border/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Key Takeaways
              </p>
              <ul className="space-y-1.5">
                {response.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary mt-0.5 flex-shrink-0">→</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
