'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Newspaper, Search, Loader2, Sparkles } from 'lucide-react'

interface Article {
  id?: string
  title: string
  source: string
  description?: string
  url?: string
  published_at?: string
  image?: string
  // AI score fields
  impact_score?: number
  direction?: string
  urgency?: string
  affected_assets?: string[]
  summary?: string
  category?: string
  _scoring?: boolean
  _scored?: boolean
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (isNaN(diff)) return ''
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function urgencyColor(u?: string) {
  if (u === 'critical') return 'bg-red-900/40 text-red-400 border-red-800/40'
  if (u === 'high') return 'bg-orange-900/40 text-orange-400 border-orange-800/40'
  if (u === 'medium') return 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40'
  return 'bg-gray-800 text-gray-400 border-gray-700'
}

function directionColor(d?: string) {
  if (d === 'bullish') return 'text-green-400'
  if (d === 'bearish') return 'text-red-400'
  return 'text-gray-400'
}

function ImpactBadge({ score }: { score: number }) {
  const color = score >= 7 ? 'bg-red-900/40 text-red-400 border-red-800/40'
    : score >= 5 ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40'
    : 'bg-gray-800 text-gray-400 border-gray-700'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      Impact {score}/10
    </span>
  )
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const loadNews = useCallback(async () => {
    setLoading(true)
    const res = await api.news(30)
    const data: Article[] = Array.isArray(res?.data) ? res.data
      : Array.isArray(res?.data?.articles) ? res.data.articles
      : Array.isArray(res) ? res : []
    setArticles(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadNews() }, [loadNews])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) { loadNews(); return }
    setSearching(true)
    const res = await api.newsSearch(searchQuery.trim())
    const data: Article[] = Array.isArray(res?.data) ? res.data
      : Array.isArray(res?.data?.articles) ? res.data.articles
      : []
    setArticles(data)
    setSearching(false)
  }

  async function analyzeArticle(index: number) {
    const article = articles[index]
    if (article._scoring || article._scored) return

    setArticles((prev) =>
      prev.map((a, i) => i === index ? { ...a, _scoring: true } : a)
    )

    const res = await api.scoreNews([{
      title: article.title,
      description: article.description ?? '',
      source: article.source ?? '',
    }])

    const scored = res?.data?.[0] ?? res?.[0]
    setArticles((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              _scoring: false,
              _scored: true,
              impact_score: scored?.impact_score,
              direction: scored?.direction,
              urgency: scored?.urgency,
              affected_assets: scored?.affected_assets,
              summary: scored?.summary,
            }
          : a
      )
    )
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-900/40 border border-purple-700/40 flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">News Feed</h1>
            <p className="text-gray-400 text-sm">Real-time financial news with AI scoring</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              className="input-field pl-9"
              placeholder="Search news… e.g. Federal Reserve, Bitcoin, Oil"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" disabled={searching} className="btn-primary px-5 flex items-center gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? 'Searching…' : 'Search'}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); loadNews() }}
              className="px-4 py-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              Clear
            </button>
          )}
        </form>

        {/* Articles */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400 text-sm">
            No articles found.
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <a
                      href={article.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-medium text-sm leading-snug hover:text-purple-400 transition-colors line-clamp-2"
                    >
                      {article.title}
                    </a>
                    {article.description && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">{article.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">
                    {article.source}
                  </span>
                  {article.published_at && (
                    <span className="text-xs text-gray-500">{timeAgo(article.published_at)}</span>
                  )}

                  {/* AI score badges */}
                  {article._scored && (
                    <>
                      {article.impact_score != null && <ImpactBadge score={article.impact_score} />}
                      {article.urgency && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyColor(article.urgency)}`}>
                          {article.urgency}
                        </span>
                      )}
                      {article.direction && (
                        <span className={`text-xs font-medium ${directionColor(article.direction)}`}>
                          {article.direction === 'bullish' ? '↑ Bullish' : article.direction === 'bearish' ? '↓ Bearish' : '→ Neutral'}
                        </span>
                      )}
                      {article.affected_assets && article.affected_assets.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {article.affected_assets.slice(0, 3).map((a, j) => (
                            <span key={j} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">{a}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Analyze button */}
                  <button
                    onClick={() => analyzeArticle(i)}
                    disabled={article._scoring || article._scored}
                    className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                      bg-purple-900/20 border-purple-700/40 text-purple-400 hover:bg-purple-900/40"
                  >
                    {article._scoring ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {article._scoring ? 'Scoring…' : article._scored ? 'Scored ✓' : 'Analyze with AI'}
                  </button>
                </div>

                {article._scored && article.summary && (
                  <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-xs text-gray-300 italic border-l-2 border-purple-600">
                    {article.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
