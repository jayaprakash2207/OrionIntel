'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Zap } from 'lucide-react'

interface HistoricalMatch {
  year: number
  event: string
  similarity_pct: number
  what_moved: { asset: string; direction: string; pct_move: string; timeframe: string }[]
}

interface SupplyImpact {
  industry: string
  affected_companies: string[]
  impact_type: string
  severity: number
  reason: string
}

interface Prediction {
  timeframe: string
  assets: { name: string; direction: string; magnitude: string; confidence: number }[]
  narrative: string
}

interface StressResult {
  event: string
  region: string
  historical_matches: HistoricalMatch[]
  supply_chain: SupplyImpact[]
  predictions: Prediction[]
  overall_confidence: number
  key_risk: string
}

const REGIONS = ['Global', 'Americas', 'Europe', 'Asia', 'Middle East', 'Africa']

export default function StressTestPage() {
  const [event, setEvent] = useState('')
  const [region, setRegion] = useState('Global')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<StressResult | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [error, setError] = useState('')

  async function handleRun() {
    if (!event.trim()) return
    setLoading(true)
    setResult(null)
    setRevealed(0)
    setError('')
    const res = await api.stressTest(event.trim(), region)
    if (res?.data) {
      setResult(res.data)
      // Reveal sections sequentially
      setTimeout(() => setRevealed(1), 300)
      setTimeout(() => setRevealed(2), 800)
      setTimeout(() => setRevealed(3), 1400)
    } else {
      setError(res?.error ?? 'Stress test failed')
    }
    setLoading(false)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-900/40 border border-orange-700/40 flex items-center justify-center">
            <Zap className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Geopolitical Stress Test</h1>
            <p className="text-gray-400 text-sm">Simulate market impact of extreme events</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">Event Description *</label>
              <input
                className="input-field"
                placeholder="e.g. Major oil pipeline attack in the Middle East"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">Region</label>
              <select
                className="input-field"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleRun} disabled={loading || !event.trim()} className="btn-primary w-full">
            {loading ? 'Running stress test…' : 'Run Stress Test'}
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {['Historian Agent: Finding historical precedents…', 'Supply Chain Agent: Mapping affected industries…', 'Predictor Agent: Generating forecasts…'].map((msg, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">{msg}</span>
              </div>
            ))}
          </div>
        )}

        {error && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

        {result && (
          <div className="space-y-6">

            {/* Section 1: Historical Matches */}
            {revealed >= 1 && (
              <div className="transition-opacity duration-500 opacity-100">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Historical Matches</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.historical_matches.map((m, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-400 font-bold text-lg">{m.year}</span>
                        <span className="text-xs bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full">{m.similarity_pct}% similar</span>
                      </div>
                      <p className="text-white text-sm font-medium">{m.event}</p>
                      {m.what_moved?.length > 0 && (
                        <div className="space-y-1">
                          {m.what_moved.slice(0, 3).map((w, j) => (
                            <div key={j} className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">{w.asset}</span>
                              <span className={`font-medium ${w.direction === 'up' ? 'text-green-400' : w.direction === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                                {w.direction === 'up' ? '↑' : w.direction === 'down' ? '↓' : '→'} {w.pct_move}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Supply Chain */}
            {revealed >= 2 && result.supply_chain.length > 0 && (
              <div className="transition-opacity duration-500 opacity-100">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Supply Chain Impact</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wide">
                        <th className="text-left p-4">Industry</th>
                        <th className="text-left p-4 hidden md:table-cell">Companies</th>
                        <th className="text-left p-4">Type</th>
                        <th className="text-left p-4">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.supply_chain.map((s, i) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="p-4">
                            <p className="text-white font-medium">{s.industry}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{s.reason}</p>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {s.affected_companies.slice(0, 3).map((c, j) => (
                                <span key={j} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{c}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-gray-300">{s.impact_type}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="bg-gray-800 rounded-full h-1.5 w-16">
                                <div
                                  className={`h-1.5 rounded-full ${s.severity >= 7 ? 'bg-red-500' : s.severity >= 4 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${(s.severity / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400">{s.severity}/10</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 3: Predictions */}
            {revealed >= 3 && result.predictions.length > 0 && (
              <div className="transition-opacity duration-500 opacity-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Prediction Timeline</h2>
                  <span className="text-xs text-gray-400">
                    Overall confidence: <span className="text-white font-medium">{result.overall_confidence}%</span>
                  </span>
                </div>
                <div className="space-y-3">
                  {result.predictions.map((p, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-purple-900/40 text-purple-400 text-xs font-bold px-3 py-1 rounded-full border border-purple-700/40">
                          {p.timeframe}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{p.narrative}</p>
                      <div className="flex flex-wrap gap-2">
                        {p.assets?.map((a, j) => (
                          <span key={j} className={`text-xs px-2.5 py-1 rounded-full border ${
                            a.direction === 'up' ? 'bg-green-900/30 text-green-400 border-green-800/40' :
                            a.direction === 'down' ? 'bg-red-900/30 text-red-400 border-red-800/40' :
                            'bg-gray-800 text-gray-400 border-gray-700'
                          }`}>
                            {a.direction === 'up' ? '↑' : a.direction === 'down' ? '↓' : '→'} {a.name} {a.magnitude}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {result.key_risk && (
                  <div className="mt-4 bg-red-950/40 border border-red-800/40 rounded-xl p-4">
                    <p className="text-xs text-red-400 font-bold uppercase tracking-wide mb-1">Key Risk</p>
                    <p className="text-gray-200 text-sm">{result.key_risk}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
