'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { PieChart, Plus, Trash2, Zap } from 'lucide-react'

type Position = { asset: string; value: number; type: string }

const ASSET_TYPES = ['stock', 'crypto', 'bond', 'commodity', 'etf']
const SCENARIOS = [
  'US Recession 2025',
  'Fed Rate Hike +200bps',
  'Dollar Collapse',
  'China-Taiwan Conflict',
  'Oil Price Spike +80%',
  'Global Credit Crisis',
]

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-32 w-32">
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
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-300">{label}</span>
    </div>
  )
}

function RiskBadge({ level }: { level: string }) {
  const cls =
    level === 'High' || level === 'Critical'
      ? 'bg-red-900/40 text-red-400 border-red-800/40'
      : level === 'Medium' || level === 'Moderate'
      ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40'
      : 'bg-green-900/40 text-green-400 border-green-800/40'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{level}</span>
  )
}

export default function PortfolioExposurePage() {
  const [tab, setTab] = useState<'exposure' | 'stress'>('exposure')
  const [positions, setPositions] = useState<Position[]>([
    { asset: 'Apple (AAPL)', value: 15000, type: 'stock' },
    { asset: 'Bitcoin', value: 10000, type: 'crypto' },
    { asset: 'US Treasury 10Y', value: 20000, type: 'bond' },
  ])
  const [totalCapital, setTotalCapital] = useState(100000)
  const [scenario, setScenario] = useState(SCENARIOS[0])
  const [customScenario, setCustomScenario] = useState('')
  const [loading, setLoading] = useState(false)
  const [stressLoading, setStressLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [stressResult, setStressResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [stressError, setStressError] = useState('')

  function addPosition() {
    setPositions([...positions, { asset: '', value: 0, type: 'stock' }])
  }

  function removePosition(i: number) {
    setPositions(positions.filter((_, idx) => idx !== i))
  }

  function updatePosition(i: number, field: keyof Position, value: string | number) {
    const updated = [...positions]
    updated[i] = { ...updated[i], [field]: value }
    setPositions(updated)
  }

  async function handleAnalyze() {
    const valid = positions.filter((p) => p.asset.trim() && p.value > 0)
    if (!valid.length) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.portfolioExposure(valid, totalCapital)
    if (res?.data) {
      setResult(res.data)
    } else {
      setError(res?.error ?? 'Analysis failed')
    }
    setLoading(false)
  }

  async function handleStress() {
    const valid = positions.filter((p) => p.asset.trim() && p.value > 0)
    if (!valid.length) return
    const sc = customScenario.trim() || scenario
    setStressLoading(true)
    setStressResult(null)
    setStressError('')
    const res = await api.portfolioStress(valid, sc)
    if (res?.data) {
      setStressResult(res.data)
    } else {
      setStressError(res?.error ?? 'Stress test failed')
    }
    setStressLoading(false)
  }

  const totalValue = positions.reduce((s, p) => s + Number(p.value), 0)

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-900/40 border border-purple-700/40 flex items-center justify-center">
            <PieChart className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Portfolio Exposure Map</h1>
            <p className="text-gray-400 text-sm">Analyze your portfolio&apos;s geographic, sector, and currency exposures</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['exposure', 'stress'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                tab === t
                  ? 'bg-purple-900/40 border-purple-700 text-purple-200'
                  : 'border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'exposure' ? 'Exposure Analysis' : 'Stress Test'}
            </button>
          ))}
        </div>

        {/* Positions Builder */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Positions</h2>
            <span className="text-xs text-gray-500">
              Total: <span className="text-white font-semibold">${totalValue.toLocaleString()}</span>
            </span>
          </div>
          <div className="space-y-2">
            {positions.map((pos, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="input-field col-span-5"
                  placeholder="Asset name (e.g. Apple AAPL)"
                  value={pos.asset}
                  onChange={(e) => updatePosition(i, 'asset', e.target.value)}
                />
                <input
                  type="number"
                  className="input-field col-span-3"
                  placeholder="Value ($)"
                  value={pos.value || ''}
                  onChange={(e) => updatePosition(i, 'value', Number(e.target.value))}
                />
                <select
                  className="input-field col-span-3"
                  value={pos.type}
                  onChange={(e) => updatePosition(i, 'type', e.target.value)}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <button
                  onClick={() => removePosition(i)}
                  className="col-span-1 flex items-center justify-center h-9 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addPosition}
              className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Position
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-400">Total Capital ($)</span>
              <input
                type="number"
                className="input-field w-36"
                value={totalCapital}
                onChange={(e) => setTotalCapital(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Exposure Tab */}
        {tab === 'exposure' && (
          <>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Analyzing exposure…' : 'Analyze Exposure'}
            </button>

            {loading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">Mapping geographic, sector, and currency exposures…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Diversification Score */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ScoreGauge
                      score={result.diversification_score ?? result.overall_score ?? 0}
                      label="Diversification Score"
                    />
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Overall Assessment</p>
                        <p className="text-gray-200 text-sm">{result.assessment ?? result.summary ?? 'Portfolio analysis complete.'}</p>
                      </div>
                      {result.concentration_risk && (
                        <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3">
                          <p className="text-xs text-yellow-400 font-semibold uppercase mb-1">Concentration Risk</p>
                          <p className="text-gray-300 text-sm">{result.concentration_risk}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Geographic Exposure */}
                {result.geographic_exposure && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Geographic Exposure</h2>
                    <div className="space-y-2">
                      {(Array.isArray(result.geographic_exposure)
                        ? result.geographic_exposure
                        : Object.entries(result.geographic_exposure).map(([region, pct]) => ({ region, pct }))
                      ).map((item: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-200">{item.region ?? item.name}</span>
                            <div className="flex items-center gap-2">
                              <RiskBadge level={item.risk ?? item.risk_level ?? 'Low'} />
                              <span className="text-gray-400 font-medium w-12 text-right">
                                {typeof item.pct === 'number' ? item.pct.toFixed(1) : item.pct}%
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-800 rounded-full h-1.5">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Number(item.pct) || 0)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sector Exposure */}
                {result.sector_exposure && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Sector Exposure</h2>
                    <div className="space-y-2">
                      {(Array.isArray(result.sector_exposure)
                        ? result.sector_exposure
                        : Object.entries(result.sector_exposure).map(([sector, pct]) => ({ sector, pct }))
                      ).map((item: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-200">{item.sector ?? item.name}</span>
                            <div className="flex items-center gap-2">
                              <RiskBadge level={item.risk ?? item.risk_level ?? 'Low'} />
                              <span className="text-gray-400 font-medium w-12 text-right">
                                {typeof item.pct === 'number' ? item.pct.toFixed(1) : item.pct}%
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-800 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Number(item.pct) || 0)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Risks */}
                {result.top_risks && result.top_risks.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Top Risks</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.top_risks.map((risk: any, i: number) => (
                        <div key={i} className="bg-red-950/30 border border-red-800/40 rounded-xl p-4">
                          <p className="text-red-400 font-semibold text-sm mb-1">{typeof risk === 'string' ? risk : risk.risk ?? risk.title}</p>
                          {typeof risk === 'object' && risk.description && (
                            <p className="text-gray-400 text-xs">{risk.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Hedges */}
                {result.recommended_hedges && result.recommended_hedges.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Recommended Hedges</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {result.recommended_hedges.map((hedge: any, i: number) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                          <p className="text-green-400 font-semibold text-sm mb-1">
                            {typeof hedge === 'string' ? hedge : hedge.instrument ?? hedge.hedge}
                          </p>
                          {typeof hedge === 'object' && hedge.rationale && (
                            <p className="text-gray-400 text-xs">{hedge.rationale}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rebalancing Suggestions */}
                {result.rebalancing_suggestions && result.rebalancing_suggestions.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Rebalancing Suggestions</h2>
                    <div className="space-y-2">
                      {result.rebalancing_suggestions.map((sug: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span className="text-gray-300">{typeof sug === 'string' ? sug : sug.suggestion ?? JSON.stringify(sug)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Stress Test Tab */}
        {tab === 'stress' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Scenario Selection</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Preset Scenarios</label>
                  <select
                    className="input-field"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                  >
                    {SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Custom Scenario (overrides preset)</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Major central bank insolvency"
                    value={customScenario}
                    onChange={(e) => setCustomScenario(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleStress}
              disabled={stressLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {stressLoading ? 'Running stress test…' : 'Stress Test Portfolio'}
            </button>

            {stressLoading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">Simulating portfolio under scenario conditions…</span>
              </div>
            )}

            {stressError && (
              <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{stressError}</div>
            )}

            {stressResult && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Scenario Impact</h2>
                    {stressResult.scenario_name && (
                      <span className="text-xs bg-orange-900/40 text-orange-400 border border-orange-800/40 px-3 py-1 rounded-full">
                        {stressResult.scenario_name}
                      </span>
                    )}
                  </div>
                  {stressResult.estimated_loss_pct !== undefined && (
                    <div className="text-center py-4">
                      <p className="text-5xl font-bold text-red-400">
                        -{Math.abs(stressResult.estimated_loss_pct).toFixed(1)}%
                      </p>
                      <p className="text-gray-400 text-sm mt-1">Estimated Portfolio Loss</p>
                    </div>
                  )}
                  {stressResult.narrative && (
                    <p className="text-gray-300 text-sm mt-3">{stressResult.narrative}</p>
                  )}
                </div>

                {stressResult.asset_impacts && stressResult.asset_impacts.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-800">
                      <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Asset-Level Impacts</h2>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                          <th className="text-left p-4">Asset</th>
                          <th className="text-left p-4">Impact</th>
                          <th className="text-left p-4">Severity</th>
                          <th className="text-left p-4 hidden md:table-cell">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stressResult.asset_impacts.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="p-4 text-white font-medium">{item.asset}</td>
                            <td className="p-4">
                              <span className={`font-semibold ${Number(item.impact_pct) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {Number(item.impact_pct) > 0 ? '+' : ''}{Number(item.impact_pct).toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-4"><RiskBadge level={item.severity ?? 'Medium'} /></td>
                            <td className="p-4 text-gray-400 hidden md:table-cell">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {stressResult.hedging_advice && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Hedging Advice</h2>
                    <p className="text-gray-300 text-sm">{stressResult.hedging_advice}</p>
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
