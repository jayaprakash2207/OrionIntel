'use client'

import { useCallback, useEffect, useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Target, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react'

type Performance = {
  total_predictions?: number
  correct?: number
  overall_accuracy?: number
  by_agent?: Record<string, { total: number; correct: number; accuracy: number }>
  best_agent?: string
  recent_predictions?: any[]
}

export default function PerformancePage() {
  const [perf, setPerf] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(false)
  const [agentFilter, setAgentFilter] = useState('')
  const [resolving, setResolving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.predictionPerformance(agentFilter || undefined)
    setPerf(res?.data ?? res)
    setLoading(false)
  }, [agentFilter])

  async function resolvePending() {
    setResolving(true)
    if (api.resolvePredictionsV2) {
      await api.resolvePredictionsV2()
    } else if (api.resolvePredictions) {
      await api.resolvePredictions()
    }
    setResolving(false)
    load()
  }

  useEffect(() => {
    load()
  }, [load])

  const rows = Object.entries(perf?.by_agent || {})
  const recent = perf?.recent_predictions || []

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Performance</h1>
            <p className="text-sm text-gray-400">Track prediction accuracy across agents.</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <input
              className="input-field max-w-xs"
              placeholder="Filter by agent (optional)"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            />
            <button className="btn-secondary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button className="btn-primary" onClick={resolvePending} disabled={resolving}>
              {resolving ? 'Resolving…' : 'Resolve Pending'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-200">
            <Stat label="Total predictions" value={perf?.total_predictions} />
            <Stat label="Correct" value={perf?.correct} />
            <Stat label="Overall accuracy" value={perf?.overall_accuracy ? `${perf.overall_accuracy}%` : '—'} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left py-2">Agent</th>
                  <th className="text-left">Total</th>
                  <th className="text-left">Correct</th>
                  <th className="text-left">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-200">
                {rows.map(([agent, stats]) => (
                  <tr key={agent} className="hover:bg-gray-800/60">
                    <td className="py-2">{agent}</td>
                    <td>{stats.total}</td>
                    <td className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      {stats.correct}
                    </td>
                    <td>{stats.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="text-sm text-gray-500 mt-2">No performance data yet.</p>}
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-200 mb-2">Recent resolved predictions</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Agent</th>
                    <th className="text-left">Asset</th>
                    <th className="text-left">Direction</th>
                    <th className="text-left">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-200">
                  {recent.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-800/60">
                      <td className="py-2">{p.agent_type || '—'}</td>
                      <td>{p.asset || '—'}</td>
                      <td className="capitalize">{p.predicted_direction || '—'}</td>
                      <td>
                        {p.was_correct ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle2 className="h-4 w-4" /> Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400">
                            <XCircle className="h-4 w-4" /> Missed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recent.length === 0 && <p className="text-sm text-gray-500 mt-2">Backend response did not include resolved predictions.</p>}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-xl font-bold text-white">{value ?? '—'}</p>
    </div>
  )
}
