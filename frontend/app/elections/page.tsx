'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Vote, CalendarDays } from 'lucide-react'

export default function ElectionsPage() {
  const [country, setCountry] = useState('USA')
  const [candidates, setCandidates] = useState('Incumbent, Challenger')
  const [date, setDate] = useState('2026-11-03')
  const [simulation, setSimulation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [upcoming, setUpcoming] = useState<any>(null)

  async function simulate() {
    setLoading(true)
    const list = candidates.split(',').map((c) => c.trim()).filter(Boolean)
    const res = await api.simulateElection(country, list, date)
    setSimulation(res?.data ?? res)
    setLoading(false)
  }

  async function loadUpcoming() {
    const res = await api.upcomingElectionsV2?.() ?? (await api.upcomingElections?.())
    setUpcoming(res?.data ?? res)
  }

  useEffect(() => {
    loadUpcoming()
  }, [])

  const scenarios = simulation?.scenarios || []

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Vote className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Election Simulator</h1>
            <p className="text-sm text-gray-400">Model outcomes by candidate and see market impacts.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <label className="space-y-1 block">
              <span className="text-xs text-gray-400">Country</span>
              <input className="input-field" value={country} onChange={(e) => setCountry(e.target.value)} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-gray-400">Candidates / Parties (comma separated)</span>
              <input className="input-field" value={candidates} onChange={(e) => setCandidates(e.target.value)} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-gray-400">Election date</span>
              <input className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <button className="btn-primary w-full" onClick={simulate} disabled={loading}>
              {loading ? 'Simulating…' : 'Simulate Outcomes'}
            </button>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {simulation ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Base case: {simulation.base_case}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scenarios.map((s: any, i: number) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4 bg-gray-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{s.candidate_or_party}</p>
                          <p className="text-xs text-gray-500">Win probability: {s.win_probability}%</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs bg-purple-900/40 text-purple-200 border border-purple-700">{s.investor_sentiment}</span>
                      </div>
                      <p className="text-sm text-gray-300">Policy: {s.economic_policy}</p>
                      <p className="text-sm text-gray-300">Stocks: {s.market_impact?.local_stocks}</p>
                      <p className="text-sm text-gray-300">Currency: {s.market_impact?.currency}</p>
                      <p className="text-sm text-gray-300">Bonds: {s.market_impact?.bonds}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-500">Run a simulation to view scenarios.</div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
            <CalendarDays className="h-4 w-4 text-purple-300" />
            Upcoming elections
          </div>
          {upcoming ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-300">
              {(upcoming.elections || []).map((e: any, i: number) => (
                <div key={i} className="border border-gray-800 rounded-lg p-3 bg-gray-800/60 space-y-1">
                  <p className="font-semibold text-white">{e.country}</p>
                  <p className="text-xs text-gray-500">{e.election_type}</p>
                  <p className="text-xs text-gray-500">Date: {e.expected_date}</p>
                  <p className="text-xs text-gray-400">Issue: {e.key_issue}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading upcoming elections…</p>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
