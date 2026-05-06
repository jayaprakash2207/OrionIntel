'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Cloud, Leaf, AlertTriangle } from 'lucide-react'

export default function ClimatePage() {
  const [event, setEvent] = useState('Hurricane landfall')
  const [location, setLocation] = useState('Gulf Coast')
  const [severity, setSeverity] = useState('moderate')
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [watchlist, setWatchlist] = useState<any>(null)

  async function run() {
    setLoading(true)
    const res = await api.climateAnalysis(event, location, severity)
    setAnalysis(res?.data ?? res)
    setLoading(false)
  }

  async function loadWatchlist() {
    const res = await api.climateWatchlistV2?.() ?? (await api.climateWatchlist?.())
    setWatchlist(res?.data ?? res)
  }

  useEffect(() => {
    loadWatchlist()
  }, [])

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Climate Impact</h1>
            <p className="text-sm text-gray-400">Trace climate events through commodities, supply chains, and opportunities.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <label className="space-y-1 block">
              <span className="text-xs text-gray-400">Event</span>
              <input className="input-field" value={event} onChange={(e) => setEvent(e.target.value)} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-gray-400">Location</span>
              <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-gray-400">Severity</span>
              <select className="input-field" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="catastrophic">Catastrophic</option>
              </select>
            </label>
            <button className="btn-primary w-full" onClick={run} disabled={loading}>
              {loading ? 'Tracing…' : 'Trace Market Impact'}
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {analysis ? (
              <div className="space-y-3">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-200">Event summary</p>
                  <p className="text-gray-300 text-sm mt-1">{analysis.event_summary || analysis.summary || '—'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ImpactBlock title="Immediate impacts" items={analysis.immediate_impacts} badge="commodity" />
                  <ImpactBlock title="Supply chain breaks" items={analysis.supply_chain_breaks} badge="product" />
                </div>
                <ImpactBlock title="Investment opportunities" items={analysis.investment_opportunities} badge="idea" twoCols />
                <ImpactBlock title="Assets to avoid" items={analysis.assets_to_avoid} badge="risk" twoCols />
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-500">Run an analysis to see the impact chain.</div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            Climate Watchlist
          </div>
          {watchlist ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-300">
              {(watchlist.active_risks || []).map((risk: any, i: number) => (
                <div key={i} className="border border-gray-800 rounded-lg p-3 bg-gray-800/60 space-y-1">
                  <p className="font-semibold text-white">{risk.event_type}</p>
                  <p className="text-xs text-gray-400">{risk.location}</p>
                  <p className="text-xs text-gray-500">Severity: {risk.severity}</p>
                  <p className="text-xs text-gray-500">Urgency: {risk.urgency}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading watchlist…</p>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}

function ImpactBlock({ title, items, badge, twoCols }: { title: string; items: any; badge?: string; twoCols?: boolean }) {
  if (!items || (Array.isArray(items) && items.length === 0)) return null
  const list = Array.isArray(items) ? items : [items]
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${twoCols ? '' : ''}`}>
      <p className="text-sm font-semibold text-gray-200 mb-2">{title}</p>
      <div className={`grid ${twoCols ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-2`}>
        {list.map((item: any, i: number) => (
          <div key={i} className="border border-gray-800 rounded-lg p-3 bg-gray-800/60 space-y-1 text-sm text-gray-200">
            {badge && item[badge] && <p className="text-xs uppercase text-gray-500">{item[badge]}</p>}
            {item.description || item.impact || item.market_move ? <p>{item.description || item.impact || item.market_move}</p> : null}
            {item.timeframe && <p className="text-xs text-gray-500">Timeframe: {item.timeframe}</p>}
            {item.affected_companies && <p className="text-xs text-gray-500">Companies: {(item.affected_companies || []).join(', ')}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
