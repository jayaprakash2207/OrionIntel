'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'

type MediaType = 'article' | 'tweet' | 'video_description' | 'press_release'

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'tweet', label: 'Tweet' },
  { value: 'video_description', label: 'Video Description' },
  { value: 'press_release', label: 'Press Release' },
]

function CredibilityGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444'
  return (
    <div className="relative h-32 w-32 mx-auto">
      <svg viewBox="0 0 120 120" className="absolute inset-0">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" strokeWidth="12" />
        <circle
          cx="60" cy="60" r="50" fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${pct * 3.14} 314`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{Math.round(pct)}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  )
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const upper = verdict?.toUpperCase()
  if (upper === 'VERIFIED') {
    return (
      <div className="flex items-center gap-2 bg-green-900/40 border border-green-700/40 rounded-xl px-5 py-3">
        <CheckCircle className="h-6 w-6 text-green-400" />
        <span className="text-xl font-bold text-green-400">VERIFIED</span>
      </div>
    )
  }
  if (upper === 'LIKELY FAKE' || upper === 'LIKELY_FAKE') {
    return (
      <div className="flex items-center gap-2 bg-red-900/40 border border-red-700/40 rounded-xl px-5 py-3">
        <XCircle className="h-6 w-6 text-red-400" />
        <span className="text-xl font-bold text-red-400">LIKELY FAKE</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 bg-yellow-900/40 border border-yellow-700/40 rounded-xl px-5 py-3">
      <AlertTriangle className="h-6 w-6 text-yellow-400" />
      <span className="text-xl font-bold text-yellow-400">SUSPICIOUS</span>
    </div>
  )
}

export default function DeepfakeCheckPage() {
  const [tab, setTab] = useState<'verify' | 'batch'>('verify')

  const [content, setContent] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('article')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const [batchArticles, setBatchArticles] = useState([
    { title: '', content: '', source: '' },
  ])
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResult, setBatchResult] = useState<any>(null)
  const [batchError, setBatchError] = useState('')

  async function handleVerify() {
    if (!content.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.deepfakeVerify(content.trim(), sourceUrl, mediaType)
    if (res?.data) {
      setResult(res.data)
    } else {
      setError(res?.error ?? 'Verification failed')
    }
    setLoading(false)
  }

  async function handleBatch() {
    const valid = batchArticles.filter((a) => a.title.trim() || a.content.trim())
    if (!valid.length) return
    setBatchLoading(true)
    setBatchResult(null)
    setBatchError('')
    const res = await api.deepfakeBatch(valid.map((a) => ({ title: a.title, content: a.content, source: a.source || undefined })))
    if (res?.data) {
      setBatchResult(res.data)
    } else {
      setBatchError(res?.error ?? 'Batch analysis failed')
    }
    setBatchLoading(false)
  }

  function addBatchRow() {
    setBatchArticles([...batchArticles, { title: '', content: '', source: '' }])
  }

  function removeBatchRow(i: number) {
    setBatchArticles(batchArticles.filter((_, idx) => idx !== i))
  }

  function updateBatch(i: number, field: string, value: string) {
    const updated = [...batchArticles]
    updated[i] = { ...updated[i], [field]: value }
    setBatchArticles(updated)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-900/40 border border-cyan-700/40 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Anti-Deepfake Truth Agent</h1>
            <p className="text-gray-400 text-sm">Verify financial news and media before it influences your trades</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'verify', label: 'Verify Content' },
            { key: 'batch', label: 'Batch Mode' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                tab === key
                  ? 'bg-cyan-900/40 border-cyan-700 text-cyan-200'
                  : 'border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Verify Tab */}
        {tab === 'verify' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Source URL (optional — UI only)</label>
                  <input
                    className="input-field"
                    placeholder="https://example.com/article"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Media Type</label>
                  <select
                    className="input-field"
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as MediaType)}
                  >
                    {MEDIA_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Article / Content *</label>
                <textarea
                  className="input-field resize-none"
                  rows={8}
                  placeholder="Paste the article text, tweet, or content to verify…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={loading || !content.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                {loading ? 'Verifying content…' : 'Verify Content'}
              </button>
            </div>

            {loading && (
              <div className="space-y-2">
                {['Cross-referencing known sources…', 'Checking manipulation patterns…', 'Analyzing financial claims…'].map((msg, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                    <span className="flex gap-1">
                      {[0, 100, 200].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                    <span className="text-gray-400 text-sm">{msg}</span>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

            {result && (
              <div className="space-y-5">
                {/* Score + Verdict */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="text-center space-y-3">
                      <CredibilityGauge score={result.credibility_score ?? result.score ?? 50} />
                      <p className="text-xs text-gray-500">Credibility Score</p>
                    </div>
                    <div className="flex-1 space-y-4">
                      {result.verdict && <VerdictBadge verdict={result.verdict} />}
                      {result.summary && <p className="text-gray-300 text-sm">{result.summary}</p>}
                    </div>
                  </div>
                </div>

                {/* Red Flags */}
                {result.red_flags && result.red_flags.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Red Flags</h2>
                    <div className="space-y-2">
                      {result.red_flags.map((flag: any, i: number) => (
                        <div key={i} className="bg-red-950/20 border border-red-800/40 rounded-xl p-4 flex items-start gap-3">
                          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-red-300 text-sm font-medium">
                              {typeof flag === 'string' ? flag : flag.flag ?? flag.description}
                            </p>
                            {typeof flag === 'object' && flag.detail && (
                              <p className="text-gray-400 text-xs mt-0.5">{flag.detail}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manipulation Tactics */}
                {result.manipulation_tactics && result.manipulation_tactics.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Manipulation Tactics Detected</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.manipulation_tactics.map((tactic: any, i: number) => (
                        <div key={i} className="bg-orange-950/20 border border-orange-800/40 rounded-lg p-3">
                          <p className="text-orange-300 text-sm font-medium">
                            {typeof tactic === 'string' ? tactic : tactic.tactic ?? tactic.name}
                          </p>
                          {typeof tactic === 'object' && tactic.description && (
                            <p className="text-gray-400 text-xs mt-1">{tactic.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Claims to Verify */}
                {result.key_claims && result.key_claims.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Key Claims to Verify</h2>
                    <div className="space-y-2">
                      {result.key_claims.map((claim: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <div className="h-5 w-5 rounded border border-gray-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300">
                            {typeof claim === 'string' ? claim : claim.claim ?? claim.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Risk */}
                {result.financial_risk && (
                  <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-5">
                    <p className="text-xs text-yellow-400 font-bold uppercase tracking-wide mb-2">Financial Risk if Believed</p>
                    <p className="text-gray-300 text-sm">{result.financial_risk}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Batch Mode Tab */}
        {tab === 'batch' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Articles to Verify</h2>
                <button
                  onClick={addBatchRow}
                  className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Article
                </button>
              </div>
              <div className="space-y-3">
                {batchArticles.map((article, i) => (
                  <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium w-6">#{i + 1}</span>
                      <input
                        className="input-field flex-1 text-sm"
                        placeholder="Title / Headline"
                        value={article.title}
                        onChange={(e) => updateBatch(i, 'title', e.target.value)}
                      />
                      <input
                        className="input-field w-40 text-sm"
                        placeholder="Source (optional)"
                        value={article.source}
                        onChange={(e) => updateBatch(i, 'source', e.target.value)}
                      />
                      <button
                        onClick={() => removeBatchRow(i)}
                        className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      className="input-field resize-none text-sm w-full"
                      rows={2}
                      placeholder="Paste snippet or content…"
                      value={article.content}
                      onChange={(e) => updateBatch(i, 'content', e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleBatch}
                disabled={batchLoading}
                className="btn-primary w-full"
              >
                {batchLoading ? 'Analyzing batch…' : `Verify ${batchArticles.filter((a) => a.title || a.content).length} Articles`}
              </button>
            </div>

            {batchLoading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">Running batch verification…</span>
              </div>
            )}

            {batchError && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{batchError}</div>}

            {batchResult && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Batch Results</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                      <th className="text-left p-4">Article</th>
                      <th className="text-left p-4">Score</th>
                      <th className="text-left p-4">Verdict</th>
                      <th className="text-left p-4 hidden md:table-cell">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(batchResult.results ?? batchResult).map((item: any, i: number) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="p-4 text-gray-200">{item.title ?? `Article ${i + 1}`}</td>
                        <td className="p-4">
                          <span className={`font-bold ${
                            Number(item.credibility_score ?? item.score) >= 70
                              ? 'text-green-400'
                              : Number(item.credibility_score ?? item.score) >= 40
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}>
                            {item.credibility_score ?? item.score ?? '—'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            (item.verdict ?? '').toUpperCase() === 'VERIFIED'
                              ? 'bg-green-900/40 text-green-400 border-green-800/40'
                              : (item.verdict ?? '').toUpperCase().includes('FAKE')
                              ? 'bg-red-900/40 text-red-400 border-red-800/40'
                              : 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40'
                          }`}>
                            {item.verdict ?? 'SUSPICIOUS'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500 hidden md:table-cell">{item.source ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
