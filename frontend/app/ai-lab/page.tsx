"use client"

import { useState } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'
import { api } from '@/lib/api'
import { Loader2, Rocket, Scale, Globe2, CloudSun, Vote, Calendar, AlertTriangle } from 'lucide-react'

interface ResponseBlockProps {
  title: string
  loading: boolean
  data: unknown
}

function ResponseBlock({ title, loading, data }: ResponseBlockProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {loading && <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />}
      </div>
      <pre className="whitespace-pre-wrap text-xs text-gray-300 leading-relaxed bg-gray-950/50 rounded-lg p-3 border border-gray-800 overflow-x-auto">
        {data ? JSON.stringify(data, null, 2) : 'No data yet'}
      </pre>
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs text-gray-400">{label}</span>
      <input
        className="input-field"
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs text-gray-400">{label}</span>
      <textarea
        className="input-field h-auto"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

export default function AiLabPage() {
  const [lawTitle, setLawTitle] = useState('')
  const [lawText, setLawText] = useState('')
  const [lawData, setLawData] = useState<unknown>(null)
  const [recentLaws, setRecentLaws] = useState<unknown>(null)
  const [lawLoading, setLawLoading] = useState(false)
  const [recentLoading, setRecentLoading] = useState(false)

  const [sentimentAsset, setSentimentAsset] = useState('NVDA')
  const [sentimentHeadlines, setSentimentHeadlines] = useState('')
  const [sentimentData, setSentimentData] = useState<unknown>(null)
  const [fearGreedData, setFearGreedData] = useState<unknown>(null)
  const [emotionsData, setEmotionsData] = useState<unknown>(null)
  const [sentimentLoading, setSentimentLoading] = useState(false)
  const [fearLoading, setFearLoading] = useState(false)
  const [emotionLoading, setEmotionLoading] = useState(false)

  const [strategyGoal, setStrategyGoal] = useState('Generate income with low drawdowns')
  const [strategyRisk, setStrategyRisk] = useState('moderate')
  const [strategyHorizon, setStrategyHorizon] = useState('1-3 years')
  const [strategyCapital, setStrategyCapital] = useState('25000')
  const [strategyExclude, setStrategyExclude] = useState('crypto, airlines')
  const [strategyData, setStrategyData] = useState<unknown>(null)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [adjustData, setAdjustData] = useState<unknown>(null)
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [marketChange, setMarketChange] = useState('Unexpected rate hike and oil spike')
  const [currentStrategyJson, setCurrentStrategyJson] = useState('')

  const [cbStatement, setCbStatement] = useState('Inflation remains above target and labor markets are tight.')
  const [cbBank, setCbBank] = useState('fed')
  const [cbData, setCbData] = useState<unknown>(null)
  const [cbLoading, setCbLoading] = useState(false)
  const [outlookData, setOutlookData] = useState<unknown>(null)
  const [outlookLoading, setOutlookLoading] = useState(false)

  const [predictionPayload, setPredictionPayload] = useState({
    agent_type: 'strategy_builder',
    event_trigger: 'Fed cuts by 50bps',
    asset: 'TLT',
    predicted_direction: 'up',
    predicted_magnitude: 8,
    timeframe_days: 30,
    metadata: '{}',
  })
  const [predictionData, setPredictionData] = useState<unknown>(null)
  const [predictionLoading, setPredictionLoading] = useState(false)
  const [performanceAgent, setPerformanceAgent] = useState('')
  const [performanceData, setPerformanceData] = useState<unknown>(null)
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [resolveData, setResolveData] = useState<unknown>(null)
  const [resolveLoading, setResolveLoading] = useState(false)

  const [geoCountry, setGeoCountry] = useState('Taiwan')
  const [geoData, setGeoData] = useState<unknown>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoMapData, setGeoMapData] = useState<unknown>(null)
  const [geoMapLoading, setGeoMapLoading] = useState(false)
  const [geoCountry2, setGeoCountry2] = useState('China')
  const [geoCompareData, setGeoCompareData] = useState<unknown>(null)
  const [geoCompareLoading, setGeoCompareLoading] = useState(false)

  const [climateEvent, setClimateEvent] = useState('Hurricane landfall')
  const [climateLocation, setClimateLocation] = useState('Gulf Coast')
  const [climateSeverity, setClimateSeverity] = useState('high')
  const [climateData, setClimateData] = useState<unknown>(null)
  const [climateLoading, setClimateLoading] = useState(false)
  const [climateWatchlistData, setClimateWatchlistData] = useState<unknown>(null)
  const [climateWatchlistLoading, setClimateWatchlistLoading] = useState(false)

  const [electionCountry, setElectionCountry] = useState('USA')
  const [electionCandidates, setElectionCandidates] = useState('Incumbent, Challenger')
  const [electionDate, setElectionDate] = useState('2026-11-03')
  const [electionData, setElectionData] = useState<unknown>(null)
  const [electionLoading, setElectionLoading] = useState(false)
  const [electionUpcomingData, setElectionUpcomingData] = useState<unknown>(null)
  const [electionUpcomingLoading, setElectionUpcomingLoading] = useState(false)

  const [cultureEvent, setCultureEvent] = useState('Diwali')
  const [cultureRegion, setCultureRegion] = useState('India')
  const [cultureCurrentData, setCultureCurrentData] = useState<unknown>(null)
  const [cultureCurrentLoading, setCultureCurrentLoading] = useState(false)
  const [cultureImpactData, setCultureImpactData] = useState<unknown>(null)
  const [cultureImpactLoading, setCultureImpactLoading] = useState(false)

  const [unusualAsset, setUnusualAsset] = useState('AAPL')
  const [unusualDesc, setUnusualDesc] = useState('Massive weekly call buying 5x average volume')
  const [unusualData, setUnusualData] = useState<unknown>(null)
  const [unusualLoading, setUnusualLoading] = useState(false)
  const [scanAssets, setScanAssets] = useState('TSLA, NVDA, GME')
  const [scanData, setScanData] = useState<unknown>(null)
  const [scanLoading, setScanLoading] = useState(false)

  async function runLaw() {
    if (!lawText.trim()) return
    setLawLoading(true)
    const res = await api.lawToLedger(lawText, lawTitle)
    setLawData(res?.data ?? res)
    setLawLoading(false)
  }

  async function loadRecentLaws() {
    setRecentLoading(true)
    const res = await api.recentLaws('US')
    setRecentLaws(res?.data ?? res)
    setRecentLoading(false)
  }

  async function runSentiment() {
    setSentimentLoading(true)
    const headlines = sentimentHeadlines
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean)
    const res = await api.assetSentiment(sentimentAsset, headlines)
    setSentimentData(res?.data ?? res)
    setSentimentLoading(false)
  }

  async function loadFearGreed() {
    setFearLoading(true)
    const res = await api.fearGreedExtended()
    setFearGreedData(res?.data ?? res)
    setFearLoading(false)
  }

  async function loadEmotions() {
    setEmotionLoading(true)
    const res = await api.marketEmotions()
    setEmotionsData(res?.data ?? res)
    setEmotionLoading(false)
  }

  async function build() {
    setStrategyLoading(true)
    const excluded = strategyExclude
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const res = await api.buildStrategy({
      goal: strategyGoal,
      risk_tolerance: strategyRisk,
      time_horizon: strategyHorizon,
      capital: Number(strategyCapital) || 0,
      excluded_sectors: excluded,
    })
    setStrategyData(res?.data ?? res)
    setStrategyLoading(false)
  }

  async function adjust() {
    if (!currentStrategyJson.trim()) return
    setAdjustLoading(true)
    try {
      const parsed = JSON.parse(currentStrategyJson)
      const res = await api.adjustStrategy(parsed, marketChange)
      setAdjustData(res?.data ?? res)
    } catch (e) {
      setAdjustData({ error: 'Invalid JSON for current strategy' })
    }
    setAdjustLoading(false)
  }

  async function analyzeCb() {
    setCbLoading(true)
    const res = await api.centralBankAnalyze(cbStatement, cbBank)
    setCbData(res?.data ?? res)
    setCbLoading(false)
  }

  async function loadOutlook() {
    setOutlookLoading(true)
    const res = await api.rateOutlook()
    setOutlookData(res?.data ?? res)
    setOutlookLoading(false)
  }

  async function savePrediction() {
    setPredictionLoading(true)
    let metadataObj: Record<string, unknown> = {}
    try {
      metadataObj = predictionPayload.metadata ? JSON.parse(predictionPayload.metadata) : {}
    } catch (_) {
      metadataObj = { note: 'metadata parse failed' }
    }
    const res = await api.savePrediction({
      ...predictionPayload,
      predicted_magnitude: Number(predictionPayload.predicted_magnitude) || 0,
      timeframe_days: Number(predictionPayload.timeframe_days) || 0,
      metadata: metadataObj,
    })
    setPredictionData(res?.data ?? res)
    setPredictionLoading(false)
  }

  async function loadPerformance() {
    setPerformanceLoading(true)
    const res = await api.agentPerformance(performanceAgent || undefined)
    setPerformanceData(res?.data ?? res)
    setPerformanceLoading(false)
  }

  async function resolvePredictions() {
    setResolveLoading(true)
    const res = await api.resolvePredictions()
    setResolveData(res?.data ?? res)
    setResolveLoading(false)
  }

  async function scoreGeo() {
    setGeoLoading(true)
    const res = await api.geopoliticsScore(geoCountry)
    setGeoData(res?.data ?? res)
    setGeoLoading(false)
  }

  async function loadGeoMap() {
    setGeoMapLoading(true)
    const res = await api.geopoliticsMap()
    setGeoMapData(res?.data ?? res)
    setGeoMapLoading(false)
  }

  async function compareGeo() {
    setGeoCompareLoading(true)
    const res = await api.geopoliticsCompare(geoCountry, geoCountry2)
    setGeoCompareData(res?.data ?? res)
    setGeoCompareLoading(false)
  }

  async function analyzeClimate() {
    setClimateLoading(true)
    const res = await api.climateAnalyze(climateEvent, climateLocation, climateSeverity)
    setClimateData(res?.data ?? res)
    setClimateLoading(false)
  }

  async function loadClimateWatchlist() {
    setClimateWatchlistLoading(true)
    const res = await api.climateWatchlist()
    setClimateWatchlistData(res?.data ?? res)
    setClimateWatchlistLoading(false)
  }

  async function simulateElection() {
    setElectionLoading(true)
    const candidates = electionCandidates
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
    const res = await api.simulateElection(electionCountry, candidates, electionDate)
    setElectionData(res?.data ?? res)
    setElectionLoading(false)
  }

  async function loadUpcomingElections() {
    setElectionUpcomingLoading(true)
    const res = await api.upcomingElections()
    setElectionUpcomingData(res?.data ?? res)
    setElectionUpcomingLoading(false)
  }

  async function loadCurrentCulture() {
    setCultureCurrentLoading(true)
    const res = await api.cultureCurrent()
    setCultureCurrentData(res?.data ?? res)
    setCultureCurrentLoading(false)
  }

  async function analyzeCultureImpact() {
    setCultureImpactLoading(true)
    const res = await api.cultureImpact(cultureEvent, cultureRegion)
    setCultureImpactData(res?.data ?? res)
    setCultureImpactLoading(false)
  }

  async function analyzeUnusual() {
    setUnusualLoading(true)
    const res = await api.unusualAnalyze(unusualAsset, unusualDesc)
    setUnusualData(res?.data ?? res)
    setUnusualLoading(false)
  }

  async function scanUnusual() {
    setScanLoading(true)
    const assets = scanAssets
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
    const res = await api.unusualScan(assets)
    setScanData(res?.data ?? res)
    setScanLoading(false)
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Lab</h1>
            <p className="text-gray-400 text-sm">Run OrionIntel&apos;s experimental agents side-by-side.</p>
          </div>
        </div>

        {/* Law-to-Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">Law-to-Ledger</h2>
              <button onClick={loadRecentLaws} className="text-xs text-purple-300 hover:text-white" disabled={recentLoading}>
                {recentLoading ? 'Loading…' : 'Fetch recent bills'}
              </button>
            </div>
            <TextInput label="Title" value={lawTitle} onChange={setLawTitle} placeholder="Example: Digital Asset Compliance Act" />
            <TextArea label="Law / Bill text" value={lawText} onChange={setLawText} placeholder="Paste law or bill text" rows={6} />
            <button className="btn-primary w-full" onClick={runLaw} disabled={lawLoading || !lawText.trim()}>
              {lawLoading ? 'Analyzing…' : 'Analyze Law'}
            </button>
          </div>
          <div className="space-y-3">
            <ResponseBlock title="Recent laws" loading={recentLoading} data={recentLaws} />
            <ResponseBlock title="Law analysis" loading={lawLoading} data={lawData} />
          </div>
        </div>

        {/* Sentiment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">Asset Sentiment</h2>
              <button onClick={runSentiment} className="btn-secondary" disabled={sentimentLoading}>Run</button>
            </div>
            <TextInput label="Asset" value={sentimentAsset} onChange={setSentimentAsset} placeholder="e.g. NVDA" />
            <TextArea label="Headlines (optional, newline separated)" value={sentimentHeadlines} onChange={setSentimentHeadlines} rows={4} />
          </div>
          <ResponseBlock title="Sentiment" loading={sentimentLoading} data={sentimentData} />
          <div className="space-y-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-200">
                <span>Fear & Greed</span>
                <button className="btn-secondary" onClick={loadFearGreed} disabled={fearLoading}>Refresh</button>
              </div>
              <ResponseBlock title="Index" loading={fearLoading} data={fearGreedData} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-200">
                <span>Market Emotions</span>
                <button className="btn-secondary" onClick={loadEmotions} disabled={emotionLoading}>Refresh</button>
              </div>
              <ResponseBlock title="Emotions" loading={emotionLoading} data={emotionsData} />
            </div>
          </div>
        </div>

        {/* Strategy Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <Scale className="h-4 w-4 text-purple-300" />
                <span>Strategy Builder</span>
              </div>
              <button className="btn-secondary" onClick={build} disabled={strategyLoading}>Build</button>
            </div>
            <TextArea label="Goal" value={strategyGoal} onChange={setStrategyGoal} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Risk tolerance" value={strategyRisk} onChange={setStrategyRisk} />
              <TextInput label="Time horizon" value={strategyHorizon} onChange={setStrategyHorizon} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Capital" type="number" value={strategyCapital} onChange={setStrategyCapital} />
              <TextInput label="Exclude sectors" value={strategyExclude} onChange={setStrategyExclude} />
            </div>
          </div>
          <ResponseBlock title="Strategy" loading={strategyLoading} data={strategyData} />
        </div>

        {/* Strategy Adjust */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-200">Adjust Strategy</span>
              <button className="btn-secondary" onClick={adjust} disabled={adjustLoading}>Adjust</button>
            </div>
            <TextArea label="Current strategy JSON" value={currentStrategyJson} onChange={setCurrentStrategyJson} rows={5} />
            <TextInput label="Market change" value={marketChange} onChange={setMarketChange} />
          </div>
          <ResponseBlock title="Adjustments" loading={adjustLoading} data={adjustData} />
        </div>

        {/* Central Bank */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <Globe2 className="h-4 w-4 text-purple-300" />
                <span>Central Bank Tone</span>
              </div>
              <select className="input-field w-32" value={cbBank} onChange={(e) => setCbBank(e.target.value)}>
                <option value="fed">Fed</option>
                <option value="ecb">ECB</option>
                <option value="boj">BOJ</option>
                <option value="boe">BOE</option>
              </select>
            </div>
            <TextArea label="Statement" value={cbStatement} onChange={setCbStatement} rows={4} />
            <div className="flex gap-2">
              <button className="btn-primary w-1/2" onClick={analyzeCb} disabled={cbLoading}>Analyze</button>
              <button className="btn-secondary w-1/2" onClick={loadOutlook} disabled={outlookLoading}>Rate outlook</button>
            </div>
          </div>
          <div className="space-y-3">
            <ResponseBlock title="Tone analysis" loading={cbLoading} data={cbData} />
            <ResponseBlock title="Rate outlook" loading={outlookLoading} data={outlookData} />
          </div>
        </div>

        {/* Self-Learning */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-200">Save Prediction</span>
              <button className="btn-secondary" onClick={savePrediction} disabled={predictionLoading}>Save</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Agent" value={predictionPayload.agent_type} onChange={(v) => setPredictionPayload({ ...predictionPayload, agent_type: v })} />
              <TextInput label="Asset" value={predictionPayload.asset} onChange={(v) => setPredictionPayload({ ...predictionPayload, asset: v })} />
            </div>
            <TextArea label="Event trigger" value={predictionPayload.event_trigger} onChange={(v) => setPredictionPayload({ ...predictionPayload, event_trigger: v })} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Direction" value={predictionPayload.predicted_direction} onChange={(v) => setPredictionPayload({ ...predictionPayload, predicted_direction: v })} />
              <TextInput label="Magnitude %" value={String(predictionPayload.predicted_magnitude)} onChange={(v) => setPredictionPayload({ ...predictionPayload, predicted_magnitude: Number(v) })} />
            </div>
            <TextInput label="Timeframe (days)" value={String(predictionPayload.timeframe_days)} onChange={(v) => setPredictionPayload({ ...predictionPayload, timeframe_days: Number(v) })} />
            <TextArea label="Metadata JSON" value={predictionPayload.metadata} onChange={(v) => setPredictionPayload({ ...predictionPayload, metadata: v })} rows={2} />
          </div>
          <ResponseBlock title="Saved" loading={predictionLoading} data={predictionData} />
          <div className="space-y-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-200">
                <span>Performance</span>
                <button className="btn-secondary" onClick={loadPerformance} disabled={performanceLoading}>Refresh</button>
              </div>
              <TextInput label="Filter agent (optional)" value={performanceAgent} onChange={setPerformanceAgent} placeholder="agent name" />
              <ResponseBlock title="Performance" loading={performanceLoading} data={performanceData} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-200">
                <span>Resolve matured</span>
                <button className="btn-secondary" onClick={resolvePredictions} disabled={resolveLoading}>Run</button>
              </div>
              <ResponseBlock title="Resolution" loading={resolveLoading} data={resolveData} />
            </div>
          </div>
        </div>

        {/* Geopolitics & Climate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <span>Geopolitical Risk</span>
              </div>
              <button className="btn-secondary" onClick={loadGeoMap} disabled={geoMapLoading}>Global map</button>
            </div>
            <TextInput label="Country" value={geoCountry} onChange={setGeoCountry} />
            <button className="btn-primary w-full" onClick={scoreGeo} disabled={geoLoading}>Score</button>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Country A" value={geoCountry} onChange={setGeoCountry} />
              <TextInput label="Country B" value={geoCountry2} onChange={setGeoCountry2} />
            </div>
            <button className="btn-secondary w-full" onClick={compareGeo} disabled={geoCompareLoading}>Compare pair</button>
          </div>
          <div className="space-y-3">
            <ResponseBlock title="Country risk" loading={geoLoading} data={geoData} />
            <ResponseBlock title="Country pair" loading={geoCompareLoading} data={geoCompareData} />
            <ResponseBlock title="Global map" loading={geoMapLoading} data={geoMapData} />
          </div>
        </div>

        {/* Climate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <CloudSun className="h-4 w-4 text-cyan-300" />
                <span>Climate-to-Market</span>
              </div>
              <button className="btn-secondary" onClick={loadClimateWatchlist} disabled={climateWatchlistLoading}>Watchlist</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Event" value={climateEvent} onChange={setClimateEvent} />
              <TextInput label="Location" value={climateLocation} onChange={setClimateLocation} />
            </div>
            <TextInput label="Severity" value={climateSeverity} onChange={setClimateSeverity} />
            <button className="btn-primary w-full" onClick={analyzeClimate} disabled={climateLoading}>Analyze</button>
          </div>
          <div className="space-y-3">
            <ResponseBlock title="Climate impact" loading={climateLoading} data={climateData} />
            <ResponseBlock title="Climate watchlist" loading={climateWatchlistLoading} data={climateWatchlistData} />
          </div>
        </div>

        {/* Elections & Culture */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <Vote className="h-4 w-4 text-green-300" />
                <span>Election Simulator</span>
              </div>
              <button className="btn-secondary" onClick={loadUpcomingElections} disabled={electionUpcomingLoading}>Upcoming</button>
            </div>
            <TextInput label="Country" value={electionCountry} onChange={setElectionCountry} />
            <TextInput label="Candidates (comma separated)" value={electionCandidates} onChange={setElectionCandidates} />
            <TextInput label="Election date" value={electionDate} onChange={setElectionDate} />
            <button className="btn-primary w-full" onClick={simulateElection} disabled={electionLoading}>Simulate</button>
          </div>
          <div className="space-y-3">
            <ResponseBlock title="Simulation" loading={electionLoading} data={electionData} />
            <ResponseBlock title="Upcoming elections" loading={electionUpcomingLoading} data={electionUpcomingData} />
          </div>
        </div>

        {/* Cultural & Unusual Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <Calendar className="h-4 w-4 text-blue-300" />
                <span>Cultural Calendar</span>
              </div>
              <button className="btn-secondary" onClick={loadCurrentCulture} disabled={cultureCurrentLoading}>This month</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Event" value={cultureEvent} onChange={setCultureEvent} />
              <TextInput label="Region" value={cultureRegion} onChange={setCultureRegion} />
            </div>
            <button className="btn-primary w-full" onClick={analyzeCultureImpact} disabled={cultureImpactLoading}>Analyze impact</button>
          </div>
          <div className="space-y-3">
            <ResponseBlock title="Current events" loading={cultureCurrentLoading} data={cultureCurrentData} />
            <ResponseBlock title="Impact" loading={cultureImpactLoading} data={cultureImpactData} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <AlertTriangle className="h-4 w-4 text-red-300" />
                <span>Unusual Activity</span>
              </div>
              <button className="btn-secondary" onClick={scanUnusual} disabled={scanLoading}>Scan list</button>
            </div>
            <TextInput label="Asset" value={unusualAsset} onChange={setUnusualAsset} />
            <TextArea label="Activity" value={unusualDesc} onChange={setUnusualDesc} rows={3} />
            <button className="btn-primary w-full" onClick={analyzeUnusual} disabled={unusualLoading}>Analyze</button>
            <TextInput label="Assets to scan (comma separated)" value={scanAssets} onChange={setScanAssets} />
          </div>
          <div className="space-y-3">
            <ResponseBlock title="Unusual detail" loading={unusualLoading} data={unusualData} />
            <ResponseBlock title="Anomaly scan" loading={scanLoading} data={scanData} />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
