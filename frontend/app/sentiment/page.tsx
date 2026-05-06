'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Activity, ThermometerSun, Flame, Sparkles } from 'lucide-react'

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return <span className="text-gray-500 text-xs">No history</span>
  const max = Math.max(...values)
  const min = Math.min(...values)
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * 100
      const y = max === min ? 50 : 100 - ((v - min) / (max - min)) * 100
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full text-purple-400" preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score))
  const color = pct >= 60 ? 'bg-green-500/20 text-green-300' : pct >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
  return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>{pct}</span>
}

export default function SentimentPage() {
  const [fg, setFg] = useState<any>(null)
  const [fgLoading, setFgLoading] = useState(false)
  const [asset, setAsset] = useState('NVDA')
  const [headlines, setHeadlines] = useState('')
  const [assetData, setAssetData] = useState<any>(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [emotions, setEmotions] = useState<any>(null)

  useEffect(() => {
    loadFg()
    loadEmotions()
  }, [])

  async function loadFg() {
    setFgLoading(true)
    const res = await api.fearGreedExtendedV2()
    setFg(res?.data ?? res)
    setFgLoading(false)
  }

  async function analyzeAsset() {
    setAssetLoading(true)
    const res = await api.sentiment(asset, headlines.split('\n').filter(Boolean))
    setAssetData(res?.data ?? res)
    setAssetLoading(false)
  }

  async function loadEmotions() {
    const res = await api.marketEmotionsV2()
    setEmotions(res?.data ?? res)
  }

  const historyVals = useMemo(() => (fg?.history ? fg.history.map((h: any) => Number(h.value) || 0) : []), [fg])

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Sentiment Lab</h1>
            <p className="text-sm text-gray-400">Fear & Greed, asset sentiment, and market emotions.</p>
          </div>
        </div>

        {/* Fear & Greed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <ThermometerSun className="h-4 w-4 text-purple-300" />
                Fear & Greed
              </div>
              <button className="btn-secondary" onClick={loadFg} disabled={fgLoading}>
                {fgLoading ? '...' : 'Refresh'}
              </button>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center space-y-2">
              <ScoreBadge score={fg?.current?.value ?? 0} />
              <p className="text-lg font-bold text-white">{fg?.current?.classification || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">30-day history</p>
              <Sparkline values={historyVals} />
            </div>
            {fg?.ai_analysis && (
              <p className="text-sm text-gray-300 leading-relaxed bg-gray-800/80 border border-gray-700 rounded-lg p-3 whitespace-pre-wrap">
                {fg.ai_analysis.interpretation || fg.ai_analysis.summary || JSON.stringify(fg.ai_analysis, null, 2)}
              </p>
            )}
          </div>

          {/* Asset Sentiment */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <Sparkles className="h-4 w-4 text-purple-300" />
                Asset Sentiment
              </div>
              <div className="flex gap-2">
                <input
                  className="input-field"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  placeholder="Ticker (e.g. NVDA)"
                  style={{ width: 120 }}
                />
                <button className="btn-primary" onClick={analyzeAsset} disabled={assetLoading}>
                  {assetLoading ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>
            </div>
            <textarea
              className="input-field h-24"
              placeholder="Optional headlines, one per line"
              value={headlines}
              onChange={(e) => setHeadlines(e.target.value)}
            />
            {assetData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-200">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-gray-500">Overall sentiment</p>
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={assetData.sentiment_score ?? 0} />
                    <span className="text-gray-200 capitalize">{assetData.overall_sentiment}</span>
                  </div>
                  <p className="text-xs uppercase text-gray-500 mt-3">Retail vs Institutional</p>
                  <p className="text-gray-300">Retail: {assetData.retail_sentiment || '—'}</p>
                  <p className="text-gray-300">Institutional: {assetData.institutional_sentiment || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-gray-500">Contrarian</p>
                  <p className="text-gray-300">{assetData.contrarian_signal || '—'}</p>
                  <p className="text-xs uppercase text-gray-500 mt-3">Key narrative</p>
                  <p className="text-gray-300">{assetData.key_narrative || '—'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Market Emotions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
            <Flame className="h-4 w-4 text-purple-300" />
            Market Emotions
          </div>
          {emotions ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-200">
              <div>
                <p className="text-xs uppercase text-gray-500">Dominant emotion</p>
                <p className="text-lg font-bold text-white">{emotions.dominant_emotion}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Risk appetite</p>
                <p className="text-lg font-bold text-white">{emotions.global_risk_appetite}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Key driver</p>
                <p className="text-gray-300">{emotions.key_driver}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Hot sectors</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {emotions.hot_sectors?.map((s: string) => (
                    <span key={s} className="px-3 py-1 rounded-full bg-green-900/40 text-green-200 text-xs border border-green-700/60">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Cold sectors</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {emotions.cold_sectors?.map((s: string) => (
                    <span key={s} className="px-3 py-1 rounded-full bg-red-900/40 text-red-200 text-xs border border-red-700/60">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading emotions…</p>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
