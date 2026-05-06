'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Clock } from 'lucide-react'

interface PredictedMove {
  asset: string
  direction: string
  magnitude: string
}

interface Stage {
  period: string
  label: string
  predicted_moves: PredictedMove[]
  narrative: string
  confidence: number
}

interface TimelineResult {
  event: string
  stages: Stage[]
  opportunity_window: string
  key_risk: string
}

export default function TimelinePage() {
  const [event, setEvent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TimelineResult | null>(null)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!event.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.timeline(event.trim())
    if (res?.data) setResult(res.data)
    else setError(res?.error ?? 'Timeline generation failed')
    setLoading(false)
  }

  const confidenceColor = (c: number) =>
    c >= 70 ? 'text-green-400' : c >= 45 ? 'text-yellow-400' : 'text-red-400'

  const stageColors = [
    { dot: 'bg-blue-500', border: 'border-blue-800/40', label: 'text-blue-400' },
    { dot: 'bg-purple-500', border: 'border-purple-800/40', label: 'text-purple-400' },
    { dot: 'bg-yellow-500', border: 'border-yellow-800/40', label: 'text-yellow-400' },
    { dot: 'bg-orange-500', border: 'border-orange-800/40', label: 'text-orange-400' },
    { dot: 'bg-green-500', border: 'border-green-800/40', label: 'text-green-400' },
  ]

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-900/40 border border-cyan-700/40 flex items-center justify-center">
            <Clock className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Market Timeline</h1>
            <p className="text-gray-400 text-sm">5-stage market reaction timeline for any event</p>
          </div>
        </div>

        {/* Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">Event Description *</label>
            <input
              className="input-field"
              placeholder="e.g. US Federal Reserve announces emergency rate cut of 50bps"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
          <button onClick={handleGenerate} disabled={loading || !event.trim()} className="btn-primary w-full">
            {loading ? 'Generating timeline…' : 'Generate Timeline'}
          </button>
        </div>

        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-3 text-gray-400 text-sm">
            <div className="flex gap-1.5">
              {[0, 150, 300, 450, 600].map((d) => (
                <div key={d} className="h-8 w-1.5 bg-cyan-500/40 rounded-full animate-pulse" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            Generating 5-stage timeline…
          </div>
        )}

        {error && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

        {result && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">
              Timeline: <span className="text-cyan-400">{result.event}</span>
            </h2>

            {/* Vertical timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-700" />

              <div className="space-y-4">
                {result.stages.map((stage, i) => {
                  const colors = stageColors[i % stageColors.length]
                  return (
                    <div key={i} className="relative flex gap-6 pl-12">
                      {/* Circle on timeline */}
                      <div className={`absolute left-3.5 top-5 h-3.5 w-3.5 rounded-full ${colors.dot} ring-2 ring-gray-950 flex-shrink-0`} />

                      {/* Card */}
                      <div className={`bg-gray-900 border ${colors.border} rounded-xl p-5 flex-1 space-y-3`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className={`text-xs font-bold uppercase tracking-wide ${colors.label}`}>{stage.period}</span>
                            <h3 className="text-white font-semibold mt-0.5">{stage.label}</h3>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-sm font-bold ${confidenceColor(stage.confidence)}`}>{stage.confidence}%</span>
                            <p className="text-xs text-gray-500">confidence</p>
                          </div>
                        </div>

                        <p className="text-gray-300 text-sm leading-relaxed">{stage.narrative}</p>

                        {stage.predicted_moves?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {stage.predicted_moves.map((m, j) => (
                              <span key={j} className={`text-xs px-2.5 py-1 rounded-full border ${
                                m.direction === 'up' ? 'bg-green-900/30 text-green-400 border-green-800/40' :
                                m.direction === 'down' ? 'bg-red-900/30 text-red-400 border-red-800/40' :
                                'bg-gray-800 text-gray-400 border-gray-700'
                              }`}>
                                {m.direction === 'up' ? '↑' : m.direction === 'down' ? '↓' : '→'} {m.asset} {m.magnitude}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.opportunity_window && (
                <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">Opportunity Window</p>
                  <p className="text-gray-200 text-sm">{result.opportunity_window}</p>
                </div>
              )}
              {result.key_risk && (
                <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Key Risk</p>
                  <p className="text-gray-200 text-sm">{result.key_risk}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
