// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PriceCard from "./PriceCard";
import { RefreshCw, AlertCircle } from "lucide-react";

interface OverviewData {
  [key: string]: {
    ticker: string;
    price: number;
    change: number;
    change_percent: string;
  };
}

export default function MarketOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.marketOverview();
      setData(result);
      setLastUpdated(new Date());
    } catch (e) {
      setError("Failed to load market data. Check your API keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="glass-card p-6 flex items-center gap-3 text-red-400">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Market data unavailable</p>
          <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
        </div>
        <button
          onClick={fetch}
          className="ml-auto text-xs bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Market Overview</h3>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="h-8 w-8 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <PriceCard
              key={i}
              ticker="..."
              price={0}
              change={0}
              changePercent={0}
              isLoading
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {data &&
            Object.entries(data).map(([name, item]) => (
              <PriceCard
                key={name}
                ticker={item.ticker}
                name={name}
                price={item.price}
                change={item.change}
                changePercent={item.change_percent}
              />
            ))}
        </div>
      )}
    </div>
  );
}
