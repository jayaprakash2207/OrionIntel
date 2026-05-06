'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Swords } from 'lucide-react'

interface Round {
  agent: 'bull' | 'bear'
  argument: string
  round: number
}

interface Verdict {
  verdict: string
  bull_score: number
  bear_score: number
  recommendation: string
  what_changes_outlook: string
}

interface DebateResult {
  asset: string
  rounds: Round[]
  verdict: Verdict
}

export default function DebatePage() {
  const [asset, setAsset] = useState('')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DebateResult | null>(null)
  const [error, setError] = useState('')

  async function handleDebate() {
    if (!asset.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.debate(asset.trim(), question.trim())
    if (res?.data) {
      setResult(res.data)
    } else {
      setError(res?.error ?? 'Debate failed')
    }
    setLoading(false)
  }

  const bullRounds = result?.rounds.filter((r) => r.agent === 'bull') ?? []
  const bearRounds = result?.rounds.filter((r) => r.agent === 'bear') ?? []
  const maxRounds = Math.max(bullRounds.length, bearRounds.length)

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-900/40 border border-purple-700/40 flex items-center justify-center">
            <Swords className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Bull vs Bear Debate</h1>
            <p className="text-gray-400 text-sm">AI agents argue both sides for any asset</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">Asset / Ticker *</label>
              <input
                className="input-field"
                placeholder="e.g. NVDA, Bitcoin, Gold, Tesla"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1.5">Specific Question (optional)</label>
              <input
                className="input-field"
                placeholder="e.g. Is NVDA overvalued at current levels?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={handleDebate}
            disabled={loading || !asset.trim()}
            className="btn-primary w-full"
          >
            {loading ? 'Agents are debating…' : 'Start Debate'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center animate-pulse">
                <span className="text-green-400 font-bold text-sm">B</span>
              </div>
              <span className="text-gray-400 text-sm">Agents are debating</span>
              <span className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              <div className="h-10 w-10 rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center animate-pulse">
                <span className="text-red-400 font-bold text-sm">B</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs">Running 4 debate rounds + judge verdict…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">
              Debate: <span className="text-purple-400">{result.asset}</span>
            </h2>

            {/* Rounds */}
            {Array.from({ length: maxRounds }).map((_, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bull */}
                {bullRounds[i] && (
                  <div className="bg-gray-900 border border-green-800/40 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-green-900/40 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full border border-green-700/40">
                        BULL
                      </span>
                      <span className="text-gray-500 text-xs">Round {bullRounds[i].round}</span>
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{bullRounds[i].argument}</p>
                  </div>
                )}

                {/* Bear */}
                {bearRounds[i] && (
                  <div className="bg-gray-900 border border-red-800/40 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-red-900/40 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full border border-red-700/40">
                        BEAR
                      </span>
                      <span className="text-gray-500 text-xs">Round {bearRounds[i].round}</span>
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{bearRounds[i].argument}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Verdict */}
            {result.verdict && (
              <div className="bg-gray-900 border border-yellow-700/40 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-900/40 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-700/40">
                    JUDGE VERDICT
                  </span>
                </div>

                <p className="text-gray-200 leading-relaxed">{result.verdict.verdict}</p>

                {/* Score bars */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-400 font-medium">Bull Score</span>
                      <span className="text-green-400">{result.verdict.bull_score}/10</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(result.verdict.bull_score / 10) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-400 font-medium">Bear Score</span>
                      <span className="text-red-400">{result.verdict.bear_score}/10</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(result.verdict.bear_score / 10) * 100}%` }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Recommendation</p>
                    <p className="text-sm text-white font-medium">{result.verdict.recommendation}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">What Changes the Outlook</p>
                    <p className="text-sm text-gray-200">{result.verdict.what_changes_outlook}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
