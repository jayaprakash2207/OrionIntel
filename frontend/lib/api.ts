const BASE = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

async function call(path: string, method = 'GET', body?: unknown) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    return await res.json()
  } catch (_err) {
    return { success: false, error: 'Backend offline — start Python server', data: null }
  }
}

export const api = {
  query: (q: string, history: unknown[] = []) =>
    call('/api/ai/query', 'POST', { question: q, history }),
  debate: (asset: string, question: string) =>
    call('/api/ai/debate', 'POST', { asset, question }),
  butterfly: (headline: string, description = '') =>
    call('/api/ai/butterfly', 'POST', { headline, description }),
  stressTest: (event: string, region = 'Global') =>
    call('/api/ai/stress-test', 'POST', { event, region }),
  timeline: (event: string) =>
    call('/api/ai/timeline', 'POST', { event }),
  opportunities: (event: string, affected_asset = '') =>
    call('/api/ai/opportunities', 'POST', { event, affected_asset }),
  memory: (situation: string) =>
    call('/api/ai/memory', 'POST', { situation }),
  scoreNews: (articles: unknown[]) =>
    call('/api/ai/score-news', 'POST', { articles }),
  lawToLedger: (law_text: string, title = '') =>
    call('/api/ai/law-to-ledger/analyze', 'POST', { law_text, title }),
  recentLaws: (country = 'US') =>
    call(`/api/ai/law-to-ledger/recent?country=${encodeURIComponent(country)}`),
  fearGreedExtended: () => call('/api/ai/sentiment/fear-greed-extended'),
  assetSentiment: (asset: string, news_headlines: string[] = []) =>
    call('/api/ai/sentiment/asset', 'POST', { asset, news_headlines }),
  marketEmotions: () => call('/api/ai/sentiment/market-emotions'),
  buildStrategy: (
    goalOrPayload: string | {
      goal: string
      risk_tolerance?: string
      time_horizon?: string
      capital?: number
      excluded_sectors?: string[]
    },
    risk?: string,
    horizon?: string,
    capital?: number,
    excluded?: string[],
  ) => {
    if (typeof goalOrPayload === 'string') {
      return call('/api/ai/strategy', 'POST', {
        goal: goalOrPayload,
        risk_tolerance: risk,
        time_horizon: horizon,
        capital,
        excluded_sectors: excluded ?? [],
      })
    }
    return call('/api/ai/strategy', 'POST', goalOrPayload)
  },
  adjustStrategy: (current_strategy: unknown, market_change: string) =>
    call('/api/ai/strategy/adjust', 'POST', { current_strategy, market_change }),
  centralBankAnalyze: (statement_text: string, bank = 'fed') =>
    call('/api/ai/central-bank/analyze', 'POST', { statement_text, bank }),
  rateOutlook: () => call('/api/ai/central-bank/rate-outlook'),
  savePrediction: (payload: {
    agent_type: string
    event_trigger: string
    asset: string
    predicted_direction: string
    predicted_magnitude: number
    timeframe_days: number
    metadata?: Record<string, unknown>
  }) => call('/api/ai/self-learning/predictions', 'POST', payload),
  agentPerformance: (agent_type?: string) =>
    call(agent_type ? `/api/ai/self-learning/performance?agent_type=${encodeURIComponent(agent_type)}` : '/api/ai/self-learning/performance'),
  resolvePredictions: () => call('/api/ai/self-learning/resolve', 'POST'),
  geopoliticsScore: (country: string) =>
    call('/api/ai/geopolitics/score', 'POST', { country }),
  geopoliticsMap: () => call('/api/ai/geopolitics/map'),
  geopoliticsCompare: (country1: string, country2: string) =>
    call('/api/ai/geopolitics/compare', 'POST', { country1, country2 }),
  climateAnalyze: (event: string, location: string, severity = 'moderate') =>
    call('/api/ai/climate/analyze', 'POST', { event, location, severity }),
  climateWatchlist: () => call('/api/ai/climate/watchlist'),
  simulateElection: (country: string, candidates: string[] = [], election_date = '') =>
    call('/api/ai/elections/simulate', 'POST', { country, candidates, election_date }),
  upcomingElections: () => call('/api/ai/elections/upcoming'),
  cultureCurrent: () => call('/api/ai/culture/current'),
  cultureImpact: (event: string, region: string) =>
    call('/api/ai/culture/impact', 'POST', { event, region }),
  unusualAnalyze: (asset: string, activity_description: string) =>
    call('/api/ai/unusual/analyze', 'POST', { asset, activity_description }),
  unusualScan: (assets: string[]) =>
    call('/api/ai/unusual/scan', 'POST', { assets }),

  // Aliases for backward compatibility with all page variants
  lawAnalysis: (law_text: string, title = '') =>
    call('/api/ai/law-analysis', 'POST', { law_text, title }),
  sentiment: (asset: string, headlines: string[] = []) =>
    call('/api/ai/sentiment', 'POST', { asset, news_headlines: headlines }),
  marketEmotionsV2: () => call('/api/ai/sentiment/market-emotions'),
  fearGreedExtendedV2: () => call('/api/ai/sentiment/fear-greed'),
  centralBank: (text: string, bank = 'fed') =>
    call('/api/ai/central-bank', 'POST', { statement_text: text, bank }),
  savePredictionV2: (data: object) => call('/api/ai/predictions/save', 'POST', data),
  predictionPerformance: (agent?: string) => call(`/api/ai/predictions/performance${agent ? `?agent_type=${agent}` : ''}`),
  resolvePredictionsV2: () => call('/api/ai/predictions/resolve'),
  geoRisk: (country: string) => call('/api/ai/geo-risk', 'POST', { country }),
  globalRiskMap: () => call('/api/ai/geo-risk/global-map'),
  climateAnalysis: (event: string, location: string, severity = 'moderate') =>
    call('/api/ai/climate', 'POST', { event, location, severity }),
  climateWatchlistV2: () => call('/api/ai/climate/watchlist'),
  upcomingElectionsV2: () => call('/api/ai/election/upcoming'),
  culturalCalendar: (event: string, region: string) =>
    call('/api/ai/cultural-calendar', 'POST', { event, region }),
  currentCulturalEvents: () => call('/api/ai/cultural-calendar/current'),
  detectAnomalies: (assets: string[]) => call('/api/ai/anomalies', 'POST', { assets }),
  socialSentiment: (asset: string) => call('/api/ai/social-sentiment', 'POST', { asset }),
  bitcoinOnchain: () => call('/api/ai/onchain/bitcoin'),
  defiOverview: () => call('/api/ai/onchain/defi'),
  marketOverview: () => call('/api/market/overview'),
  news: (limit = 30) => call(`/api/news?limit=${limit}`),
  newsSearch: (q: string) => call(`/api/news/search?q=${encodeURIComponent(q)}`),
  health: () => call('/api/health'),

  // Portfolio
  portfolioExposure: (positions: Array<{asset: string, value: number, type: string}>, total_capital = 100000) =>
    call('/api/ai/portfolio/exposure', 'POST', { positions, total_capital }),
  portfolioStress: (positions: Array<{asset: string, value: number, type: string}>, scenario: string) =>
    call('/api/ai/portfolio/stress', 'POST', { positions, scenario }),
  portfolioSummary: (positions: Array<{asset: string, value: number, type: string}>) =>
    call('/api/ai/portfolio/summary', 'POST', { positions }),

  // Black Swan
  blackSwanScan: (market_context: string) =>
    call('/api/ai/black-swan/scan', 'POST', { market_context }),
  volatilityRegime: (asset: string, context = '') =>
    call('/api/ai/black-swan/volatility', 'POST', { asset, context }),
  systemicRiskDashboard: () => call('/api/ai/black-swan/dashboard'),

  // CEO Speech
  ceoSpeechAnalyze: (transcript: string, company = '', speaker = 'CEO', context = '') =>
    call('/api/ai/ceo-speech/analyze', 'POST', { transcript, company, speaker, context }),
  ceoSpeechCompare: (current_transcript: string, previous_transcript: string, company = '') =>
    call('/api/ai/ceo-speech/compare', 'POST', { current_transcript, previous_transcript, company }),

  // Deepfake
  deepfakeVerify: (content: string, source_url = '', media_type = 'article') =>
    call('/api/ai/deepfake/verify', 'POST', { content, source_url, media_type }),
  deepfakeBatch: (articles: Array<{title: string, content: string, source?: string}>) =>
    call('/api/ai/deepfake/batch', 'POST', { articles }),

  // Education
  educationExplain: (concept: string, level = 'intermediate', context = '') =>
    call('/api/ai/education/explain', 'POST', { concept, level, context }),
  educationEvent: (event: string, level = 'intermediate') =>
    call('/api/ai/education/event', 'POST', { event, level }),
  learningPath: (goal: string, current_level = 'beginner') =>
    call('/api/ai/education/learning-path', 'POST', { goal, current_level }),
  educationQuestion: (question: string, level = 'intermediate') =>
    call('/api/ai/education/question', 'POST', { question, level }),

  // Wealth Migration
  wealthFlows: (region = 'Global', asset_class = 'all') =>
    call('/api/ai/wealth/flows', 'POST', { region, asset_class }),
  sovereignWealth: (country: string) =>
    call('/api/ai/wealth/sovereign', 'POST', { country }),
  smartMoneyDivergence: (asset: string) =>
    call('/api/ai/wealth/smart-money', 'POST', { asset }),

  // Backtesting
  runBacktest: (strategy: string, asset: string, period = '10 years', initial_capital = 10000) =>
    call('/api/ai/backtest/run', 'POST', { strategy, asset, period, initial_capital }),
  compareStrategies: (strategies: string[], asset: string, period = '10 years') =>
    call('/api/ai/backtest/compare', 'POST', { strategies, asset, period }),
  optimizeEntryExit: (asset: string, strategy_goal: string, period = '5 years') =>
    call('/api/ai/backtest/optimize', 'POST', { asset, strategy_goal, period }),

  // Satellite/Alternative Data
  weatherSignals: (region = 'Global') => call(`/api/ai/satellite/weather?region=${encodeURIComponent(region)}`),
  cropStress: () => call('/api/ai/satellite/crops'),
  alternativeSignals: () => call('/api/ai/satellite/signals'),

  // Law RAG
  ingestLaw: (law_text: string, title: string, country = 'US') =>
    call('/api/ai/law-to-ledger/ingest', 'POST', { law_text, title, country }),
  searchLaws: (query: string, n_results = 5) =>
    call('/api/ai/law-to-ledger/search', 'POST', { query, n_results }),

  // Historical Mirror
  historicalAnalogs: (current_conditions: string, top_n = 3) =>
    call('/api/ai/historical-mirror/analogs', 'POST', { current_conditions, top_n }),
  historicalDeepDive: (event_id: string) =>
    call('/api/ai/historical-mirror/deep-dive', 'POST', { event_id }),
  predict30d: (asset: string, current_context = '') =>
    call('/api/ai/historical-mirror/predict-30d', 'POST', { asset, current_context }),
  historicalKnowledgeGraph: () => call('/api/ai/historical-mirror/knowledge-graph'),

  // Regulatory Time Machine
  regulatorySimulate: (company: string, regulation: string, apply_from_year: number, current_year = 2025) =>
    call('/api/ai/regulatory-time-machine/simulate', 'POST', { company, regulation, apply_from_year, current_year }),
  regulatoryCompare: (companies: string[], regulation: string, apply_from_year: number) =>
    call('/api/ai/regulatory-time-machine/compare', 'POST', { companies, regulation, apply_from_year }),
  regulatoryPredict: (company: string, upcoming_regulation: string, implementation_year: number) =>
    call('/api/ai/regulatory-time-machine/predict', 'POST', { company, upcoming_regulation, implementation_year }),
  regulationPresets: () => call('/api/ai/regulatory-time-machine/presets'),

  // Live Prices
  livePrices: () => call('/api/prices/live'),
  livePrice: (symbol: string) => call(`/api/prices/live/${symbol}`),

  // Social Sentiment
  socialSentimentAsset: (asset: string) => call(`/api/social/sentiment/${encodeURIComponent(asset)}`),
  socialTrending: () => call('/api/social/trending'),
  wsbMood: () => call('/api/social/wsb'),

  // Shipping & Supply Chain
  shippingPorts: () => call('/api/shipping/ports'),
  tradeFlow: (country1 = 'USA', country2 = 'China') => call(`/api/shipping/trade?country1=${country1}&country2=${country2}`),
  commoditySupplyChain: (commodity: string) => call(`/api/shipping/commodity/${encodeURIComponent(commodity)}`),

  // Prediction Tracking
  savePrediction: (data: Record<string, unknown>) => call('/api/predictions/save', 'POST', data),
  getPredictions: (asset?: string, limit = 20) => call(`/api/predictions${asset ? `?asset=${asset}&limit=${limit}` : `?limit=${limit}`}`),
  resolvePrediction: (prediction_id: string, actual_outcome: string, actual_price?: number, was_correct?: boolean) =>
    call('/api/predictions/resolve', 'POST', { prediction_id, actual_outcome, actual_price, was_correct }),
  predictionStats: () => call('/api/predictions/stats'),
  predictionSetupSQL: () => call('/api/predictions/setup'),
}
