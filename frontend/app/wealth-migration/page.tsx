'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { DollarSign, TrendingUp, TrendingDown, Search } from 'lucide-react'

const REGIONS = ['Global', 'North America', 'Europe', 'Asia', 'Middle East', 'LatAm']

function RetailLagBadge({ label }: { label: string }) {
  const upper = label?.toUpperCase()
  const style =
    upper === 'HIGH' || upper === 'SIGNIFICANT'
      ? 'bg-red-900/40 text-red-400 border-red-700/40'
      : upper === 'MEDIUM' || upper === 'MODERATE'
      ? 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40'
      : 'bg-green-900/40 text-green-400 border-green-700/40'
  return (
    <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${style}`}>
      Retail Lag: {label}
    </span>
  )
}

export default function WealthMigrationPage() {
  const [region, setRegion] = useState('Global')
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [flowsResult, setFlowsResult] = useState<any>(null)
  const [flowsError, setFlowsError] = useState('')

  const [swCountry, setSwCountry] = useState('')
  const [swLoading, setSwLoading] = useState(false)
  const [swResult, setSwResult] = useState<any>(null)
  const [swError, setSwError] = useState('')

  const [smartAsset, setSmartAsset] = useState('')
  const [smartLoading, setSmartLoading] = useState(false)
  const [smartResult, setSmartResult] = useState<any>(null)
  const [smartError, setSmartError] = useState('')

  async function handleFlows() {
    setFlowsLoading(true)
    setFlowsResult(null)
    setFlowsError('')
    const res = await api.wealthFlows(region)
    if (res?.data) {
      setFlowsResult(res.data)
    } else {
      setFlowsError(res?.error ?? 'Flow analysis failed')
    }
    setFlowsLoading(false)
  }

  async function handleSovereignWealth() {
    if (!swCountry.trim()) return
    setSwLoading(true)
    setSwResult(null)
    setSwError('')
    const res = await api.sovereignWealth(swCountry.trim())
    if (res?.data) {
      setSwResult(res.data)
    } else {
      setSwError(res?.error ?? 'Analysis failed')
    }
    setSwLoading(false)
  }

  async function handleSmartMoney() {
    if (!smartAsset.trim()) return
    setSmartLoading(true)
    setSmartResult(null)
    setSmartError('')
    const res = await api.smartMoneyDivergence(smartAsset.trim())
    if (res?.data) {
      setSmartResult(res.data)
    } else {
      setSmartError(res?.error ?? 'Divergence analysis failed')
    }
    setSmartLoading(false)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-900/40 border border-green-700/40 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Wealth Migration Tracker</h1>
            <p className="text-gray-400 text-sm">Follow sovereign wealth funds, family offices, and billionaires as they quietly reposition</p>
          </div>
        </div>

        {/* Global Wealth Flows */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Global Wealth Flows</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              className="input-field md:w-48"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={handleFlows}
              disabled={flowsLoading}
              className="btn-primary flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {flowsLoading ? 'Tracking flows…' : 'Track Wealth Flows'}
            </button>
          </div>

          {flowsLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="flex gap-1">
                {[0, 100, 200].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              <span>Aggregating sovereign and institutional flow data…</span>
            </div>
          )}

          {flowsError && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{flowsError}</div>}

          {flowsResult && (
            <div className="space-y-5 pt-2">
              {/* Inflows */}
              {flowsResult.inflows && flowsResult.inflows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <h3 className="text-sm font-bold text-green-300 uppercase tracking-wide">Inflows — Where Money Is Going</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {flowsResult.inflows.map((item: any, i: number) => (
                      <div key={i} className="bg-green-950/20 border border-green-800/40 rounded-xl p-4 space-y-1">
                        <p className="text-green-300 font-semibold text-sm">{typeof item === 'string' ? item : item.destination ?? item.name}</p>
                        {typeof item === 'object' && item.amount && (
                          <p className="text-gray-400 text-xs">{item.amount}</p>
                        )}
                        {typeof item === 'object' && item.reason && (
                          <p className="text-gray-400 text-xs">{item.reason}</p>
                        )}
                        {typeof item === 'object' && item.asset_class && (
                          <span className="text-xs bg-green-900/40 text-green-400 border border-green-800/40 px-2 py-0.5 rounded-full">
                            {item.asset_class}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outflows */}
              {flowsResult.outflows && flowsResult.outflows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <h3 className="text-sm font-bold text-red-300 uppercase tracking-wide">Outflows — Where Money Is Leaving</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {flowsResult.outflows.map((item: any, i: number) => (
                      <div key={i} className="bg-red-950/20 border border-red-800/40 rounded-xl p-4 space-y-1">
                        <p className="text-red-300 font-semibold text-sm">{typeof item === 'string' ? item : item.source ?? item.name}</p>
                        {typeof item === 'object' && item.amount && (
                          <p className="text-gray-400 text-xs">{item.amount}</p>
                        )}
                        {typeof item === 'object' && item.reason && (
                          <p className="text-gray-400 text-xs">{item.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rotation Themes */}
              {flowsResult.rotation_themes && flowsResult.rotation_themes.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Rotation Themes</h3>
                  {flowsResult.rotation_themes.map((theme: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm border-b border-gray-800 last:border-0 pb-3 last:pb-0">
                      <span className="text-purple-400 flex-shrink-0 font-bold">→</span>
                      <div>
                        <p className="text-gray-200 font-medium">{typeof theme === 'string' ? theme : theme.theme ?? theme.title}</p>
                        {typeof theme === 'object' && theme.description && (
                          <p className="text-gray-500 text-xs mt-0.5">{theme.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contrarian Signals */}
              {flowsResult.contrarian_signals && flowsResult.contrarian_signals.length > 0 && (
                <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-yellow-300 uppercase tracking-wide">Contrarian Signals</h3>
                  {flowsResult.contrarian_signals.map((sig: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-400 flex-shrink-0">⚡</span>
                      <div>
                        <p className="text-gray-200">{typeof sig === 'string' ? sig : sig.signal ?? sig.description}</p>
                        {typeof sig === 'object' && sig.implication && (
                          <p className="text-gray-500 text-xs mt-0.5">{sig.implication}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Retail Lag */}
              {flowsResult.retail_lag_indicator && (
                <div className="flex items-center gap-3">
                  <RetailLagBadge label={flowsResult.retail_lag_indicator} />
                  {flowsResult.retail_lag_description && (
                    <p className="text-gray-400 text-xs">{flowsResult.retail_lag_description}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sovereign Wealth Fund Analysis */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Sovereign Wealth Fund Analysis</h2>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="Country (e.g. Norway, Saudi Arabia, Singapore)"
              value={swCountry}
              onChange={(e) => setSwCountry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSovereignWealth()}
            />
            <button onClick={handleSovereignWealth} disabled={swLoading || !swCountry.trim()} className="btn-primary">
              {swLoading ? 'Analyzing…' : 'Analyze Fund'}
            </button>
          </div>

          {swLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="flex gap-1">
                {[0, 100, 200].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              <span>Analyzing sovereign wealth fund data…</span>
            </div>
          )}

          {swError && <div className="text-red-400 text-sm">{swError}</div>}

          {swResult && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-white font-bold text-lg">{swResult.fund_name ?? swResult.country}</h3>
                {swResult.aum && (
                  <span className="bg-green-900/40 text-green-400 border border-green-700/40 text-sm px-3 py-1 rounded-full">
                    AUM: {swResult.aum}
                  </span>
                )}
              </div>
              {swResult.known_sectors && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Known Sectors</p>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(swResult.known_sectors) ? swResult.known_sectors : [swResult.known_sectors]).map((s: any, i: number) => (
                      <span key={i} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-full">
                        {typeof s === 'string' ? s : s.sector}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {swResult.recent_moves && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Recent Moves</p>
                  <div className="space-y-2">
                    {(Array.isArray(swResult.recent_moves) ? swResult.recent_moves : [swResult.recent_moves]).map((move: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-400 flex-shrink-0">•</span>
                        <span className="text-gray-300">{typeof move === 'string' ? move : move.move ?? move.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {swResult.strategic_thesis && (
                <div className="bg-blue-950/20 border border-blue-800/40 rounded-lg p-3">
                  <p className="text-xs text-blue-400 font-semibold uppercase mb-1">Strategic Thesis</p>
                  <p className="text-gray-300 text-sm">{swResult.strategic_thesis}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Smart Money vs Retail */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Smart Money vs Retail Divergence</h2>
          </div>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="Asset (e.g. Gold, Bitcoin, Nvidia)"
              value={smartAsset}
              onChange={(e) => setSmartAsset(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSmartMoney()}
            />
            <button onClick={handleSmartMoney} disabled={smartLoading || !smartAsset.trim()} className="btn-primary">
              {smartLoading ? 'Analyzing…' : 'Analyze Divergence'}
            </button>
          </div>

          {smartLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="flex gap-1">
                {[0, 100, 200].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              <span>Measuring smart money vs retail positioning…</span>
            </div>
          )}

          {smartError && <div className="text-red-400 text-sm">{smartError}</div>}

          {smartResult && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {smartResult.divergence_level !== undefined && (
                  <div className="bg-gray-800 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Divergence Level</p>
                    <p className={`text-3xl font-bold ${
                      Number(smartResult.divergence_level) >= 70 ? 'text-red-400' :
                      Number(smartResult.divergence_level) >= 40 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {smartResult.divergence_level}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">/ 100</p>
                  </div>
                )}
                {smartResult.smart_money_position && (
                  <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Smart Money</p>
                    <p className={`text-lg font-bold ${
                      smartResult.smart_money_position === 'Accumulating' || smartResult.smart_money_position === 'Bullish'
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {smartResult.smart_money_position}
                    </p>
                  </div>
                )}
                {smartResult.retail_position && (
                  <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Retail</p>
                    <p className={`text-lg font-bold ${
                      smartResult.retail_position === 'Buying' || smartResult.retail_position === 'Bullish'
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {smartResult.retail_position}
                    </p>
                  </div>
                )}
              </div>
              {smartResult.what_smart_money_sees && (
                <div className="bg-purple-950/20 border border-purple-800/40 rounded-lg p-4">
                  <p className="text-xs text-purple-400 font-semibold uppercase mb-1">What Smart Money Sees</p>
                  <p className="text-gray-300 text-sm">{smartResult.what_smart_money_sees}</p>
                </div>
              )}
              {smartResult.timing_signal && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Timing Signal</p>
                  <p className="text-white font-semibold">{smartResult.timing_signal}</p>
                  {smartResult.timing_rationale && (
                    <p className="text-gray-400 text-xs mt-1">{smartResult.timing_rationale}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
