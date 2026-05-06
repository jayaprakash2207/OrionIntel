'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { AlertTriangle, Activity, Shield, BarChart2 } from 'lucide-react'

const DEFAULT_CONTEXT = `Current market context: Global equity markets near all-time highs, credit spreads tight, VIX below 15, dollar strengthening, Fed holding rates, geopolitical tensions in Eastern Europe and South China Sea, crypto recovering, AI sector driving tech valuations.`

type RiskLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL'

function riskLevelStyle(level: RiskLevel | string) {
  const map: Record<string, string> = {
    LOW: 'bg-green-900/40 text-green-400 border-green-700/40',
    ELEVATED: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40',
    HIGH: 'bg-orange-900/40 text-orange-400 border-orange-700/40',
    CRITICAL: 'bg-red-900/40 text-red-400 border-red-700/40',
  }
  return map[level?.toUpperCase()] ?? 'bg-gray-800 text-gray-400 border-gray-700'
}

function RiskGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const hue = 120 - pct * 1.2
  return (
    <div className="relative h-36 w-36 mx-auto">
      <svg viewBox="0 0 120 120" className="absolute inset-0">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" strokeWidth="12" />
        <circle
          cx="60" cy="60" r="50" fill="none"
          stroke={`hsl(${hue}, 80%, 55%)`} strokeWidth="12"
          strokeDasharray={`${pct * 3.14} 314`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{Math.round(pct)}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  )
}

