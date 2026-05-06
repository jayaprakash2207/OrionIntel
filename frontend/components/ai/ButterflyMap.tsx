// @ts-nocheck
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Waves, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDER_COLORS = [
  "border-primary/40 bg-primary/5",
  "border-yellow-500/40 bg-yellow-500/5",
  "border-purple-500/40 bg-purple-500/5",
];

const DIRECTION_STYLES: Record<string, string> = {
  POSITIVE: "text-emerald-400 bg-emerald-400/10",
  NEGATIVE: "text-red-400 bg-red-400/10",
  MIXED: "text-yellow-400 bg-yellow-400/10",
};

const PROB_STYLES: Record<string, string> = {
  HIGH: "text-emerald-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-red-400",
};

export default function ButterflyMap() {
  const [event, setEvent] = useState("");
  const [region, setRegion] = useState("global");
  const [depth, setDepth] = useState(3);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!event.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await api.butterfly(event, `Region: ${region}, Depth: ${depth}`);
      setResponse(result);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Describe the financial event (e.g. Fed raises rates by 50bps unexpectedly)"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="global">Global</option>
            <option value="US">United States</option>
            <option value="Europe">Europe</option>
            <option value="Asia">Asia</option>
            <option value="EM">Emerging Markets</option>
          </select>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value={2}>2 Orders</option>
            <option value={3}>3 Orders</option>
          </select>
          <button
            onClick={handleAnalyze}
            disabled={loading || !event.trim()}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Waves className="h-4 w-4" />}
            Analyze
          </button>
        </div>
      </div>

      {loading && (
        <div className="glass-card p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium text-foreground">Mapping ripple effects...</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tracing {depth} orders of market impact</p>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {response && (
        <div className="space-y-4">
          {/* Trigger Event */}
          <div className="glass-card p-4 border-primary/30">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Trigger Event
            </p>
            <p className="text-sm font-semibold text-foreground">{response.event}</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">
              {response.trigger_summary}
            </p>
          </div>

          {/* Ripple Effects Chain */}
          <div className="space-y-3">
            {(response.ripple_effects || []).map((ripple: any, idx: number) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0",
                      idx === 0
                        ? "border-primary text-primary bg-primary/10"
                        : idx === 1
                        ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                        : "border-purple-500 text-purple-500 bg-purple-500/10"
                    )}
                  >
                    {ripple.order}
                  </div>
                  {idx < response.ripple_effects.length - 1 && (
                    <div className="w-px flex-1 bg-border/40 my-1" />
                  )}
                </div>
                <div
                  className={cn(
                    "flex-1 glass-card p-4 mb-2 border",
                    ORDER_COLORS[idx] || ORDER_COLORS[2]
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {ripple.order === 1 ? "1st" : ripple.order === 2 ? "2nd" : "3rd"} Order Effect
                      </span>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{ripple.label}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          DIRECTION_STYLES[ripple.direction] || "text-muted-foreground bg-muted/20"
                        )}
                      >
                        {ripple.direction}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/70 leading-relaxed mb-3">
                    {ripple.description}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Probability: </span>
                      <span className={PROB_STYLES[ripple.probability] || "text-foreground"}>
                        {ripple.probability}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeline: </span>
                      <span className="text-foreground/80">{ripple.time_horizon}</span>
                    </div>
                  </div>

                  {ripple.affected_assets.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ripple.affected_assets.slice(0, 6).map((asset) => (
                        <span
                          key={asset}
                          className="text-xs bg-secondary/50 text-muted-foreground px-2 py-0.5 rounded font-mono"
                        >
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total Impact & Hedging */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Total Market Impact
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {response.total_market_impact}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Hedging Suggestions
              </p>
              <ul className="space-y-1.5">
                {response.hedging_suggestions.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
