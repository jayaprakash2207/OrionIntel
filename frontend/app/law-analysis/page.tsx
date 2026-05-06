'use client'

import { useCallback, useEffect, useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Scale, FileText, Landmark } from 'lucide-react'

export default function LawAnalysisPage() {
  const [tab, setTab] = useState<'paste' | 'recent'>('paste')
  const [lawText, setLawText] = useState('')
  const [title, setTitle] = useState('')
  const [country, setCountry] = useState('US')
  const [analysis, setAnalysis] = useState<any>(null)
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)

  async function runAnalysis(text?: string, t?: string) {
    const payloadText = text ?? lawText
    if (!payloadText.trim()) return
    setLoading(true)
    const res = await api.lawAnalysis(payloadText, t ?? title)
    setAnalysis(res?.data ?? res)
    setLoading(false)
  }

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true)
    const res = await api.recentLaws(country)
    setRecent(res?.data?.recent_laws ?? res?.data ?? res)
    setLoadingRecent(false)
  }, [country])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  const keyClauses = analysis?.analysis?.key_clauses ?? analysis?.key_clauses ?? []
  const companies = analysis?.company_impacts?.companies ?? analysis?.companies ?? []

  return (
    <DashboardShell>
      <div className="p-6 space-y-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Law to Ledger</h1>
            <p className="text-sm text-gray-400">Extract key clauses and map affected companies.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              tab === 'paste' ? 'bg-purple-900/40 border-purple-700 text-purple-200' : 'border-gray-800 text-gray-400'
            }`}
            onClick={() => setTab('paste')}
          >
            Paste Law Text
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
              tab === 'recent' ? 'bg-purple-900/40 border-purple-700 text-purple-200' : 'border-gray-800 text-gray-400'
            }`}
            onClick={() => setTab('recent')}
          >
            Recent Laws
          </button>
        </div>

        {tab === 'paste' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <label className="space-y-1 block">
                <span className="text-xs text-gray-400">Title (optional)</span>
                <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Digital Asset Compliance Act" />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs text-gray-400">Law / Bill text</span>
                <textarea className="input-field h-56" value={lawText} onChange={(e) => setLawText(e.target.value)} placeholder="Paste the full text or summary" />
              </label>
              <button className="btn-primary w-full" onClick={() => runAnalysis()} disabled={loading || !lawText.trim()}>
                {loading ? 'Analyzing…' : 'Analyze Law'}
              </button>
            </div>
            <div className="lg:col-span-2 space-y-3">
              {analysis ? (
                <div className="space-y-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-200">Key Clauses</p>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-sm">
                        <thead className="text-gray-500 text-xs uppercase">
                          <tr>
                            <th className="text-left py-2">Clause</th>
                            <th className="text-left">Industries</th>
                            <th className="text-left">Impact</th>
                            <th className="text-left">Severity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-gray-200">
                          {keyClauses.map((c: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-800/60">
                              <td className="py-2 max-w-xs">{c.clause}</td>
                              <td className="text-gray-400">{(c.industries_affected || []).join(', ') || '—'}</td>
                              <td className="capitalize">{c.impact_type}</td>
                              <td>{c.severity ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-200">Affected Companies</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {companies.map((c: any, i: number) => (
                        <div key={i} className="border border-gray-800 rounded-lg p-3 bg-gray-800/60">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-white">{c.name}</p>
                              <p className="text-xs text-gray-400">{c.ticker} · {c.exchange}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              c.impact === 'positive'
                                ? 'bg-green-900/50 text-green-300'
                                : c.impact === 'negative'
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-gray-800 text-gray-200'
                            }`}>
                              {c.impact}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mt-2 leading-snug">{c.reason}</p>
                          <p className="text-xs text-gray-500 mt-2">Severity: {c.severity}/10</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-900 border border-gray-800 rounded-xl p-4 h-full">
                  Paste a law to see analysis.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <Landmark className="h-4 w-4 text-purple-300" />
                Recent laws
              </div>
              <div className="flex gap-2">
                <select className="input-field" value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="US">United States</option>
                  <option value="EU">European Union</option>
                  <option value="UK">United Kingdom</option>
                </select>
                <button className="btn-secondary" onClick={loadRecent} disabled={loadingRecent}>
                  {loadingRecent ? '...' : 'Refresh'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recent.map((bill, i) => (
                <div key={i} className="border border-gray-800 rounded-lg p-3 bg-gray-800/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-300" />
                    <div>
                      <p className="font-semibold text-white line-clamp-2">{bill.title}</p>
                      <p className="text-xs text-gray-500">{bill.number || bill.type}</p>
                    </div>
                  </div>
                  <button
                    className="btn-primary w-full"
                    onClick={() => runAnalysis(bill.title || bill.number || '', bill.title || '')}
                  >
                    Analyze
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
