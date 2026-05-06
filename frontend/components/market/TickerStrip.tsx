// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { cn, formatCurrency, getChangeColor } from "@/lib/utils";

interface TickerItem {
  ticker: string;
  price: number;
  change_percent: string;
}

const MOCK_TICKERS: TickerItem[] = [
  { ticker: "SPY", price: 512.34, change_percent: "0.87" },
  { ticker: "QQQ", price: 438.21, change_percent: "1.24" },
  { ticker: "AAPL", price: 189.45, change_percent: "-0.32" },
  { ticker: "MSFT", price: 412.88, change_percent: "1.56" },
  { ticker: "NVDA", price: 875.23, change_percent: "3.41" },
  { ticker: "GOOGL", price: 178.92, change_percent: "0.65" },
  { ticker: "AMZN", price: 192.77, change_percent: "0.94" },
  { ticker: "TSLA", price: 245.11, change_percent: "-2.14" },
  { ticker: "META", price: 504.32, change_percent: "1.87" },
  { ticker: "GLD", price: 221.45, change_percent: "0.23" },
  { ticker: "BTC", price: 67234.0, change_percent: "2.31" },
  { ticker: "ETH", price: 3521.44, change_percent: "1.77" },
];

export default function TickerStrip() {
  const [tickers] = useState<TickerItem[]>(MOCK_TICKERS);

  return (
    <div className="bg-card/60 border-b border-border/50 overflow-hidden py-2">
      <div className="flex gap-8 animate-[scroll_30s_linear_infinite] whitespace-nowrap">
        {[...tickers, ...tickers].map((item, idx) => {
          const pct = parseFloat(item.change_percent);
          return (
            <div key={idx} className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-foreground">{item.ticker}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatCurrency(item.price)}
              </span>
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  getChangeColor(pct)
                )}
              >
                {pct >= 0 ? "+" : ""}
                {pct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
