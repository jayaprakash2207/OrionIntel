'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Globe2, Map } from 'lucide-react'

const colors = {
  low: 'bg-green-500',
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-red-600',
}

type RiskScore = {
  country: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  primary_concern?: string
  market_watch?: string
}

function RiskGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const hue = 120 - (pct * 1.2)
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-300 font-semibold">
        <Globe2 className="h-4 w-4 text-purple-300" />
        Risk Score
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 120 120" className="absolute inset-0">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={`hsl(${hue}, 75%, 55%)`}
              strokeWidth="12"
              strokeDasharray={`${pct * 3.14} 314`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{Math.round(pct)}</span>
          </div>
        </div>
        <div className="space-y-1 text-sm text-gray-300">
          <p>0 = calm · 100 = critical</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-full bg-green-500" /> Low
            <span className="w-3 h-3 rounded-full bg-amber-400" /> Medium
            <span className="w-3 h-3 rounded-full bg-orange-500" /> High
            <span className="w-3 h-3 rounded-full bg-red-600" /> Critical
          </div>
        </div>
      </div>
    </div>
  )
}

function RiskTable({ data }: { data: RiskScore[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
        <Map className="h-4 w-4 text-purple-300" />
        Global Risk Map
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left py-2">Country</th>
              <th className="text-left">Score</th>
              <th className="text-left">Level</th>
              <th className="text-left">Primary concern</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-gray-200">
            {data.map((row) => (
              <tr key={row.country} className="hover:bg-gray-800/60">
                <td className="py-2">{row.country}</td>
                <td>{Math.round(row.risk_score)}</td>
                <td>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold text-gray-900 ${
                      colors[row.risk_level] ?? 'bg-gray-500'
                    }`}
                  >
                    {row.risk_level}
                  </span>
                </td>
                <td className="text-gray-400">{row.primary_concern || row.market_watch || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function GeoRiskPage() {
  const [tab, setTab] = useState<'country' | 'global'>('country')
  const [country, setCountry] = useState('Taiwan')
  const [countryData, setCountryData] = useState<any>(null)
  const [loadingCountry, setLoadingCountry] = useState(false)
  const [globalData, setGlobalData] = useState<RiskScore[]>([])
  const [loadingGlobal, setLoadingGlobal] = useState(false)

  const fetchCountry = useCallback(async () => {
    if (!country.trim()) return
    setLoadingCountry(true)
    const res = await api.geoRisk(country.trim())
    setCountryData(res?.data ?? res)
    setLoadingCountry(false)
  }, [country])

  const fetchGlobal = useCallback(async () => {
    setLoadingGlobal(true)
    const res = await api.globalRiskMap()
    const rows = (res?.data?.scores ?? res?.data ?? []) as RiskScore[]
    setGlobalData(rows)
    setLoadingGlobal(false)
  }, [])

  useEffect(() => {
    fetchCountry()
    fetchGlobal()
  }, [fetchCountry, fetchGlobal])

  const gaugeScore = useMemo(() => {
    const val = countryData?.overall_risk_score ?? countryData?.risk_score
    return typeof val === 'number' ? val : 0
  }, [countryData])

  const categories = countryData?.categories || countryData?.analysis?.categories || {}

  return (
    <DashboardShell>
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Globe2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Geopolitical Risk</h1>
            <p className="text-sm text-gray-400">Country score and global risk map</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              tab === 'country' ? 'bg-purple-900/40 border-purple-700 text-purple-200' : 'border-gray-800 text-gray-400'
            }`}
            onClick={() => setTab('country')}
          >
            Country Score
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              tab === 'global' ? 'bg-purple-900/40 border-purple-700 text-purple-200' : 'border-gray-800 text-gray-400'
            }`}
            onClick={() => setTab('global')}
          >
            Global Risk Map
          </button>
        </div>

        {tab === 'country' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <label className="space-y-1 block">
                <span className="text-xs text-gray-400">Country</span>
                <input
                  className="input-field"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Taiwan"
                />
              </label>
              <button className="btn-primary w-full" onClick={fetchCountry} disabled={loadingCountry}>
                {loadingCountry ? 'Scoring…' : 'Score risk'}
              </button>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <RiskGauge score={gaugeScore} />
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-200 mb-2">Category breakdown</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-300">
                  {Object.entries(categories).length === 0 && (
                    <p className="text-gray-500 text-sm">No category data yet.</p>
                  )}
                  {Object.entries(categories).map(([key, val]) => (
                    <div key={key} className="bg-gray-800/70 rounded-lg p-3 border border-gray-700">
                      <p className="text-xs uppercase text-gray-500">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xl font-bold text-white">{String(val)}</p>
                    </div>
                  ))}
                </div>
                {countryData?.key_risks && Array.isArray(countryData.key_risks) && (
                  <div className="mt-3 text-sm text-gray-300">
                    <p className="text-xs uppercase text-gray-500 mb-1">Key risks</p>
                    <div className="flex flex-wrap gap-2">
                      {countryData.key_risks.map((r: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-200">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {loadingGlobal ? (
              <p className="text-sm text-gray-400">Loading global risk map…</p>
            ) : (
              <RiskTable data={globalData} />
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
