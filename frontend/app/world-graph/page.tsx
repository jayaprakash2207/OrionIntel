'use client'

import { useState, useEffect } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Network, Search, ArrowRight, Globe2 } from 'lucide-react'

type NodeCategory = 'Country' | 'Company' | 'Commodity' | 'Event'

interface GraphNode {
  id: string
  label: string
  category: NodeCategory
  connections?: string[]
  description?: string
}

const CATEGORY_STYLES: Record<NodeCategory, { bg: string; border: string; text: string; badge: string }> = {
  Country: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-700/50',
    text: 'text-blue-300',
    badge: 'bg-blue-900/60 text-blue-300 border-blue-700/40',
  },
  Company: {
    bg: 'bg-purple-950/50',
    border: 'border-purple-700/50',
    text: 'text-purple-300',
    badge: 'bg-purple-900/60 text-purple-300 border-purple-700/40',
  },
  Commodity: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-700/50',
    text: 'text-amber-300',
    badge: 'bg-amber-900/60 text-amber-300 border-amber-700/40',
  },
  Event: {
    bg: 'bg-red-950/50',
    border: 'border-red-700/50',
    text: 'text-red-300',
    badge: 'bg-red-900/60 text-red-300 border-red-700/40',
  },
}

const STATIC_NODES: GraphNode[] = [
  { id: 'usa', label: 'United States', category: 'Country', connections: ['China', 'EU', 'Oil', 'Federal Reserve', 'S&P 500'] },
  { id: 'china', label: 'China', category: 'Country', connections: ['USA', 'Taiwan', 'Lithium', 'BYD', 'TSMC'] },
  { id: 'eu', label: 'European Union', category: 'Country', connections: ['USA', 'Russia', 'Natural Gas', 'ECB'] },
  { id: 'russia', label: 'Russia', category: 'Country', connections: ['EU', 'Natural Gas', 'Oil', 'Ukraine War'] },
  { id: 'saudiarabia', label: 'Saudi Arabia', category: 'Country', connections: ['Oil', 'Aramco', 'USA', 'OPEC'] },
  { id: 'taiwan', label: 'Taiwan', category: 'Country', connections: ['China', 'TSMC', 'USA', 'Semiconductors'] },
  { id: 'apple', label: 'Apple', category: 'Company', connections: ['USA', 'China', 'Semiconductors', 'TSMC'] },
  { id: 'tsmc', label: 'TSMC', category: 'Company', connections: ['Taiwan', 'Apple', 'Nvidia', 'Semiconductors'] },
  { id: 'nvidia', label: 'Nvidia', category: 'Company', connections: ['USA', 'TSMC', 'AI Boom', 'Semiconductors'] },
  { id: 'aramco', label: 'Saudi Aramco', category: 'Company', connections: ['Saudi Arabia', 'Oil', 'OPEC'] },
  { id: 'oil', label: 'Oil (Brent)', category: 'Commodity', connections: ['Saudi Arabia', 'Russia', 'USA', 'OPEC', 'Inflation'] },
  { id: 'gold', label: 'Gold', category: 'Commodity', connections: ['USA', 'Inflation', 'Fed Rate Hike', 'Dollar'] },
  { id: 'lithium', label: 'Lithium', category: 'Commodity', connections: ['China', 'EV Revolution', 'Chile', 'BYD'] },
  { id: 'semiconductors', label: 'Semiconductors', category: 'Commodity', connections: ['Taiwan', 'TSMC', 'Nvidia', 'China', 'USA'] },
  { id: 'airoom', label: 'AI Boom', category: 'Event', connections: ['Nvidia', 'USA', 'Semiconductors', 'Big Tech'] },
  { id: 'ukrainewar', label: 'Ukraine War', category: 'Event', connections: ['Russia', 'EU', 'Natural Gas', 'Grain'] },
  { id: 'fedratehike', label: 'Fed Rate Hike', category: 'Event', connections: ['USA', 'Gold', 'Dollar', 'Bonds', 'Emerging Markets'] },
  { id: 'inflation', label: 'Inflation', category: 'Event', connections: ['USA', 'EU', 'Oil', 'Gold', 'Fed Rate Hike'] },
]

