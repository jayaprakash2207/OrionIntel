'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Mic, TrendingUp, TrendingDown, Minus } from 'lucide-react'

function TradingSignalBadge({ signal }: { signal: string }) {
  const upper = signal?.toUpperCase()
  if (upper === 'BULLISH') {
    return (
      <div className="flex items-center gap-2 bg-green-900/40 border border-green-700/40 rounded-xl px-5 py-3">
        <TrendingUp className="h-6 w-6 text-green-400" />
        <span className="text-2xl font-bold text-green-400">BULLISH</span>
      </div>
    )
  }
  if (upper === 'BEARISH') {
    return (
      <div className="flex items-center gap-2 bg-red-900/40 border border-red-700/40 rounded-xl px-5 py-3">
        <TrendingDown className="h-6 w-6 text-red-400" />
        <span className="text-2xl font-bold text-red-400">BEARISH</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-5 py-3">
      <Minus className="h-6 w-6 text-gray-400" />
      <span className="text-2xl font-bold text-gray-300">NEUTRAL</span>
    </div>
  )
}

function SeverityColor({ level }: { level: string }) {
  const upper = level?.toUpperCase()
  if (upper === 'HIGH' || upper === 'CRITICAL') return 'border-red-800/40 bg-red-950/30'
  if (upper === 'MEDIUM' || upper === 'MODERATE') return 'border-yellow-800/40 bg-yellow-950/20'
  return 'border-gray-700 bg-gray-800/50'
}

export default function CeoSpeechPage() {
  const [tab, setTab] = useState<'analyze' | 'compare'>('analyze')

  const [transcript, setTranscript] = useState('')
  const [company, setCompany] = useState('')
  const [speaker, setSpeaker] = useState('CEO')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const [currentTranscript, setCurrentTranscript] = useState('')
  const [previousTranscript, setPreviousTranscript] = useState('')
  const [compareCompany, setCompareCompany] = useState('')
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareResult, setCompareResult] = useState<any>(null)
  const [compareError, setCompareError] = useState('')

  async function handleAnalyze() {
    if (!transcript.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.ceoSpeechAnalyze(transcript.trim(), company, speaker, context)
    if (res?.data) {
      setResult(res.data)
    } else {
      setError(res?.error ?? 'Analysis failed')
    }
    setLoading(false)
  }

  async function handleCompare() {
    if (!currentTranscript.trim() || !previousTranscript.trim()) return
    setCompareLoading(true)
    setCompareResult(null)
    setCompareError('')
    const res = await api.ceoSpeechCompare(currentTranscript.trim(), previousTranscript.trim(), compareCompany)
    if (res?.data) {
      setCompareResult(res.data)
    } else {
      setCompareError(res?.error ?? 'Comparison failed')
    }
    setCompareLoading(false)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-900/40 border border-blue-700/40 flex items-center justify-center">
            <Mic className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">CEO Speech Pattern AI</h1>
            <p className="text-gray-400 text-sm">Detect hesitation, evasiveness, and behavioral shifts in executive communications</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'analyze', label: 'Analyze Speech' },
            { key: 'compare', label: 'Compare Quarters' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                tab === key
                  ? 'bg-blue-900/40 border-blue-700 text-blue-200'
                  : 'border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Analyze Tab */}
        {tab === 'analyze' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Company Name</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Tesla"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Speaker</label>
                  <input
                    className="input-field"
                    placeholder="e.g. CEO / CFO / Chairman"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Context (optional)</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Q3 2024 earnings call"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Transcript *</label>
                <textarea
                  className="input-field resize-none"
                  rows={10}
                  placeholder="Paste the earnings call transcript, speech, or executive communication here…"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading || !transcript.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Mic className="h-4 w-4" />
                {loading ? 'Analyzing speech patterns…' : 'Analyze Speech'}
              </button>
            </div>

            {loading && (
              <div className="space-y-2">
                {['Linguistic pattern scanner active…', 'Deception indicator analysis…', 'Behavioral shift detection…'].map((msg, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                    <span className="flex gap-1">
                      {[0, 100, 200].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
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
                {/* Overall Tone + Signal */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Overall Tone</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold px-4 py-2 rounded-xl border ${
                          result.overall_tone === 'Positive' || result.overall_tone === 'Confident'
                            ? 'bg-green-900/40 text-green-400 border-green-700/40'
                            : result.overall_tone === 'Negative' || result.overall_tone === 'Evasive'
                            ? 'bg-red-900/40 text-red-400 border-red-700/40'
                            : 'bg-gray-800 text-gray-300 border-gray-700'
                        }`}>
                          {result.overall_tone ?? 'Neutral'}
                        </span>
                        {result.confidence_score !== undefined && (
                          <div className="text-center">
                            <p className="text-3xl font-bold text-white">{result.confidence_score}</p>
                            <p className="text-xs text-gray-500">Confidence</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {result.trading_signal && (
                      <div className="md:ml-auto">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Trading Signal</p>
                        <TradingSignalBadge signal={result.trading_signal} />
                      </div>
                    )}
                  </div>
                  {result.behavioral_verdict && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Behavioral Verdict</p>
                      <p className="text-gray-200 text-sm">{result.behavioral_verdict}</p>
                    </div>
                  )}
                </div>

                {/* Deception Indicators */}
                {result.deception_indicators && result.deception_indicators.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Deception Indicators</h2>
                    {result.deception_indicators.map((ind: any, i: number) => (
                      <div key={i} className={`border rounded-xl p-4 space-y-2 ${SeverityColor(ind.severity ?? 'medium')}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold text-sm">{ind.pattern_name ?? ind.pattern}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            (ind.severity ?? '').toLowerCase() === 'high'
                              ? 'bg-red-900/40 text-red-400 border-red-800/40'
                              : (ind.severity ?? '').toLowerCase() === 'medium'
                              ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40'
                              : 'bg-gray-700 text-gray-400 border-gray-600'
                          }`}>
                            {ind.severity ?? 'Medium'}
                          </span>
                        </div>
                        {ind.quote && (
                          <blockquote className="text-gray-400 text-xs italic border-l-2 border-gray-600 pl-3">
                            &quot;{ind.quote}&quot;
                          </blockquote>
                        )}
                        {ind.what_it_means && (
                          <p className="text-gray-300 text-xs">{ind.what_it_means}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Positive Signals */}
                {result.positive_signals && result.positive_signals.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Positive Signals</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.positive_signals.map((sig: any, i: number) => (
                        <div key={i} className="bg-green-950/20 border border-green-800/40 rounded-xl p-4">
                          <p className="text-green-400 text-sm font-semibold">
                            {typeof sig === 'string' ? sig : sig.signal ?? sig.description}
                          </p>
                          {typeof sig === 'object' && sig.quote && (
                            <blockquote className="text-gray-400 text-xs italic mt-1">&quot;{sig.quote}&quot;</blockquote>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concerning Phrases */}
                {result.concerning_phrases && result.concerning_phrases.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Concerning Phrases</h2>
                    <div className="space-y-2">
                      {result.concerning_phrases.map((phrase: any, i: number) => (
                        <div key={i} className="bg-red-950/20 border border-red-800/30 rounded-lg p-3">
                          <blockquote className="text-red-300 text-sm italic">
                            &quot;{typeof phrase === 'string' ? phrase : phrase.quote ?? phrase.phrase}&quot;
                          </blockquote>
                          {typeof phrase === 'object' && phrase.analysis && (
                            <p className="text-gray-400 text-xs mt-1">{phrase.analysis}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Language Analysis */}
                {result.language_analysis && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Language Analysis</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(result.language_analysis).map(([key, val]) => (
                        <div key={key} className="bg-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-white font-semibold text-sm mt-1">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Compare Tab */}
        {tab === 'compare' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Company</label>
                <input
                  className="input-field"
                  placeholder="Company name"
                  value={compareCompany}
                  onChange={(e) => setCompareCompany(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Current Quarter Transcript *</label>
                  <textarea
                    className="input-field resize-none"
                    rows={8}
                    placeholder="Paste current quarter transcript…"
                    value={currentTranscript}
                    onChange={(e) => setCurrentTranscript(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Previous Quarter Transcript *</label>
                  <textarea
                    className="input-field resize-none"
                    rows={8}
                    placeholder="Paste previous quarter transcript…"
                    value={previousTranscript}
                    onChange={(e) => setPreviousTranscript(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={handleCompare}
                disabled={compareLoading || !currentTranscript.trim() || !previousTranscript.trim()}
                className="btn-primary w-full"
              >
                {compareLoading ? 'Comparing transcripts…' : 'Compare to Previous Quarter'}
              </button>
            </div>

            {compareLoading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">Running quarter-over-quarter comparison…</span>
              </div>
            )}

            {compareError && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{compareError}</div>}

            {compareResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {compareResult.tone_shift && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tone Shift</p>
                      <p className="text-white font-semibold">{compareResult.tone_shift}</p>
                      {compareResult.tone_direction && (
                        <p className={`text-sm mt-1 ${
                          compareResult.tone_direction === 'more_positive' ? 'text-green-400' :
                          compareResult.tone_direction === 'more_negative' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {compareResult.tone_direction.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  )}
                  {compareResult.confidence_change !== undefined && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Confidence Change</p>
                      <p className={`text-2xl font-bold ${Number(compareResult.confidence_change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {Number(compareResult.confidence_change) >= 0 ? '+' : ''}{compareResult.confidence_change}
                      </p>
                    </div>
                  )}
                </div>
                {compareResult.new_concerns && compareResult.new_concerns.length > 0 && (
                  <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-red-400 font-semibold uppercase tracking-wide">New Concerns This Quarter</p>
                    {compareResult.new_concerns.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-red-500 flex-shrink-0">▲</span>
                        <span className="text-gray-300">{typeof c === 'string' ? c : c.concern}</span>
                      </div>
                    ))}
                  </div>
                )}
                {compareResult.dropped_topics && compareResult.dropped_topics.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Dropped Topics (no longer mentioned)</p>
                    <div className="flex flex-wrap gap-2">
                      {compareResult.dropped_topics.map((t: any, i: number) => (
                        <span key={i} className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-3 py-1 rounded-full line-through">
                          {typeof t === 'string' ? t : t.topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {compareResult.verdict && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Quarter-over-Quarter Verdict</p>
                    <p className="text-gray-200 text-sm">{compareResult.verdict}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
