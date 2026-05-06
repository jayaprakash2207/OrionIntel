'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { GitBranch, ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface Ripple {
  order: number
  asset: string
  direction: 'up' | 'down' | 'neutral'
  impact_pct: string
  timeframe: string
  confidence: number
  reason: string
}

interface Trigger {
  event: string
  location: string
  category: string
}

interface ButterflyResult {
  trigger: Trigger
  ripples: Ripple[]
  opportunity: string
  risk: string
  severity: number
}

function DirectionIcon({ d }: { d: string }) {
  if (d === 'up') return <ArrowUp className="h-4 w-4 text-green-400" />
  if (d === 'down') return <ArrowDown className="h-4 w-4 text-red-400" />
  return <Minus className="h-4 w-4 text-gray-400" />
}

function RippleCard({ r }: { r: Ripple }) {
  const isUp = r.direction === 'up'
  const isDown = r.direction === 'down'
  return (
    <div className={`bg-gray-900 border rounded-xl p-4 space-y-2 ${
      isUp ? 'border-green-800/40' : isDown ? 'border-red-800/40' : 'border-gray-700'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold text-sm">{r.asset}</span>
        <div className="flex items-center gap-1">
          <DirectionIcon d={r.direction} />
          <span className={`text-sm font-bold ${isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-gray-400'}`}>
            {r.impact_pct}
          </span>
        </div>
      </div>
      <p className="text-gray-400 text-xs leading-snug">{r.reason}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{r.timeframe}</span>
        <span>{r.confidence}% confidence</span>
      </div>
      <div className="bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${isUp ? 'bg-green-500' : isDown ? 'bg-red-500' : 'bg-gray-500'}`}
          style={{ width: `${r.confidence}%` }}
        />
      </div>
    </div>
  )
}

export default function ButterflyPage() {
  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ButterflyResult | null>(null)
  const [error, setError] = useState('')

  async function handleTrace() {
    if (!headline.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.butterfly(headline.trim(), description.trim())
    if (res?.data) setResult(res.data)
    else setError(res?.error ?? 'Analysis failed')
    setLoading(false)
  }

  const byOrder = (order: number) => result?.ripples.filter((r) => r.order === order) ?? []

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-900/40 border border-blue-700/40 flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Butterfly Effect</h1>
            <p className="text-gray-400 text-sm">Trace how a financial event ripples across markets</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">News Headline *</label>
            <input
              className="input-field"
              placeholder="e.g. China halts rare earth exports to the US"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">Additional Context (optional)</label>
            <textarea
              className="input-field resize-none h-20"
              placeholder="Add any extra context about the event…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button onClick={handleTrace} disabled={loading || !headline.trim()} className="btn-primary w-full">
            {loading ? 'Tracing impact…' : 'Trace Impact'}
          </button>
        </div>

        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-center gap-3 text-gray-400 text-sm">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-2.5 w-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
            Mapping ripple effects across markets…
          </div>
        )}

        {error && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

        {result && (
          <div className="space-y-6">

            {/* Trigger */}
            <div className="bg-gray-900 border border-purple-700/40 rounded-xl p-5">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">Trigger Event</span>
              <h3 className="text-white font-semibold text-lg mt-1">{result.trigger.event}</h3>
              <div className="flex gap-3 mt-2">
                {result.trigger.location && (
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">{result.trigger.location}</span>
                )}
                {result.trigger.category && (
                  <span className="text-xs bg-purple-900/40 text-purple-400 px-2 py-1 rounded-full">{result.trigger.category}</span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ml-auto ${
                  result.severity >= 7 ? 'bg-red-900/40 text-red-400' :
                  result.severity >= 4 ? 'bg-yellow-900/40 text-yellow-400' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  Severity: {result.severity}/10
                </span>
              </div>
            </div>

            {/* Ripples by order */}
            {[1, 2, 3].map((order) => {
              const ripples = byOrder(order)
              if (!ripples.length) return null
              const labels = ['1st Order — Immediate Impact', '2nd Order — Indirect Effects', '3rd Order — Systemic Shifts']
              return (
                <div key={order}>
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">{labels[order - 1]}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ripples.map((r, i) => <RippleCard key={i} r={r} />)}
                  </div>
                </div>
              )
            })}

            {/* Opportunity & Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-5">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">Opportunity</p>
                <p className="text-gray-200 text-sm leading-relaxed">{result.opportunity}</p>
              </div>
              <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-5">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Key Risk</p>
                <p className="text-gray-200 text-sm leading-relaxed">{result.risk}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