function SeverityBadge({ level }: { level: string }) {
  const upper = level?.toUpperCase()
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${riskLevelStyle(upper)}`}>
      {upper}
    </span>
  )
}

export default function BlackSwanPage() {
  const [tab, setTab] = useState<'scan' | 'volatility' | 'systemic'>('scan')
  const [marketContext, setMarketContext] = useState(DEFAULT_CONTEXT)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const [asset, setAsset] = useState('')
  const [volResult, setVolResult] = useState<any>(null)
  const [volLoading, setVolLoading] = useState(false)
  const [volError, setVolError] = useState('')

  const [sysResult, setSysResult] = useState<any>(null)
  const [sysLoading, setSysLoading] = useState(false)
  const [sysError, setSysError] = useState('')

  async function handleScan() {
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.blackSwanScan(marketContext)
    if (res?.data) {
      setResult(res.data)
    } else {
      setError(res?.error ?? 'Scan failed')
    }
    setLoading(false)
  }

  async function handleVol() {
    if (!asset.trim()) return
    setVolLoading(true)
    setVolResult(null)
    setVolError('')
    const res = await api.volatilityRegime(asset.trim())
    if (res?.data) {
      setVolResult(res.data)
    } else {
      setVolError(res?.error ?? 'Volatility analysis failed')
    }
    setVolLoading(false)
  }

  async function handleSystemic() {
    setSysLoading(true)
    setSysResult(null)
    setSysError('')
    const res = await api.systemicRiskDashboard()
    if (res?.data) {
      setSysResult(res.data)
    } else {
      setSysError(res?.error ?? 'Dashboard load failed')
    }
    setSysLoading(false)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-900/40 border border-red-700/40 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Black Swan Early Warning</h1>
            <p className="text-gray-400 text-sm">Silent panic detector — correlation breaks, liquidity warnings, volatility anomalies</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'scan', label: 'Market Scan', icon: AlertTriangle },
            { key: 'volatility', label: 'Volatility Regime', icon: Activity },
            { key: 'systemic', label: 'Systemic Risk', icon: Shield },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                tab === key
                  ? 'bg-red-900/40 border-red-700 text-red-200'
                  : 'border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Market Scan Tab */}
        {tab === 'scan' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <label className="text-xs text-gray-400 uppercase tracking-wide font-medium block">
                Market Context (optional override)
              </label>
              <textarea
                className="input-field resize-none"
                rows={4}
                value={marketContext}
                onChange={(e) => setMarketContext(e.target.value)}
              />
              <button
                onClick={handleScan}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                {loading ? 'Scanning markets…' : 'Scan Markets'}
              </button>
            </div>

            {loading && (
              <div className="space-y-2">
                {['Anomaly detection agent active…', 'Correlation break analysis running…', 'Liquidity stress indicators loading…'].map((msg, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                    <span className="flex gap-1">
                      {[0, 100, 200].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
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
                {/* Risk Score */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="text-center space-y-3">
                      <RiskGauge score={result.risk_score ?? result.overall_risk ?? 0} />
                      <div>
                        <span className={`text-lg font-bold px-4 py-2 rounded-xl border ${riskLevelStyle(result.risk_level ?? 'LOW')}`}>
                          {(result.risk_level ?? 'LOW').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      {result.summary && (
                        <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {result.anomaly_count !== undefined && (
                          <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-gray-500 text-xs">Anomalies Detected</p>
                            <p className="text-white font-bold text-xl">{result.anomaly_count}</p>
                          </div>
                        )}
                        {result.correlation_breaks !== undefined && (
                          <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-gray-500 text-xs">Correlation Breaks</p>
                            <p className="text-white font-bold text-xl">
                              {Array.isArray(result.correlation_breaks) ? result.correlation_breaks.length : result.correlation_breaks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anomalies */}
                {result.anomalies && result.anomalies.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Anomalies Detected</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.anomalies.map((a: any, i: number) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-semibold text-sm">{a.signal ?? a.name}</span>
                            <SeverityBadge level={a.severity ?? 'MEDIUM'} />
                          </div>
                          <p className="text-gray-400 text-xs">{a.description}</p>
                          {a.historical_precedent && (
                            <p className="text-yellow-400 text-xs">Precedent: {a.historical_precedent}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correlation Breaks */}
                {Array.isArray(result.correlation_breaks) && result.correlation_breaks.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Correlation Breaks</h2>
                    {result.correlation_breaks.map((cb: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-sm border-b border-gray-800 last:border-0 pb-3 last:pb-0">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">⚡</span>
                        <div>
                          <p className="text-gray-200">{typeof cb === 'string' ? cb : cb.description ?? cb.pair}</p>
                          {typeof cb === 'object' && cb.implication && (
                            <p className="text-gray-500 text-xs mt-0.5">{cb.implication}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Liquidity Warnings */}
                {result.liquidity_warnings && result.liquidity_warnings.length > 0 && (
                  <div className="bg-orange-950/30 border border-orange-800/40 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-orange-300 uppercase tracking-wide">Liquidity Warnings</h2>
                    {result.liquidity_warnings.map((w: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-orange-400 flex-shrink-0 mt-0.5">⚠</span>
                        <span className="text-gray-300">{typeof w === 'string' ? w : w.warning ?? w.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommended Hedges */}
                {result.recommended_hedges && result.recommended_hedges.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Recommended Hedges</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {result.recommended_hedges.map((h: any, i: number) => (
                        <div key={i} className="bg-green-950/20 border border-green-800/40 rounded-xl p-4">
                          <p className="text-green-400 text-sm font-semibold">
                            {typeof h === 'string' ? h : h.instrument ?? h.hedge}
                          </p>
                          {typeof h === 'object' && h.rationale && (
                            <p className="text-gray-400 text-xs mt-1">{h.rationale}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Volatility Regime Tab */}
        {tab === 'volatility' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Volatility Regime Analysis</h2>
              <div className="flex gap-3">
                <input
                  className="input-field flex-1"
                  placeholder="Asset (e.g. S&P 500, Gold, Bitcoin)"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVol()}
                />
                <button onClick={handleVol} disabled={volLoading || !asset.trim()} className="btn-primary">
                  {volLoading ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>
            </div>

            {volLoading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">Identifying volatility regime…</span>
              </div>
            )}

            {volError && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{volError}</div>}

            {volResult && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-lg">{volResult.asset ?? asset}</span>
                  {volResult.current_regime && (
                    <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${riskLevelStyle(volResult.regime_level ?? 'ELEVATED')}`}>
                      {volResult.current_regime}
                    </span>
                  )}
                </div>
                {volResult.description && <p className="text-gray-300 text-sm">{volResult.description}</p>}
                {volResult.historical_precedents && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Historical Precedents</p>
                    <div className="space-y-1">
                      {volResult.historical_precedents.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-400">•</span>
                          <span className="text-gray-300">{typeof p === 'string' ? p : p.period ?? JSON.stringify(p)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {volResult.what_typically_follows && (
                  <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-3">
                    <p className="text-xs text-blue-400 font-semibold uppercase mb-1">What Typically Follows</p>
                    <p className="text-gray-300 text-sm">{volResult.what_typically_follows}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Systemic Risk Tab */}
        {tab === 'systemic' && (
          <div className="space-y-4">
            <button
              onClick={handleSystemic}
              disabled={sysLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <BarChart2 className="h-4 w-4" />
              {sysLoading ? 'Loading dashboard…' : 'Load Systemic Risk Dashboard'}
            </button>

            {sysLoading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">Aggregating systemic risk indicators…</span>
              </div>
            )}

            {sysError && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{sysError}</div>}

            {sysResult && (
              <div className="space-y-4">
                {sysResult.overall_assessment && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Overall Assessment</p>
                    <p className="text-gray-200 text-sm">{sysResult.overall_assessment}</p>
                  </div>
                )}
                {sysResult.indicators && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-800">
                      <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Risk Indicators</h2>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                          <th className="text-left p-4">Indicator</th>
                          <th className="text-left p-4">Status</th>
                          <th className="text-left p-4">Level</th>
                          <th className="text-left p-4 hidden md:table-cell">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(sysResult.indicators) ? sysResult.indicators : Object.entries(sysResult.indicators).map(([k, v]: [string, any]) => ({ name: k, ...v }))).map((ind: any, i: number) => (
                          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="p-4 text-white font-medium">{ind.name ?? ind.indicator}</td>
                            <td className="p-4"><SeverityBadge level={ind.status ?? ind.level ?? 'LOW'} /></td>
                            <td className="p-4 text-gray-300">{ind.value ?? ind.reading ?? '—'}</td>
                            <td className="p-4 text-gray-500 hidden md:table-cell">{ind.note ?? ind.description ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
