// @ts-nocheck
"use client";

import { useState } from "react";
import { api, StressTestResponse } from "@/lib/api";
import { FlaskConical, Loader2, Plus, Trash2, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioItem {
  ticker: string;
  allocation: number;
  value: number;
}

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { ticker: "AAPL", allocation: 20, value: 20000 },
  { ticker: "MSFT", allocation: 20, value: 20000 },
  { ticker: "BND", allocation: 30, value: 30000 },
  { ticker: "GLD", allocation: 15, value: 15000 },
  { ticker: "CASH", allocation: 15, value: 15000 },
];

const SURVIVAL_COLORS: Record<string, string> = {
  HIGH: "text-emerald-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-red-400",
};

export default function StressTestView() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO);
  const [response, setResponse] = useState<StressTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () =>
    setPortfolio([...portfolio, { ticker: "", allocation: 0, value: 0 }]);

  const removeRow = (idx: number) =>
    setPortfolio(portfolio.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: keyof PortfolioItem, value: string | number) =>
    setPortfolio(portfolio.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const handleRun = async () => {
    const validPortfolio = portfolio.filter((p) => p.ticker.trim());
    if (!validPortfolio.length) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await api.stressTest({ portfolio: validPortfolio });
      setResponse(result);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Stress test failed.");
    } finally {
      setLoading(false);
    }
  };

  const resilienceColor =
    response
      ? response.portfolio_resilience_score >= 7
        ? "text-emerald-400"
        : response.portfolio_resilience_score >= 4
        ? "text-yellow-400"
        : "text-red-400"
      : "";

  return (
    <div className="space-y-4">
      {/* Portfolio Builder */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Portfolio Positions</h3>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Position
          </button>
        </div>

        <div className="space-y-2">
          {portfolio.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="TICKER"
                value={row.ticker}
                onChange={(e) => updateRow(idx, "ticker", e.target.value.toUpperCase())}
                className="w-24 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 uppercase font-mono"
              />
              <input
                type="number"
                placeholder="Alloc %"
                value={row.allocation}
                onChange={(e) => updateRow(idx, "allocation", Number(e.target.value))}
                className="w-24 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
              <input
                type="number"
                placeholder="Value ($)"
                value={row.value}
                onChange={(e) => updateRow(idx, "value", Number(e.target.value))}
                className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={() => removeRow(idx)}
                className="h-9 w-9 rounded-lg border border-border/50 hover:border-red-500/30 hover:bg-red-500/5 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="mt-4 h-10 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="h-4 w-4" />
          )}
          Run Stress Test
        </button>
      </div>

      {loading && (
        <div className="glass-card p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium text-foreground">Running stress scenarios...</p>
            <p className="text-xs text-muted-foreground mt-0.5">Testing against 4 market scenarios</p>
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
          {/* Resilience Score */}
          <div className="glass-card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Portfolio Resilience Score</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {response.overall_vulnerability}
                </p>
              </div>
            </div>
            <div
              className={cn(
                "text-5xl font-black tabular-nums",
                resilienceColor
              )}
            >
              {response.portfolio_resilience_score}
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>
          </div>

          {/* Scenario Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {response.scenario_results.map((scenario, i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Scenario {i + 1}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {scenario.scenario_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        SURVIVAL_COLORS[scenario.survival_probability] || "text-muted-foreground"
                      )}
                    >
                      {scenario.survival_probability} survival
                    </span>
                  </div>
                </div>

                <div className="text-sm font-semibold text-red-400 mb-3">
                  Impact: {scenario.estimated_portfolio_impact}
                </div>

                <div className="space-y-2 text-xs">
                  {scenario.key_risks.slice(0, 2).map((risk, j) => (
                    <div key={j} className="flex items-start gap-2 text-foreground/70">
                      <AlertTriangle className="h-3 w-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                      {risk}
                    </div>
                  ))}
                </div>

                {scenario.mitigation_actions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Mitigation:</p>
                    <p className="text-xs text-foreground/70">{scenario.mitigation_actions[0]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Top Hedges */}
          {response.top_hedges.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Recommended Hedges
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {response.top_hedges.map((hedge, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    {hedge}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
