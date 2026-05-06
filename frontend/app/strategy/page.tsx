'use client'

import { useMemo, useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from 'recharts'
import { BarChart3, CheckCircle2 } from 'lucide-react'

const COLORS = ['#8b5cf6', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#6366f1']

type Strategy = {
  strategy_name?: string
  summary?: string
  allocation?: { asset_class: string; percentage: number; reason?: string }[]
  entry_conditions?: string[]
  exit_rules?: string[]
  risk_management?: string[]
  expected_return?: string
  hedges?: string[]
  stop_loss?: string
  take_profit?: string
}

function AllocationChart({ data }: { data: Strategy['allocation'] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">No allocation yet.</p>
  }
  const chartData = data.map((d) => ({ name: d.asset_class, value: d.percentage }))
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function Checklist({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-200">{title}</p>
      <div className="space-y-1 text-sm text-gray-300">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StrategyPage() {
  const [goal, setGoal] = useState('Generate steady income with low drawdowns')
  const [risk, setRisk] = useState('moderate')
  const [horizon, setHorizon] = useState('1 year')
  const [capital, setCapital] = useState('25000')
  const [excluded, setExcluded] = useState<string[]>(['crypto'])
  const [loading, setLoading] = useState(false)
  const [strategy, setStrategy] = useState<Strategy | null>(null)

  const excludedOptions = ['Tech', 'Finance', 'Energy', 'Healthcare', 'Defense', 'Crypto']

  function toggleExcluded(option: string) {
    setExcluded((prev) => (prev.includes(option.toLowerCase()) ? prev.filter((o) => o !== option.toLowerCase()) : [...prev, option.toLowerCase()]))
  }

  async function build() {
    setLoading(true)
    const res = await api.buildStrategy(goal, risk, horizon, Number(capital) || 0, excluded)
    setStrategy(res?.data ?? res?.strategy ?? res)
    setLoading(false)
  }

  const allocation = useMemo(() => strategy?.allocation ?? [], [strategy])

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Strategy Builder</h1>
            <p className="text-sm text-gray-400">AI-built portfolio plan with allocations, rules, and risk controls.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <label className="space-y-1 block">
              <span className="text-xs text-gray-400">What is your investment goal?</span>
              <textarea
                className="input-field h-28"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </label>

            <div className="space-y-2">
              <p className="text-xs text-gray-400">Risk tolerance</p>
              <div className="flex flex-wrap gap-2">
                {['conservative', 'moderate', 'aggressive'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setRisk(opt)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      risk === opt ? 'border-purple-500 bg-purple-900/40 text-purple-100' : 'border-gray-700 text-gray-300'
                    }`}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-gray-400">Time horizon</span>
              <select className="input-field" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
                <option>3 months</option>
                <option>6 months</option>
                <option>1 year</option>
                <option>3 years</option>
                <option>5+ years</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-gray-400">Capital</span>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400">$</span>
                <input
                  className="input-field flex-1"
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-400">Excluded sectors</p>
              <div className="grid grid-cols-2 gap-2">
                {excludedOptions.map((opt) => {
                  const key = opt.toLowerCase()
                  const checked = excluded.includes(key)
                  return (
                    <label key={opt} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg border ${checked ? 'border-purple-500 bg-purple-900/30 text-purple-100' : 'border-gray-700 text-gray-300'}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleExcluded(opt)} className="accent-purple-500" />
                      {opt}
                    </label>
                  )
                })}
              </div>
            </div>

            <button className="btn-primary w-full" onClick={build} disabled={loading}>
              {loading ? 'Building…' : 'Build My Strategy'}
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Strategy</p>
                  <h2 className="text-xl font-bold text-white">{strategy?.strategy_name || 'Awaiting build'}</h2>
                </div>
                <p className="text-sm text-gray-400 max-w-md text-right">{strategy?.summary || 'Hit build to generate a complete, rules-based plan.'}</p>
              </div>
              <AllocationChart data={allocation} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Checklist title="Entry conditions" items={strategy?.entry_conditions} />
              <Checklist title="Exit rules" items={strategy?.exit_rules} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Checklist title="Risk management" items={strategy?.risk_management} />
              <Checklist title="Hedges" items={strategy?.hedges} />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-4 text-sm text-gray-300">
              <div>
                <p className="text-xs uppercase text-gray-500">Stop loss</p>
                <p className="font-semibold text-white">{strategy?.stop_loss || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Take profit</p>
                <p className="font-semibold text-white">{strategy?.take_profit || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Expected return</p>
                <p className="font-semibold text-white">{strategy?.expected_return || '—'}</p>
              </div>
            </div>

            <p className="text-xs text-gray-500">This is AI-generated analysis, not financial advice. Always consult a licensed advisor.</p>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
