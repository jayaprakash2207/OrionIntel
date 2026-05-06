'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Send, TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCard {
  label: string
  value: string
  change: string
  positive: boolean
}

interface Article {
  id?: string
  title: string
  source: string
  published_at?: string
  description?: string
  impact_score?: number
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-7 w-32" />
      <div className="skeleton h-3 w-16" />
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [fearGreed, setFearGreed] = useState<{ value: number; classification: string } | null>(null)
  const [news, setNews] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [querying, setQuerying] = useState(false)
  const [history, setHistory] = useState<{ role: string; content: string }[]>([])

  useEffect(() => {
    Promise.all([api.marketOverview(), api.news(10)]).then(([market, newsRes]) => {
      if (market?.data) {
        const d = market.data
        const cards: MetricCard[] = []

        const spy = d.indices?.find((i: { symbol: string }) => i.symbol === 'SPY')
        if (spy) cards.push({ label: 'S&P 500', value: `$${spy.price?.toFixed(2) ?? '—'}`, change: `${spy.change_pct?.toFixed(2) ?? 0}%`, positive: (spy.change_pct ?? 0) >= 0 })

        const btc = d.crypto?.find((c: { symbol: string }) => c.symbol === 'BTC')
        if (btc) cards.push({ label: 'Bitcoin', value: `$${btc.price?.toLocaleString() ?? '—'}`, change: `${btc.change_24h?.toFixed(2) ?? 0}%`, positive: (btc.change_24h ?? 0) >= 0 })

        const gld = d.commodities?.find((c: { symbol: string }) => c.symbol === 'GLD')
        if (gld) cards.push({ label: 'Gold', value: `$${gld.price?.toFixed(2) ?? '—'}`, change: `${gld.change_pct?.toFixed(2) ?? 0}%`, positive: (gld.change_pct ?? 0) >= 0 })

        if (d.fear_greed) {
          setFearGreed(d.fear_greed)
          cards.push({ label: 'Fear & Greed', value: String(d.fear_greed.value), change: d.fear_greed.classification, positive: d.fear_greed.value >= 50 })
        }

        setMetrics(cards)
      }

      const articles = newsRes?.data ?? newsRes
      if (Array.isArray(articles)) setNews(articles.slice(0, 10))
      else if (Array.isArray(newsRes?.data?.articles)) setNews(newsRes.data.articles.slice(0, 10))

      setLoading(false)
    })
  }, [])

  async function handleQuery(q?: string) {
    const text = q ?? question
    if (!text.trim()) return
    setQuerying(true)
    setAnswer('')
    setSuggestions([])
    const newHistory = [...history, { role: 'user', content: text }]
    const res = await api.query(text, newHistory)
    const data = res?.data ?? res
    const responseText = data?.answer ?? res?.error ?? 'No response'
    setAnswer(responseText)
    setSuggestions(data?.suggestions ?? [])
    setHistory([...newHistory, { role: 'assistant', content: responseText }])
    setQuestion('')
    setQuerying(false)
  }

  const fgColor = fearGreed
    ? fearGreed.value >= 75 ? 'text-green-400'
    : fearGreed.value >= 55 ? 'text-emerald-400'
    : fearGreed.value >= 45 ? 'text-yellow-400'
    : fearGreed.value >= 25 ? 'text-orange-400'
    : 'text-red-400'
  : 'text-gray-400'

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Financial Intelligence Overview</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : metrics.map((m) => (
                <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{m.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
                  <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${m.positive ? 'text-green-400' : 'text-red-400'}`}>
                    {m.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {m.change}
                  </div>
                </div>
              ))
          }
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* AI Query Box — 60% */}
          <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Ask OrionIntel</h2>
            <div className="flex gap-2">
              <input
                className="input-field"
                placeholder="e.g. What happens to gold if the Fed cuts rates?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              />
              <button
                onClick={() => handleQuery()}
                disabled={querying || !question.trim()}
                className="btn-primary flex items-center gap-2 px-4 whitespace-nowrap"
              >
                <Send className="h-4 w-4" />
                {querying ? 'Thinking…' : 'Ask'}
              </button>
            </div>

            {querying && (
              <div className="flex items-center gap-2 text-purple-400 text-sm">
                <span className="flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                </span>
                Gemini is analyzing…
              </div>
            )}

            {answer && (
              <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {answer}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Follow-up suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuery(s)}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fear & Greed Gauge — 40% */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Fear & Greed Index</h2>
            {loading ? (
              <div className="skeleton h-24 w-24 rounded-full" />
            ) : fearGreed ? (
              <>
                <div className="relative flex items-center justify-center h-32 w-32">
                  <svg className="absolute inset-0" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" strokeWidth="12" />
                    <circle
                      cx="60" cy="60" r="50"
                      fill="none"
                      stroke={fearGreed.value >= 55 ? '#34d399' : fearGreed.value >= 45 ? '#fbbf24' : '#f87171'}
                      strokeWidth="12"
                      strokeDasharray={`${fearGreed.value * 3.14} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="text-center z-10">
                    <span className={`text-3xl font-bold ${fgColor}`}>{fearGreed.value}</span>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${fgColor}`}>{fearGreed.classification}</div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${fearGreed.value >= 55 ? 'bg-green-400' : fearGreed.value >= 45 ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${fearGreed.value}%` }}
                  />
                </div>
                <div className="flex justify-between w-full text-xs text-gray-500">
                  <span>Extreme Fear</span>
                  <span>Extreme Greed</span>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Unavailable</p>
            )}
          </div>
        </div>

        {/* News Feed */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Latest News</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {news.map((article, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                  <p className="text-sm font-medium text-gray-100 line-clamp-2 leading-snug">{article.title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">
                      {article.source}
                    </span>
                    {article.published_at && (
                      <span className="text-xs text-gray-500">{timeAgo(article.published_at)}</span>
                    )}
                    {article.impact_score && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
                        article.impact_score >= 7 ? 'bg-red-900/40 text-red-400' :
                        article.impact_score >= 5 ? 'bg-yellow-900/40 text-yellow-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        Impact {article.impact_score}/10
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
