// @ts-nocheck
"use client";
import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Scale, Play, GitCompare, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { api } from "@/lib/api";

const YEAR_RANGE = Array.from({ length: 35 }, (_, i) => 1990 + i);

const QUICK_COMPANIES = ["Apple", "Google", "Amazon", "Meta", "Microsoft", "Tesla", "Nvidia", "JPMorgan", "Goldman Sachs", "Binance", "Coinbase", "Alibaba", "Tencent"];

export default function RegulatoryTimeMachinePage() {
  const [activeTab, setActiveTab] = useState("simulate");
  const [company, setCompany] = useState("");
  const [regulation, setRegulation] = useState("");
  const [fromYear, setFromYear] = useState(2010);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedYear, setExpandedYear] = useState(null);

  // Compare tab
  const [companies, setCompanies] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Predict tab
  const [predictCompany, setPredictCompany] = useState("");
  const [upcomingReg, setUpcomingReg] = useState("");
  const [implYear, setImplYear] = useState(2026);
  const [predictResult, setPredictResult] = useState(null);
  const [loadingPredict, setLoadingPredict] = useState(false);

  // Presets
  const [presets, setPresets] = useState(null);

  const loadPresets = async () => {
    if (presets) return;
    try {
      const r = await api.regulationPresets();
      setPresets(r.data);
    } catch {}
  };

  const runSimulation = async () => {
    if (!company.trim() || !regulation.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await api.regulatorySimulate(company, regulation, fromYear);
      setResult(r.data);
    } catch {}
    setLoading(false);
  };

  const runCompare = async () => {
    const list = companies.split(",").map(s => s.trim()).filter(Boolean);
    if (list.length < 2 || !regulation.trim()) return;
    setLoadingCompare(true);
    setCompareResult(null);
    try {
      const r = await api.regulatoryCompare(list, regulation, fromYear);
      setCompareResult(r.data);
    } catch {}
    setLoadingCompare(false);
  };

  const runPredict = async () => {
    if (!predictCompany.trim() || !upcomingReg.trim()) return;
    setLoadingPredict(true);
    setPredictResult(null);
    try {
      const r = await api.regulatoryPredict(predictCompany, upcomingReg, implYear);
      setPredictResult(r.data);
    } catch {}
    setLoadingPredict(false);
  };

  const verdictColor = (v: string) => {
    if (v === "thrived") return "text-green-400";
    if (v === "adapted") return "text-blue-400";
    if (v === "struggled") return "text-yellow-400";
    if (v === "collapsed") return "text-red-400";
    return "text-gray-400";
  };

  const verdictBg = (v: string) => {
    if (v === "thrived") return "bg-green-500/10 border-green-500/20";
    if (v === "adapted") return "bg-blue-500/10 border-blue-500/20";
    if (v === "struggled") return "bg-yellow-500/10 border-yellow-500/20";
    if (v === "collapsed") return "bg-red-500/10 border-red-500/20";
    return "bg-gray-800 border-gray-700";
  };

  const impactColor = (pct: number) => pct >= 0 ? "text-green-400" : "text-red-400";

  return (
    <DashboardShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Scale className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Regulatory Time Machine</h1>
            <p className="text-gray-400 text-sm">Simulate how a company would have performed if a law existed in the past — and predict future resilience</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800">
          {[
            { id: "simulate", label: "Simulate Past" },
            { id: "compare", label: "Compare Companies" },
            { id: "predict", label: "Predict Future" },
            { id: "presets", label: "Regulation Library" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "presets") loadPresets(); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-orange-500 text-orange-400" : "border-transparent text-gray-400 hover:text-white"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Simulate Past */}
        {activeTab === "simulate" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company / Asset</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Apple, Tesla, JPMorgan"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {QUICK_COMPANIES.map(c => (
                      <button key={c} onClick={() => setCompany(c)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-700">{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Regulation to Apply</label>
                  <input
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value)}
                    placeholder="e.g. EU Digital Markets Act, GDPR, Dodd-Frank"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Year Slider */}
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-3">
                  Apply regulation from: <span className="text-orange-400 font-bold text-lg">{fromYear}</span>
                  <span className="text-gray-500 text-xs ml-2">(simulates {2025 - fromYear} years of alternate history)</span>
                </label>
                <input
                  type="range"
                  min={1990}
                  max={2023}
                  value={fromYear}
                  onChange={(e) => setFromYear(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1990</span><span>2000</span><span>2010</span><span>2023</span>
                </div>
              </div>

              <button
                onClick={runSimulation}
                disabled={loading || !company.trim() || !regulation.trim()}
                className="mt-4 w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                {loading ? "Running simulation..." : `Simulate ${fromYear}–2025`}
              </button>
            </div>

            {result && (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className={`border rounded-xl p-5 ${verdictBg(result.verdict)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white text-lg font-bold">{result.company}</h3>
                      <p className="text-gray-400 text-sm">Under: {result.regulation}</p>
                      <p className="text-gray-500 text-xs">{result.simulation_period}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold capitalize ${verdictColor(result.verdict)}`}>{result.verdict}</p>
                      <p className="text-gray-400 text-sm">Resilience: <span className="text-white font-bold">{result.resilience_score}/100</span></p>
                      {result.cumulative_stock_impact_pct !== undefined && (
                        <p className={`text-sm font-bold ${impactColor(result.cumulative_stock_impact_pct)}`}>
                          Stock impact: {result.cumulative_stock_impact_pct > 0 ? "+" : ""}{result.cumulative_stock_impact_pct}% vs actual
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.executive_summary}</p>
                </div>

                {/* Year-by-Year Timeline */}
                {result.timeline?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4">Alternate History Timeline</h3>
                    <div className="relative">
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />
                      <div className="space-y-3">
                        {result.timeline.map((entry, i) => (
                          <div key={i} className="relative pl-14">
                            <div className={`absolute left-4 w-4 h-4 rounded-full border-2 flex items-center justify-center ${entry.stock_impact_pct >= 0 ? "border-green-500 bg-green-500/20" : "border-red-500 bg-red-500/20"}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${entry.stock_impact_pct >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                            </div>
                            <div
                              className="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-750 transition-colors"
                              onClick={() => setExpandedYear(expandedYear === i ? null : i)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-orange-400 font-bold text-sm">{entry.year}</span>
                                  <span className="text-white text-sm">{entry.phase}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${entry.competitive_position === "leader" ? "bg-green-500/20 text-green-400" : entry.competitive_position === "laggard" ? "bg-red-500/20 text-red-400" : "bg-gray-700 text-gray-300"}`}>
                                    {entry.competitive_position}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${impactColor(entry.stock_impact_pct)}`}>
                                    {entry.stock_impact_pct > 0 ? "+" : ""}{entry.stock_impact_pct}%
                                  </span>
                                  {expandedYear === i ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                                </div>
                              </div>
                              {expandedYear === i && (
                                <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                                  <p className="text-gray-300 text-xs">{entry.key_event}</p>
                                  {entry.revenue_impact && <p className="text-yellow-400 text-xs">Revenue: {entry.revenue_impact}</p>}
                                  {entry.forced_changes?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {entry.forced_changes.map((c, j) => (
                                        <span key={j} className="text-xs bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded">{c}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Model Changes */}
                {result.business_model_changes?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Business Model Changes</h3>
                    <div className="space-y-2">
                      {result.business_model_changes.map((c, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                          {c.impact === "positive" ? <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> : c.impact === "negative" ? <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> : <Minus className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
                          <div>
                            <p className="text-white text-sm">{c.change}</p>
                            <p className="text-gray-400 text-xs">{c.magnitude}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Winners & Losers + Lesson */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(result.winners_in_alternate_timeline?.length > 0 || result.losers_in_alternate_timeline?.length > 0) && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <h3 className="text-white font-semibold mb-3">Alternate Timeline Winners/Losers</h3>
                      {result.winners_in_alternate_timeline?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-green-400 text-xs font-medium mb-1">Winners</p>
                          <div className="flex flex-wrap gap-1">{result.winners_in_alternate_timeline.map((w, i) => <span key={i} className="text-xs bg-green-500/10 text-green-300 px-2 py-0.5 rounded">{w}</span>)}</div>
                        </div>
                      )}
                      {result.losers_in_alternate_timeline?.length > 0 && (
                        <div>
                          <p className="text-red-400 text-xs font-medium mb-1">Losers</p>
                          <div className="flex flex-wrap gap-1">{result.losers_in_alternate_timeline.map((w, i) => <span key={i} className="text-xs bg-red-500/10 text-red-300 px-2 py-0.5 rounded">{w}</span>)}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                    {result.real_world_lesson && (
                      <div>
                        <p className="text-yellow-400 text-xs font-medium mb-1">Real-World Lesson</p>
                        <p className="text-gray-300 text-sm">{result.real_world_lesson}</p>
                      </div>
                    )}
                    {result.future_resilience_prediction && (
                      <div>
                        <p className="text-blue-400 text-xs font-medium mb-1">Future Resilience</p>
                        <p className="text-gray-300 text-sm">{result.future_resilience_prediction}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Compare Companies */}
        {activeTab === "compare" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Companies (comma separated)</label>
                  <input
                    value={companies}
                    onChange={(e) => setCompanies(e.target.value)}
                    placeholder="e.g. Apple, Google, Meta, Amazon"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Regulation</label>
                  <input
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value)}
                    placeholder="e.g. EU Digital Markets Act"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-2">Apply from year: <span className="text-orange-400 font-bold">{fromYear}</span></label>
                <input type="range" min={1990} max={2023} value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
              <button
                onClick={runCompare}
                disabled={loadingCompare || companies.split(",").filter(Boolean).length < 2 || !regulation.trim()}
                className="mt-4 w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <GitCompare className="w-4 h-4" />
                {loadingCompare ? "Comparing..." : "Compare Companies"}
              </button>
            </div>

            {compareResult && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <p className="text-gray-400 text-sm mb-4">{compareResult.industry_wide_impact}</p>
                  <div className="space-y-3">
                    {compareResult.rankings?.map((r, i) => (
                      <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${verdictBg(r.verdict)}`}>
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm">#{r.rank}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold">{r.company}</p>
                            <span className={`text-xs font-bold capitalize ${verdictColor(r.verdict)}`}>{r.verdict}</span>
                          </div>
                          <p className="text-gray-400 text-xs">{r.key_reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{r.resilience_score}/100</p>
                          <p className={`text-xs font-bold ${impactColor(r.stock_impact_pct)}`}>{r.stock_impact_pct > 0 ? "+" : ""}{r.stock_impact_pct}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {compareResult.second_order_effects?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-orange-400 text-xs font-medium mb-2">Second-Order Effects</p>
                    <ul className="space-y-1">{compareResult.second_order_effects.map((e, i) => <li key={i} className="text-gray-300 text-sm">• {e}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Predict Future */}
        {activeTab === "predict" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company</label>
                  <input value={predictCompany} onChange={(e) => setPredictCompany(e.target.value)} placeholder="e.g. Apple, Coinbase, Tesla" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Upcoming Regulation</label>
                  <input value={upcomingReg} onChange={(e) => setUpcomingReg(e.target.value)} placeholder="e.g. US Crypto Market Structure Bill 2025" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-2">Implementation Year: <span className="text-orange-400 font-bold">{implYear}</span></label>
                <input type="range" min={2025} max={2035} value={implYear} onChange={(e) => setImplYear(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
              <button onClick={runPredict} disabled={loadingPredict || !predictCompany.trim() || !upcomingReg.trim()} className="mt-4 w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                {loadingPredict ? "Predicting..." : "Predict Impact"}
              </button>
            </div>

            {predictResult && (
              <div className="space-y-4">
                <div className={`border rounded-xl p-5 ${predictResult.impact_score >= 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white text-lg font-bold">{predictResult.company}</h3>
                      <p className="text-gray-400 text-sm">{predictResult.regulation} ({predictResult.implementation_year})</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${predictResult.impact_score >= 0 ? "text-green-400" : "text-red-400"}`}>{predictResult.impact_score > 0 ? "+" : ""}{predictResult.impact_score}</p>
                      <p className="text-gray-400 text-xs">Impact Score</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${predictResult.investor_action === "buy_dip" ? "bg-green-500 text-white" : predictResult.investor_action === "avoid" ? "bg-red-500 text-white" : "bg-yellow-500 text-black"}`}>{predictResult.investor_action?.replace("_", " ")}</span>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm">{predictResult.pre_implementation_advice}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: "1 Year After", text: predictResult.short_term_impact_1y },
                    { label: "3 Years After", text: predictResult.medium_term_impact_3y },
                    { label: "5 Years After", text: predictResult.long_term_impact_5y },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <p className="text-orange-400 text-xs font-bold mb-2">{s.label}</p>
                      <p className="text-gray-300 text-sm">{s.text}</p>
                    </div>
                  ))}
                </div>

                {predictResult.stock_price_prediction && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3">Stock Price Prediction</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(predictResult.stock_price_prediction).map(([k, v]) => (
                        <div key={k} className="bg-gray-800 rounded-lg p-3 text-center">
                          <p className="text-gray-400 text-xs capitalize mb-1">{k.replace(/_/g, " ")}</p>
                          <p className="text-white text-sm font-medium">{v as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Regulation Library */}
        {activeTab === "presets" && (
          <div className="space-y-3">
            {!presets ? (
              <div className="text-center py-8 text-gray-400">Loading regulation library...</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-orange-400">{presets.total}</p>
                    <p className="text-gray-400 text-sm">Regulations</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-orange-400">{presets.regions?.length}</p>
                    <p className="text-gray-400 text-sm">Regions</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-orange-400">{presets.sectors?.length}</p>
                    <p className="text-gray-400 text-sm">Sectors</p>
                  </div>
                </div>
                {presets.presets?.map((p) => (
                  <div
                    key={p.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-orange-500/30 cursor-pointer transition-colors"
                    onClick={() => { setRegulation(p.name); setFromYear(p.year); setActiveTab("simulate"); }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{p.name}</p>
                        <p className="text-gray-400 text-sm mt-1">{p.summary}</p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded">{p.region}</span>
                        <p className="text-gray-500 text-xs mt-1">{p.year} · {p.sector}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