const HUBS = [
  {
    label: 'US Financial Hub',
    nodes: ['Federal Reserve', 'S&P 500', 'US Treasury', 'NYSE'],
    color: 'border-blue-700/40 bg-blue-950/20',
    textColor: 'text-blue-300',
  },
  {
    label: 'Asian Tech Hub',
    nodes: ['TSMC', 'Samsung', 'SoftBank', 'ASML'],
    color: 'border-purple-700/40 bg-purple-950/20',
    textColor: 'text-purple-300',
  },
  {
    label: 'Energy Hub',
    nodes: ['Saudi Aramco', 'OPEC+', 'Brent Crude', 'LNG Markets'],
    color: 'border-amber-700/40 bg-amber-950/20',
    textColor: 'text-amber-300',
  },
  {
    label: 'Commodity Hub',
    nodes: ['Gold', 'Copper', 'Lithium', 'Wheat'],
    color: 'border-green-700/40 bg-green-950/20',
    textColor: 'text-green-300',
  },
]

export default function WorldGraphPage() {
  const [search, setSearch] = useState('')
  const [focusNode, setFocusNode] = useState<GraphNode | null>(null)
  const [entityA, setEntityA] = useState('')
  const [entityB, setEntityB] = useState('')
  const [connectionResult, setConnectionResult] = useState<any>(null)
  const [connectionLoading, setConnectionLoading] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [mapData, setMapData] = useState<any>(null)
  const [mapLoading, setMapLoading] = useState(false)

  useEffect(() => {
    loadMapData()
  }, [])

  async function loadMapData() {
    setMapLoading(true)
    const res = await api.geopoliticsMap()
    if (res?.data) setMapData(res.data)
    setMapLoading(false)
  }

  async function exploreConnection() {
    if (!entityA.trim() || !entityB.trim()) return
    setConnectionLoading(true)
    setConnectionResult(null)
    setConnectionError('')
    const res = await api.butterfly(`${entityA} — ${entityB}`, `Economic and geopolitical relationship chain between ${entityA} and ${entityB}`)
    if (res?.data) {
      setConnectionResult(res.data)
    } else {
      setConnectionError(res?.error ?? 'Connection analysis failed')
    }
    setConnectionLoading(false)
  }

  const filteredNodes = search.trim()
    ? STATIC_NODES.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()))
    : STATIC_NODES

  const handleNodeClick = (node: GraphNode) => {
    setFocusNode(focusNode?.id === node.id ? null : node)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center">
            <Network className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Living World Economic Graph</h1>
            <p className="text-gray-400 text-sm">Visual map of how every country, company, commodity, law, and event connects</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(CATEGORY_STYLES) as [NodeCategory, any][]).map(([cat, style]) => (
            <span key={cat} className={`text-xs px-3 py-1 rounded-full border font-medium ${style.badge}`}>
              {cat}
            </span>
          ))}
          <span className="text-xs text-gray-500 flex items-center gap-1 ml-2">— click any node to see connections</span>
        </div>

        {/* Focus Node Search */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              className="bg-transparent text-sm text-white placeholder-gray-500 flex-1 focus:outline-none"
              placeholder="Search node (country, company, commodity, event)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Node Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredNodes.map((node) => {
            const style = CATEGORY_STYLES[node.category]
            const active = focusNode?.id === node.id
            return (
              <button
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className={`${style.bg} border ${active ? 'border-white/30 ring-2 ring-white/20' : style.border} rounded-xl p-3 text-left transition-all hover:scale-105 hover:shadow-lg`}
              >
                <p className={`font-semibold text-sm ${style.text}`}>{node.label}</p>
                <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded border ${style.badge}`}>
                  {node.category}
                </span>
              </button>
            )
          })}
        </div>

        {/* Focus Node Connections */}
        {focusNode && (
          <div className={`${CATEGORY_STYLES[focusNode.category].bg} border ${CATEGORY_STYLES[focusNode.category].border} rounded-xl p-5 space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-lg font-bold ${CATEGORY_STYLES[focusNode.category].text}`}>{focusNode.label}</h2>
                <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_STYLES[focusNode.category].badge}`}>
                  {focusNode.category}
                </span>
              </div>
              <button
                onClick={() => setFocusNode(null)}
                className="text-gray-500 hover:text-gray-300 text-xs"
              >
                Close ×
              </button>
            </div>
            {focusNode.connections && focusNode.connections.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Direct Connections</p>
                <div className="flex flex-wrap gap-2">
                  {focusNode.connections.map((conn, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">
                      <ArrowRight className="h-3 w-3 text-gray-500" />
                      <span className="text-sm text-gray-200">{conn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explore Connections */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Explore Connection Chain</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <input
              className="input-field flex-1"
              placeholder="Entity A (e.g. Saudi Arabia)"
              value={entityA}
              onChange={(e) => setEntityA(e.target.value)}
            />
            <ArrowRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
            <input
              className="input-field flex-1"
              placeholder="Entity B (e.g. S&P 500)"
              value={entityB}
              onChange={(e) => setEntityB(e.target.value)}
            />
            <button
              onClick={exploreConnection}
              disabled={connectionLoading || !entityA.trim() || !entityB.trim()}
              className="btn-primary flex-shrink-0"
            >
              {connectionLoading ? 'Tracing…' : 'Trace Connection'}
            </button>
          </div>

          {connectionLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="flex gap-1">
                {[0, 100, 200].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              <span>Mapping economic relationship chain…</span>
            </div>
          )}

          {connectionError && <div className="text-red-400 text-sm">{connectionError}</div>}

          {connectionResult && (
            <div className="space-y-3 pt-2">
              {connectionResult.chain && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Connection Chain</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(Array.isArray(connectionResult.chain) ? connectionResult.chain : []).map((step: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="bg-gray-800 border border-gray-700 text-gray-200 text-xs px-3 py-1.5 rounded-lg">
                          {typeof step === 'string' ? step : step.entity ?? step.step}
                        </span>
                        {i < connectionResult.chain.length - 1 && (
                          <ArrowRight className="h-3.5 w-3.5 text-gray-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {connectionResult.narrative && (
                <p className="text-gray-300 text-sm">{connectionResult.narrative}</p>
              )}
              {connectionResult.second_order_effects && connectionResult.second_order_effects.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Second Order Effects</p>
                  {connectionResult.second_order_effects.slice(0, 4).map((eff: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                      <span className="text-indigo-400">→</span>
                      {typeof eff === 'string' ? eff : eff.effect ?? eff.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Connections Overview */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Global Economic Hubs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {HUBS.map((hub, i) => (
              <div key={i} className={`border ${hub.color} rounded-xl p-4 space-y-3`}>
                <p className={`font-bold text-sm ${hub.textColor}`}>{hub.label}</p>
                <div className="space-y-1.5">
                  {hub.nodes.map((node, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      {node}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Map Data */}
        {(mapLoading || mapData) && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Live Geopolitical Data</h2>
            </div>
            {mapLoading ? (
              <p className="text-gray-500 text-sm">Loading live data…</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(mapData?.scores ?? mapData?.countries ?? []).slice(0, 12).map((item: any, i: number) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">{item.country ?? item.name}</p>
                    {item.risk_score !== undefined && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="bg-gray-700 rounded-full h-1.5 flex-1">
                          <div
                            className={`h-1.5 rounded-full ${item.risk_score >= 70 ? 'bg-red-500' : item.risk_score >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${item.risk_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{Math.round(item.risk_score)}</span>
                      </div>
                    )}
                    {item.primary_concern && (
                      <p className="text-gray-500 text-xs mt-1 truncate">{item.primary_concern}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
