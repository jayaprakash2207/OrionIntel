// @ts-nocheck
"use client";

import { useState } from "react";
import { api, DebateResponse } from "@/lib/api";
import { Swords, TrendingUp, TrendingDown, Loader2, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const RECOMMENDATION_COLORS: Record<string, string> = {
  "STRONG BUY": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  BUY: "text-green-400 bg-green-400/10 border-green-400/20",
  HOLD: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  SELL: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  "STRONG SELL": "text-red-400 bg-red-400/10 border-red-400/20",
};

export default function DebateView() {
  const [ticker, setTicker] = useState("");
  const [assetName, setAssetName] = useState("");
  const [timeframe, setTimeframe] = useState("12 months");
  const [response, setResponse] = useState<DebateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDebate = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await api.debate({
        ticker: ticker.toUpperCase(),
        asset_name: assetName || undefined,
        timeframe,
      });
      setResponse(result);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Debate generation failed.");
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
            placeholder="Ticker (e.g. AAPL, BTC, GOLD)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleDebate()}
            className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors uppercase"
          />
          <input
            type="text"
            placeholder="Asset name (optional)"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className="w-48 bg-secondary/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="3 months">3 months</option>
            <option value="6 months">6 months</option>
            <option value="12 months">12 months</option>
            <option value="2 years">2 years</option>
            <option value="5 years">5 years</option>
          </select>
          <button
            onClick={handleDebate}
            disabled={loading || !ticker.trim()}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
            Debate
          </button>
        </div>
      </div>

      {loading && (
        <div className="glass-card p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium text-foreground">Generating bull vs bear debate...</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Analyzing both sides for {ticker}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {response && (
        <div className="space-y-4">
          {/* Recommendation Banner */}
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Verdict — {response.ticker}</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  OrionIntel Recommendation
                </p>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  "inline-block px-4 py-1.5 rounded-full text-sm font-bold border",
                  RECOMMENDATION_COLORS[response.net_recommendation] ||
                    "text-muted-foreground bg-muted/20 border-border"
                )}
              >
                {response.net_recommendation}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Conviction: {response.conviction_score}/10
              </div>
            </div>
          </div>

          {/* Bull vs Bear */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bull Case */}
            <div className="glass-card p-5 border-emerald-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-emerald-400">BULL CASE</span>
              </div>
              <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
                {response.bull_case.thesis}
              </p>
              <div className="space-y-2">
                {response.bull_case.key_arguments.map((arg, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/70"
                  >
                    <span className="text-emerald-400 flex-shrink-0 mt-0.5">+</span>
                    {arg}
                  </div>
                ))}
              </div>
              {response.bull_case.price_target && (
                <div className="mt-4 pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">Target: </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {response.bull_case.price_target}
                  </span>
                </div>
              )}
            </div>

            {/* Bear Case */}
            <div className="glass-card p-5 border-red-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-red-400/10 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                </div>
                <span className="text-sm font-bold text-red-400">BEAR CASE</span>
              </div>
              <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
                {response.bear_case.thesis}
              </p>
              <div className="space-y-2">
                {response.bear_case.key_arguments.map((arg, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/70"
                  >
                    <span className="text-red-400 flex-shrink-0 mt-0.5">−</span>
                    {arg}
                  </div>
                ))}
              </div>
              {response.bear_case.price_target && (
                <div className="mt-4 pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">Target: </span>
                  <span className="text-xs font-semibold text-red-400">
                    {response.bear_case.price_target}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Verdict */}
          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Analyst Verdict
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {response.verdict}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
