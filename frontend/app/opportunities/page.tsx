'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { TrendingUp } from 'lucide-react'

interface Opportunity {
  asset: string
  type: string
  reason: string
  historical_backing: string
  timeframe: string
  risk_level: 'low' | 'medium' | 'high'
  confidence: number
}

interface OpportunityResult {
  opportunities: Opportunity[]
  assets_to_avoid: string[]
  contrarian_play: string
  time_sensitive: boolean
}

function riskColor(level: string) {
  if (level === 'high') return 'bg-red-900/40 text-red-400 border-red-800/40'
  if (level === 'medium') return 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40'
  return 'bg-green-900/40 text-green-400 border-green-800/40'
}

export default function OpportunitiesPage() {
  const [event, setEvent] = useState('')
  const [affectedAsset, setAffectedAsset] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OpportunityResult | null>(null)
  const [error, setError] = useState('')

  async function handleFind() {
    if (!event.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.opportunities(event.trim(), affectedAsset.trim())
    if (res?.data) setResult(res.data)
    else setError(res?.error ?? 'Failed to find opportunities')
    setLoading(false)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Contrarian Opportunities</h1>
            <p className="text-gray-400 text-sm">Find who profits when markets panic</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">Crisis / Event *</label>
              <input
                className="input-field"
                placeholder="e.g. US banking crisis, China trade war, Oil price spike"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">Directly Affected Asset (optional)</label>
              <input
                className="input-field"
                placeholder="e.g. Regional banks, Boeing, Oil companies"
                value={affectedAsset}
                onChange={(e) => setAffectedAsset(e.target.value)}
              />
            </div>
          </div>
          <button onClick={handleFind} disabled={loading || !event.trim()} className="btn-primary w-full">
            {loading ? 'Finding opportunities…' : 'Find Opportunities'}
          </button>
        </div>

        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-center gap-3 text-gray-400 text-sm">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-2.5 w-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
            Thinking contrarian…
          </div>
        )}

        {error && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

        {result && (
          <div className="space-y-6">

            {/* Contrarian play */}
            {result.contrarian_play && (
              <div className={`rounded-xl p-5 border ${result.time_sensitive ? 'bg-orange-950/30 border-orange-700/40' : 'bg-emerald-950/30 border-emerald-700/40'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wide ${result.time_sensitive ? 'text-orange-400' : 'text-emerald-400'}`}>
                    Top Contrarian Play
                  </span>
                  {result.time_sensitive && (
                    <span className="text-xs bg-orange-900/40 text-orange-400 border border-orange-700/40 px-2 py-0.5 rounded-full">Time Sensitive</span>
                  )}
                </div>
                <p className="text-gray-100 font-medium">{result.contrarian_play}</p>
              </div>
            )}

            {/* Opportunities grid */}
            <div>
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">
                {result.opportunities.length} Opportunities Found
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.opportunities.map((opp, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 space-y-3 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-semibold">{opp.asset}</p>
                        <p className="text-gray-400 text-xs">{opp.type}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${riskColor(opp.risk_level)}`}>
                        {opp.risk_level} risk
                      </span>
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed">{opp.reason}</p>

                    {opp.historical_backing && (
                      <p className="text-gray-500 text-xs italic border-l-2 border-gray-700 pl-2">{opp.historical_backing}</p>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{opp.timeframe}</span>
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-800 rounded-full h-1.5 w-16">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${opp.confidence}%` }} />
                        </div>
                        <span className="text-gray-400">{opp.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assets to avoid */}
            {result.assets_to_avoid?.length > 0 && (
              <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-5">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-3">Assets to Avoid</p>
                <div className="flex flex-wrap gap-2">
                  {result.assets_to_avoid.map((a, i) => (
                    <span key={i} className="text-sm bg-red-900/30 text-red-300 px-3 py-1 rounded-full border border-red-800/40">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
