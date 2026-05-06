// @ts-nocheck
import Image from "next/image";
type NewsArticle = { title: string; description?: string; url?: string; publishedAt?: string; source?: { name: string }; urlToImage?: string; impact_score?: number; urgency?: string }
import { timeAgo, truncate } from "@/lib/utils";
import { ExternalLink, Clock } from "lucide-react";

interface NewsCardProps {
  article: NewsArticle;
  sentiment?: number;
  signal?: string;
}

const SIGNAL_STYLES: Record<string, string> = {
  "STRONG BUY": "text-emerald-400 bg-emerald-400/10",
  BUY: "text-green-400 bg-green-400/10",
  NEUTRAL: "text-yellow-400 bg-yellow-400/10",
  SELL: "text-orange-400 bg-orange-400/10",
  "STRONG SELL": "text-red-400 bg-red-400/10",
};

export default function NewsCard({ article, sentiment, signal }: NewsCardProps) {
  return (
    <div className="glass-card p-4 hover:border-border/80 transition-colors group">
      <div className="flex gap-3">
        {article.urlToImage && (
          <div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
            <Image
              src={article.urlToImage}
              alt="News thumbnail"
              fill
              sizes="64px"
              className="object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {article.source}
              </span>
              {signal && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    SIGNAL_STYLES[signal] || "text-muted-foreground bg-muted/20"
                  }`}
                >
                  {signal}
                </span>
              )}
            </div>
            {sentiment !== undefined && (
              <span
                className={`text-xs font-mono flex-shrink-0 ${
                  sentiment > 0
                    ? "text-emerald-400"
                    : sentiment < 0
                    ? "text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {sentiment > 0 ? "+" : ""}
                {sentiment.toFixed(2)}
              </span>
            )}
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors leading-snug block mb-1.5"
          >
            {truncate(article.title, 120)}
          </a>

          {article.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {truncate(article.description, 140)}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeAgo(article.publishedAt)}
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            >
              <ExternalLink className="h-3 w-3" />
              Read more
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
