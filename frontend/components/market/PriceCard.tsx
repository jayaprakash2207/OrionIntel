// @ts-nocheck
"use client";

import { cn, formatCurrency, formatPercent, getChangeColor, getChangeBg } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceCardProps {
  ticker: string;
  name?: string;
  price: number;
  change: number;
  changePercent: string | number;
  volume?: number;
  high?: number;
  low?: number;
  isLoading?: boolean;
  onClick?: () => void;
}

export default function PriceCard({
  ticker,
  name,
  price,
  change,
  changePercent,
  volume,
  high,
  low,
  isLoading,
  onClick,
}: PriceCardProps) {
  const pct = typeof changePercent === "string" ? parseFloat(changePercent) : changePercent;
  const isPositive = pct > 0;
  const isNegative = pct < 0;

  if (isLoading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded mb-3" />
        <div className="h-8 w-32 bg-muted rounded mb-2" />
        <div className="h-4 w-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "glass-card p-4 transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/30 hover:bg-card"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {ticker}
          </div>
          {name && (
            <div className="text-xs text-muted-foreground/60 mt-0.5 truncate max-w-[120px]">
              {name}
            </div>
          )}
        </div>
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
            isPositive ? "bg-emerald-400/10" : isNegative ? "bg-red-400/10" : "bg-muted/20"
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : isNegative ? (
            <TrendingDown className="h-4 w-4 text-red-400" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {formatCurrency(price)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              getChangeColor(pct)
            )}
          >
            {formatPercent(pct)}
          </span>
          <span
            className={cn(
              "text-xs tabular-nums",
              getChangeColor(change)
            )}
          >
            ({change >= 0 ? "+" : ""}
            {formatCurrency(change)})
          </span>
        </div>
      </div>

      {(high || low) && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-border/30">
          {high && (
            <div>
              <div className="text-xs text-muted-foreground">High</div>
              <div className="text-xs font-medium text-foreground tabular-nums">
                {formatCurrency(high)}
              </div>
            </div>
          )}
          {low && (
            <div>
              <div className="text-xs text-muted-foreground">Low</div>
              <div className="text-xs font-medium text-foreground tabular-nums">
                {formatCurrency(low)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
