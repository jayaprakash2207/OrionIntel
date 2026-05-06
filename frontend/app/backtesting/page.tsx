'use client'

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { FlaskConical, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

const PERIODS = ['1 year', '3 years', '5 years', '10 years', '20 years']

function MetricCard({
  label,
  value,
  positive,
  neutral,
}: {
  label: string
  value: string
  positive?: boolean
  neutral?: boolean
}) {
  const color = neutral
    ? 'text-gray-200'
    : positive
    ? 'text-green-400'
    : 'text-red-400'
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-1">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function BacktestingPage() {
  const [tab, setTab] = useState<'single' | 'compare' | 'optimize'>('single')

  const [strategy, setStrategy] = useState('')
  const [asset, setAsset] = useState('')
  const [period, setPeriod] = useState('10 years')
  const [capital, setCapital] = useState(10000)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const [strategies, setStrategies] = useState(['', ''])
  const [compareAsset, setCompareAsset] = useState('')
  const [comparePeriod, setComparePeriod] = useState('10 years')
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareResult, setCompareResult] = useState<any>(null)
  const [compareError, setCompareError] = useState('')

  const [optAsset, setOptAsset] = useState('')
  const [optGoal, setOptGoal] = useState('')
  const [optLoading, setOptLoading] = useState(false)
  const [optResult, setOptResult] = useState<any>(null)
  const [optError, setOptError] = useState('')

  async function handleRun() {
    if (!strategy.trim() || !asset.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await api.runBacktest(strategy.trim(), asset.trim(), period, capital)
    if (res?.data) {
      setResult(res.data)
    } else {
      setError(res?.error ?? 'Backtest failed')
    }
    setLoading(false)
  }

  async function handleCompare() {
    const valid = strategies.filter((s) => s.trim())
    if (valid.length < 2 || !compareAsset.trim()) return
    setCompareLoading(true)
    setCompareResult(null)
    setCompareError('')
    const res = await api.compareStrategies(valid, compareAsset.trim(), comparePeriod)
    if (res?.data) {
      setCompareResult(res.data)
    } else {
      setCompareError(res?.error ?? 'Comparison failed')
    }
    setCompareLoading(false)
  }

  async function handleOptimize() {
    if (!optAsset.trim() || !optGoal.trim()) return
    setOptLoading(true)
    setOptResult(null)
    setOptError('')
    const res = await api.optimizeEntryExit(optAsset.trim(), optGoal.trim())
    if (res?.data) {
      setOptResult(res.data)
    } else {
      setOptError(res?.error ?? 'Optimization failed')
    }
    setOptLoading(false)
  }

  function addStrategy() {
    setStrategies([...strategies, ''])
  }

  function removeStrategy(i: number) {
    setStrategies(strategies.filter((_, idx) => idx !== i))
  }

  function updateStrategy(i: number, val: string) {
    const updated = [...strategies]
    updated[i] = val
    setStrategies(updated)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Strategy Backtesting Engine</h1>
            <p className="text-gray-400 text-sm">Test any investment thesis against historical data before risking real money</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'single', label: 'Run Backtest' },
            { key: 'compare', label: 'Compare Strategies' },
            { key: 'optimize', label: 'Optimize Entry/Exit' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                tab === key
                  ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200'
                  : 'border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Single Backtest */}
        {tab === 'single' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Strategy Description *</label>
                <textarea
                  className="input-field resize-none"
                  rows={4}
                  placeholder="e.g. Buy when RSI drops below 30 and price crosses above 50-day MA, sell when RSI exceeds 70 or 15% trailing stop hit"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Asset *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. S&P 500"
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Time Period</label>
                  <select
                    className="input-field"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1.5">Initial Capital ($)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                  />
                </div>
              </div>
              <button
                onClick={handleRun}
                disabled={loading || !strategy.trim() || !asset.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <FlaskConical className="h-4 w-4" />
                {loading ? 'Running backtest…' : 'Run Backtest'}
              </button>
            </div>

            {loading && (
              <div className="space-y-2">
                {['Loading historical data…', 'Executing strategy rules…', 'Calculating performance metrics…'].map((msg, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                    <span className="flex gap-1">
                      {[0, 100, 200].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
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
                {/* Key Metrics */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Key Metrics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricCard
                      label="Final Value"
                      value={`$${Number(result.final_value ?? capital).toLocaleString()}`}
                      positive={Number(result.final_value) > capital}
                      neutral={result.final_value === undefined}
                    />
                    <MetricCard
                      label="Total Return"
                      value={`${result.total_return_pct !== undefined ? (Number(result.total_return_pct) >= 0 ? '+' : '') + Number(result.total_return_pct).toFixed(1) + '%' : '—'}`}
                      positive={Number(result.total_return_pct) >= 0}
                    />
                    <MetricCard
                      label="Annualized Return"
                      value={`${result.annualized_return !== undefined ? (Number(result.annualized_return) >= 0 ? '+' : '') + Number(result.annualized_return).toFixed(1) + '%' : '—'}`}
                      positive={Number(result.annualized_return) >= 0}
                    />
                    <MetricCard
                      label="Max Drawdown"
                      value={`${result.max_drawdown !== undefined ? '-' + Math.abs(Number(result.max_drawdown)).toFixed(1) + '%' : '—'}`}
                      positive={false}
                    />
                    <MetricCard
                      label="Sharpe Ratio"
                      value={result.sharpe_ratio !== undefined ? Number(result.sharpe_ratio).toFixed(2) : '—'}
                      positive={Number(result.sharpe_ratio) > 1}
                    />
                    <MetricCard
                      label="Win Rate"
                      value={result.win_rate !== undefined ? Number(result.win_rate).toFixed(1) + '%' : '—'}
                      positive={Number(result.win_rate) >= 55}
                    />
                  </div>
                </div>

                {/* vs Buy & Hold */}
                {result.buy_and_hold_comparison && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">vs Buy & Hold</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Your Strategy</p>
                        <p className={`text-xl font-bold ${Number(result.total_return_pct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {result.total_return_pct !== undefined ? (Number(result.total_return_pct) >= 0 ? '+' : '') + Number(result.total_return_pct).toFixed(1) + '%' : '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Buy & Hold</p>
                        <p className={`text-xl font-bold ${Number(result.buy_and_hold_comparison.return_pct ?? result.buy_and_hold_comparison) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {typeof result.buy_and_hold_comparison === 'object'
                            ? (Number(result.buy_and_hold_comparison.return_pct) >= 0 ? '+' : '') + Number(result.buy_and_hold_comparison.return_pct).toFixed(1) + '%'
                            : result.buy_and_hold_comparison}
                        </p>
                      </div>
                    </div>
                    {result.buy_and_hold_comparison?.verdict && (
                      <p className="text-gray-400 text-sm mt-3">{result.buy_and_hold_comparison.verdict}</p>
                    )}
                  </div>
                )}

                {/* Historical Periods */}
                {result.key_historical_periods && result.key_historical_periods.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Key Historical Periods</h2>
                    <div className="space-y-2">
                      {result.key_historical_periods.map((period: any, i: number) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <span className="text-yellow-400 font-bold text-sm">{period.year ?? period.period}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-200 text-sm font-medium">{period.event}</p>
                            {period.strategy_response && (
                              <p className="text-gray-400 text-xs mt-0.5">{period.strategy_response}</p>
                            )}
                          </div>
                          {period.return_pct !== undefined && (
                            <span className={`text-sm font-bold flex-shrink-0 ${Number(period.return_pct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {Number(period.return_pct) >= 0 ? '+' : ''}{Number(period.return_pct).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.strengths && result.strengths.length > 0 && (
                    <div className="bg-green-950/20 border border-green-800/40 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <h2 className="text-sm font-bold text-green-300 uppercase tracking-wide">Strengths</h2>
                      </div>
                      {result.strengths.map((s: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-green-400">+</span>
                          <span className="text-gray-300">{typeof s === 'string' ? s : s.strength}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.weaknesses && result.weaknesses.length > 0 && (
                    <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        <h2 className="text-sm font-bold text-red-300 uppercase tracking-wide">Weaknesses</h2>
                      </div>
                      {result.weaknesses.map((w: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-red-400">−</span>
                          <span className="text-gray-300">{typeof w === 'string' ? w : w.weakness}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optimization Suggestions */}
                {result.optimization_suggestions && result.optimization_suggestions.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Optimization Suggestions</h2>
                    {result.optimization_suggestions.map((sug: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-purple-400 flex-shrink-0">→</span>
                        <span className="text-gray-300">{typeof sug === 'string' ? sug : sug.suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Compare Strategies */}
        {tab === 'compare' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Strategies</h2>
                <button
                  onClick={addStrategy}
                  className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Strategy
                </button>
              </div>
              {strategies.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 w-6 flex-shrink-0">#{i + 1}</span>
                  <input
                    className="input-field flex-1"
                    placeholder={`Strategy ${i + 1} description`}
                    value={s}
                    onChange={(e) => updateStrategy(i, e.target.value)}
                  />
                  {strategies.length > 2 && (
                    <button
                      onClick={() => removeStrategy(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Asset</label>
                  <input
                    className="input-field"
                    placeholder="e.g. S&P 500"
                    value={compareAsset}
                    onChange={(e) => setCompareAsset(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Period</label>
                  <select
                    className="input-field"
                    value={comparePeriod}
                    onChange={(e) => setComparePeriod(e.target.value)}
                  >
                    {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={handleCompare}
                disabled={compareLoading || strategies.filter((s) => s.trim()).length < 2 || !compareAsset.trim()}
                className="btn-primary w-full"
              >
                {compareLoading ? 'Comparing…' : 'Compare Head-to-Head'}
              </button>
            </div>

            {compareLoading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">Running comparative backtests…</span>
              </div>
            )}

            {compareError && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{compareError}</div>}

            {compareResult && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Comparison Results</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                      <th className="text-left p-4">Strategy</th>
                      <th className="text-left p-4">Return</th>
                      <th className="text-left p-4">Sharpe</th>
                      <th className="text-left p-4">Max DD</th>
                      <th className="text-left p-4">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compareResult.results ?? compareResult.strategies ?? []).map((item: any, i: number) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="p-4 text-gray-200 max-w-xs">
                          <p className="truncate">{item.strategy_name ?? item.strategy ?? `Strategy ${i + 1}`}</p>
                        </td>
                        <td className="p-4">
                          <span className={`font-semibold ${Number(item.total_return_pct ?? item.return) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(item.total_return_pct ?? item.return) >= 0 ? '+' : ''}
                            {Number(item.total_return_pct ?? item.return ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4 text-gray-300">{item.sharpe_ratio !== undefined ? Number(item.sharpe_ratio).toFixed(2) : '—'}</td>
                        <td className="p-4 text-red-400">{item.max_drawdown !== undefined ? '-' + Math.abs(Number(item.max_drawdown)).toFixed(1) + '%' : '—'}</td>
                        <td className="p-4 text-gray-300">{item.win_rate !== undefined ? Number(item.win_rate).toFixed(1) + '%' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {compareResult.winner && (
                  <div className="p-4 border-t border-gray-800 bg-green-950/20">
                    <p className="text-green-400 text-sm font-semibold">Best Strategy: {compareResult.winner}</p>
                    {compareResult.winner_rationale && (
                      <p className="text-gray-400 text-xs mt-1">{compareResult.winner_rationale}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Optimize Entry/Exit */}
        {tab === 'optimize' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Optimize Entry & Exit Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Asset *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Gold, BTC, SPY"
                    value={optAsset}
                    onChange={(e) => setOptAsset(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Strategy Goal *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Minimize drawdown while capturing 80% of upside"
                    value={optGoal}
                    onChange={(e) => setOptGoal(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={handleOptimize}
                disabled={optLoading || !optAsset.trim() || !optGoal.trim()}
                className="btn-primary w-full"
              >
                {optLoading ? 'Optimizing…' : 'Find Optimal Entry & Exit Signals'}
              </button>
            </div>

            {optLoading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-gray-400 text-sm">Analyzing optimal signal combinations…</span>
              </div>
            )}

            {optError && <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{optError}</div>}

            {optResult && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                  {optResult.optimal_entry && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Optimal Entry Signals</p>
                      <div className="space-y-2">
                        {(Array.isArray(optResult.optimal_entry) ? optResult.optimal_entry : [optResult.optimal_entry]).map((s: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-green-400 flex-shrink-0">▲</span>
                            <span className="text-gray-300">{typeof s === 'string' ? s : s.signal ?? s.condition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {optResult.optimal_exit && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Optimal Exit Signals</p>
                      <div className="space-y-2">
                        {(Array.isArray(optResult.optimal_exit) ? optResult.optimal_exit : [optResult.optimal_exit]).map((s: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-red-400 flex-shrink-0">▼</span>
                            <span className="text-gray-300">{typeof s === 'string' ? s : s.signal ?? s.condition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {optResult.expected_improvement && (
                    <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3">
                      <p className="text-xs text-emerald-400 font-semibold uppercase mb-1">Expected Improvement</p>
                      <p className="text-gray-300 text-sm">{optResult.expected_improvement}</p>
                    </div>
                  )}
                  {optResult.caveats && (
                    <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-lg p-3">
                      <p className="text-xs text-yellow-400 font-semibold uppercase mb-1">Caveats</p>
                      <p className="text-gray-300 text-sm">{optResult.caveats}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
