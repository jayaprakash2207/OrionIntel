// @ts-nocheck
"use client";

import { useState } from "react";
import { api, TimelineResponse, TimelineEvent } from "@/lib/api";
import { Clock, Loader2, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  EARNINGS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MACRO: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  REGULATORY: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  CRISIS: "bg-red-500/20 text-red-400 border-red-500/30",
  INNOVATION: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  GEOPOLITICAL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  MONETARY_POLICY: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  MARKET: "bg-primary/20 text-primary border-primary/30",
};

const SIGNIFICANCE_COLORS: Record<string, string> = {
  HIGH: "border-l-red-500",
  MEDIUM: "border-l-yellow-500",
  LOW: "border-l-border",
};

export default function TimelineView() {
  const [subject, setSubject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [focus, setFocus] = useState("all");
  const [response, setResponse] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await api.timeline({
        subject,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        focus,
      });
      setResponse(result);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Timeline generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="glass-card p-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Subject (e.g. Tesla, Bitcoin, 2008 Financial Crisis, Fed Policy)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="flex-1 bg-secondary/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Events</option>
            <option value="earnings">Earnings</option>
            <option value="macro">Macro</option>
            <option value="crises">Crises</option>
            <option value="regulatory">Regulatory</option>
            <option value="innovation">Innovation</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Start (e.g. 2020-01)"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <input
            type="text"
            placeholder="End (e.g. 2024-12)"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40 bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !subject.trim()}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Generate
          </button>
        </div>
      </div>

      {loading && (
        <div className="glass-card p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium text-foreground">Building timeline...</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Researching key events for {subject}
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
          {/* Header */}
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{response.subject}</p>
              <p className="text-xs text-muted-foreground">{response.period} — {response.events.length} events</p>
            </div>
          </div>

          {/* Events */}
          <div className="space-y-2">
            {response.events.map((evt, i) => (
              <div
                key={i}
                className={cn(
                  "glass-card p-4 border-l-2",
                  SIGNIFICANCE_COLORS[evt.significance] || "border-l-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {evt.date}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        CATEGORY_COLORS[evt.category] || "bg-muted/20 text-muted-foreground border-border"
                      )}
                    >
                      {evt.category.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {evt.significance} impact
                  </span>
                </div>

                <p className="text-sm font-semibold text-foreground mt-2">{evt.event}</p>

                <p className="text-xs text-foreground/60 mt-1">{evt.market_impact}</p>

                {evt.related_assets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {evt.related_assets.slice(0, 4).map((asset) => (
                      <span
                        key={asset}
                        className="text-xs bg-secondary/50 text-muted-foreground px-1.5 py-0.5 rounded font-mono"
                      >
                        {asset}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary & Lessons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Narrative Summary
                </p>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {response.narrative_summary}
              </p>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Key Turning Points & Lessons
              </p>
              <div className="space-y-1.5 mb-4">
                {response.key_turning_points.map((tp, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary flex-shrink-0">▶</span>
                    {tp}
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-border/30 space-y-1.5">
                {response.lessons_learned.map((lesson, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    {lesson}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
