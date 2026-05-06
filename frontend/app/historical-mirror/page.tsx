// @ts-nocheck
"use client";
import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Clock, Search, TrendingUp, TrendingDown, BookOpen, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";

const QUICK_SCENARIOS = [
  "High inflation, aggressive central bank rate hikes, strong USD, weak bonds, equity selloff",
  "Tech bubble euphoria, extreme valuations, retail investor FOMO, AI mania, concentration risk",
  "Banking sector stress, liquidity crisis, contagion fears, flight to safety, credit spreads widening",
  "Geopolitical conflict, oil price spike, commodity shock, supply chain disruption, stagflation risk",
  "Currency crisis in emerging markets, capital outflows, IMF intervention, dollar surge",
  "Pandemic/black swan shock, global lockdown, demand collapse, unprecedented stimulus",
];

export default function HistoricalMirrorPage() {
  const [conditions, setConditions] = useState("");
  const [asset, setAsset] = useState("");
  const [assetContext, setAssetContext] = useState("");
  const [result, setResult] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [expandedAnalog, setExpandedAnalog] = useState(null);
  const [activeTab, setActiveTab] = useState("analogs");

  const findAnalogs = async () => {
    if (!conditions.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await api.historicalAnalogs(conditions, 3);
      setResult(r.data);
    } catch {}
    setLoading(false);
  };

  const predict30d = async () => {
    if (!asset.trim()) return;
    setLoadingPredict(true);
    setPrediction(null);
    try {
      const r = await api.predict30d(asset, assetContext || conditions);
      setPrediction(r.data);
    } catch {}
    setLoadingPredict(false);
  };

  const loadKnowledgeGraph = async () => {
    try {
      const r = await api.historicalKnowledgeGraph();
      setKnowledgeGraph(r.data);
    } catch {}
  };

  const similarityColor = (score: number) => {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <DashboardShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Clock className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Historical Mirror</h1>
            <p className="text-gray-400 text-sm">Find the 3 most similar periods in financial history — and what happened next</p>
          </div>
          <div className="ml-auto bg-purple-500/10 border border-purple-500/30 rounded px-3 py-1 text-purple-300 text-xs">
            Knowledge Graph: 40+ Events · 1929–2024
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800">
          {[
            { id: "analogs", label: "Find Analogs" },
            { id: "predict", label: "30-Day Prediction" },
            { id: "graph", label: "Knowledge Graph" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "graph" && !knowledgeGraph) loadKnowledgeGraph(); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-purple-500 text-purple-400" : "border-transparent text-gray-400 hover:text-white"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Find Analogs */}
        {activeTab === "analogs" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <label className="block text-sm text-gray-400 mb-2">Describe current market conditions</label>
              <textarea
                rows={4}
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. High inflation, Fed hiking rates aggressively, USD surging, bonds selling off, equity markets declining, tech leading losses..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-purple-500"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_SCENARIOS.map((s, i) => (
                  <button key={i} onClick={() => setConditions(s)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full border border-gray-700 transition-colors">
                    {s.split(",")[0]}...
                  </button>
                ))}
              </div>
              <button
                onClick={findAnalogs}
                disabled={loading || !conditions.trim()}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4" />
                {loading ? "Searching history..." : "Find Historical Analogs"}
              </button>
            </div>

            {result && (
              <div className="space-y-4">
                {/* Consensus Prediction */}
                <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-5">
                  <h3 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Consensus 30-Day Outlook
                  </h3>
                  <p className="text-white text-sm leading-relaxed">{result.consensus_prediction_30d}</p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-xs font-medium mb-1">Bear Case</p>
                      <p className="text-gray-300 text-xs">{result.highest_risk_scenario}</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-green-400 text-xs font-medium mb-1">Bull Case</p>
                      <p className="text-gray-300 text-xs">{result.best_case_scenario}</p>
                    </div>
                  </div>
                  {result.key_difference_from_history && (
                    <p className="mt-3 text-yellow-400 text-xs">⚡ Key difference from history: {result.key_difference_from_history}</p>
                  )}
                </div>

                {/* Analogs */}
                {result.analogs?.map((analog, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-800/50 transition-colors"
                      onClick={() => setExpandedAnalog(expandedAnalog === i ? null : i)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-purple-500/50 flex items-center justify-center text-purple-400 font-bold">#{i + 1}</div>
                        <div>
                          <h3 className="text-white font-semibold">{analog.event_name}</h3>
                          <p className="text-gray-400 text-sm">{analog.period}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${similarityColor(analog.similarity_score)}`}>{analog.similarity_score}%</p>
                          <p className="text-gray-500 text-xs">similarity</p>
                        </div>
                        {expandedAnalog === i ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>

                    {expandedAnalog === i && (
                      <div className="px-5 pb-5 border-t border-gray-800 space-y-4 pt-4">
                        <div>
                          <p className="text-gray-400 text-xs font-medium mb-1">WHY IT MATCHES</p>
                          <p className="text-white text-sm">{analog.why_it_matches}</p>
                        </div>
                        {analog.key_parallels?.length > 0 && (
                          <div>
                            <p className="text-gray-400 text-xs font-medium mb-2">KEY PARALLELS</p>
                            <div className="flex flex-wrap gap-2">
                              {analog.key_parallels.map((p, j) => (
                                <span key={j} className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-1 rounded">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-400 text-xs font-medium mb-1">WHAT HAPPENED NEXT (30 DAYS)</p>
                          <p className="text-white text-sm">{analog.what_happened_next_30d}</p>
                        </div>
                        {analog.asset_moves_30d?.length > 0 && (
                          <div>
                            <p className="text-gray-400 text-xs font-medium mb-2">ASSET MOVES</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {analog.asset_moves_30d.map((m, j) => (
                                <div key={j} className={`p-2 rounded-lg border text-center ${m.direction === "up" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                  {m.direction === "up" ? <TrendingUp className="w-3 h-3 text-green-400 mx-auto mb-1" /> : <TrendingDown className="w-3 h-3 text-red-400 mx-auto mb-1" />}
                                  <p className="text-white text-xs font-medium">{m.asset}</p>
                                  <p className={`text-xs font-bold ${m.direction === "up" ? "text-green-400" : "text-red-400"}`}>{m.magnitude}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {analog.warning_signs_then?.length > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                              <p className="text-yellow-400 text-xs font-medium mb-1">Warning Signs Then</p>
                              <ul className="text-gray-300 text-xs space-y-1">
                                {analog.warning_signs_then.map((w, j) => <li key={j}>• {w}</li>)}
                              </ul>
                            </div>
                          )}
                          {analog.how_it_ended && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                              <p className="text-blue-400 text-xs font-medium mb-1">How It Ended</p>
                              <p className="text-gray-300 text-xs">{analog.how_it_ended}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Suggested Positions */}
                {result.suggested_positions?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Suggested Positions (Based on Historical Outcomes)</h3>
                    <div className="space-y-2">
                      {result.suggested_positions.map((p, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${p.action === "long" ? "bg-green-500/10 border-green-500/20" : p.action === "short" ? "bg-red-500/10 border-red-500/20" : "bg-gray-800 border-gray-700"}`}>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${p.action === "long" ? "bg-green-500 text-white" : p.action === "short" ? "bg-red-500 text-white" : "bg-gray-600 text-white"}`}>{p.action}</span>
                          <div>
                            <p className="text-white text-sm font-medium">{p.asset}</p>
                            <p className="text-gray-400 text-xs">{p.rationale}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: 30-Day Prediction */}
        {activeTab === "predict" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Asset</label>
                  <input
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    placeholder="e.g. Bitcoin, Gold, S&P 500, EUR/USD"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Current Context (optional)</label>
                  <input
                    value={assetContext}
                    onChange={(e) => setAssetContext(e.target.value)}
                    placeholder="e.g. Post-halving, high inflation, rate cuts expected"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <button
                onClick={predict30d}
                disabled={loadingPredict || !asset.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                {loadingPredict ? "Analyzing history..." : "Generate 30-Day Prediction"}
              </button>
            </div>

            {prediction && (
              <div className="space-y-4">
                {/* Weighted Prediction */}
                {prediction.weighted_prediction && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4">Weighted Historical Prediction</h3>
                    <div className="flex items-center gap-6 mb-4">
                      <div>
                        <p className={`text-3xl font-bold capitalize ${prediction.weighted_prediction.direction === "bullish" ? "text-green-400" : prediction.weighted_prediction.direction === "bearish" ? "text-red-400" : "text-yellow-400"}`}>
                          {prediction.weighted_prediction.direction}
                        </p>
                        <p className="text-gray-400 text-sm">{prediction.weighted_prediction.confidence}% confidence</p>
                      </div>
                      {prediction.weighted_prediction.price_change_range && (
                        <div className="text-center">
                          <p className="text-gray-400 text-xs mb-1">Price Change Range</p>
                          <p className="text-green-400 text-sm">High: {prediction.weighted_prediction.price_change_range.high}%</p>
                          <p className="text-yellow-400 text-sm">Mid: {prediction.weighted_prediction.price_change_range.mid}%</p>
                          <p className="text-red-400 text-sm">Low: {prediction.weighted_prediction.price_change_range.low}%</p>
                        </div>
                      )}
                      {prediction.probability_breakdown && (
                        <div className="flex-1">
                          <p className="text-gray-400 text-xs mb-2">Probability Breakdown</p>
                          <div className="flex h-4 rounded-full overflow-hidden">
                            <div style={{ width: `${prediction.probability_breakdown.bull}%` }} className="bg-green-500" title={`Bull ${prediction.probability_breakdown.bull}%`} />
                            <div style={{ width: `${prediction.probability_breakdown.base}%` }} className="bg-yellow-500" title={`Base ${prediction.probability_breakdown.base}%`} />
                            <div style={{ width: `${prediction.probability_breakdown.bear}%` }} className="bg-red-500" title={`Bear ${prediction.probability_breakdown.bear}%`} />
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-green-400">Bull {prediction.probability_breakdown.bull}%</span>
                            <span className="text-yellow-400">Base {prediction.probability_breakdown.base}%</span>
                            <span className="text-red-400">Bear {prediction.probability_breakdown.bear}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {prediction.weighted_prediction.key_catalyst_to_watch && (
                      <p className="text-yellow-400 text-sm">⚡ Key catalyst: {prediction.weighted_prediction.key_catalyst_to_watch}</p>
                    )}
                  </div>
                )}

                {/* Scenarios */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: "Bull Case", text: prediction.bull_case, color: "green" },
                    { label: "Base Case", text: prediction.base_case, color: "yellow" },
                    { label: "Bear Case", text: prediction.bear_case, color: "red" },
                  ].map((s) => (
                    <div key={s.label} className={`bg-${s.color}-500/10 border border-${s.color}-500/20 rounded-xl p-4`}>
                      <p className={`text-${s.color}-400 text-xs font-bold mb-2`}>{s.label}</p>
                      <p className="text-gray-300 text-sm">{s.text}</p>
                    </div>
                  ))}
                </div>

                {/* Historical Base Cases */}
                {prediction.historical_base_cases?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">Historical Base Cases Used</h3>
                    <div className="space-y-2">
                      {prediction.historical_base_cases.map((hbc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div>
                            <p className="text-white text-sm">{hbc.period}</p>
                            <p className="text-gray-400 text-xs">{hbc.outcome_30d}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${hbc.price_change_pct >= 0 ? "text-green-400" : "text-red-400"}`}>{hbc.price_change_pct > 0 ? "+" : ""}{hbc.price_change_pct}%</p>
                            <p className="text-gray-500 text-xs">{hbc.similarity}% match</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Knowledge Graph */}
        {activeTab === "graph" && (
          <div className="space-y-4">
            {!knowledgeGraph ? (
              <div className="text-center py-8 text-gray-400">Loading knowledge graph...</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">{knowledgeGraph.total_events}</p>
                    <p className="text-gray-400 text-sm">Historical Events</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">95</p>
                    <p className="text-gray-400 text-sm">Years Covered</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">6</p>
                    <p className="text-gray-400 text-sm">Asset Classes</p>
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" /> Indexed Events
                  </h3>
                  <div className="space-y-2">
                    {knowledgeGraph.events?.map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                        <div>
                          <p className="text-white text-sm font-medium">{e.name}</p>
                          <p className="text-gray-400 text-xs">{e.period}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                          {e.triggers?.slice(0, 3).map((t, i) => (
                            <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
