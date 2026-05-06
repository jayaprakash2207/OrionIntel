from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from agents.query import run_query
from agents.debate import run_debate
from agents.butterfly import run_butterfly
from agents.stress_test import run_stress_test
from agents.timeline import run_timeline
from agents.opportunity import find_opportunities
from agents.memory_engine import find_historical_pattern
from agents.news_scorer import score_batch
from agents.sentiment import get_fear_greed_extended, analyze_sentiment, get_market_emotions
from agents.strategy_builder import build_strategy, adjust_strategy
from agents.central_bank import analyze_statement, get_rate_outlook
from agents.self_learning import save_prediction, get_agent_performance, resolve_predictions
from agents.geopolitical_risk import score_country_risk, get_global_risk_map, compare_country_pair
from agents.climate_market import analyze_climate_event, get_climate_watchlist
from agents.election_simulator import simulate_election, get_upcoming_elections
from agents.cultural_calendar import get_current_cultural_events, analyze_cultural_impact
from agents.unusual_activity import analyze_unusual_activity, scan_for_anomalies
from services import social_sentiment, on_chain
from agents.anti_deepfake import verify_content, batch_verify
from agents.black_swan import scan_for_black_swan, analyze_volatility_regime, get_systemic_risk_dashboard
from agents.ceo_speech import analyze_speech, compare_speech_baseline
from agents.portfolio_exposure import analyze_exposure, stress_test_portfolio, get_exposure_summary
from agents.education import explain_concept, explain_market_event, generate_learning_path, answer_financial_question
from agents.wealth_migration import track_wealth_flows, analyze_sovereign_wealth, get_smart_money_divergence
from agents.backtesting import backtest_strategy, compare_strategies, optimize_entry_exit
from services.satellite_data import get_weather_market_signals, get_crop_stress_signals, get_alternative_signals
from agents.law_to_ledger import analyze_law, fetch_and_analyze_recent_laws, ingest_law_to_vectorstore, search_laws
from agents.historical_mirror import find_historical_analogs, get_event_deep_dive, predict_next_30_days, get_knowledge_graph_summary
from agents.regulatory_time_machine import simulate_regulation, compare_companies, predict_regulation_impact, get_regulation_presets

router = APIRouter()


def wrap(data):
    return {"success": True, "data": data, "error": None}


def error(msg):
    return {"success": False, "data": None, "error": str(msg)}


# ── Request models ─────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    history: list = []


class DebateRequest(BaseModel):
    asset: str
    question: str


class ButterflyRequest(BaseModel):
    headline: str
    description: str = ""


class StressTestRequest(BaseModel):
    event: str
    region: str = "Global"


class TimelineRequest(BaseModel):
    event: str


class OpportunityRequest(BaseModel):
    event: str
    affected_asset: str = ""


class MemoryRequest(BaseModel):
    situation: str


class NewsScoreRequest(BaseModel):
    articles: list


class LawRequest(BaseModel):
    title: str = ""
    law_text: str


class SentimentAssetRequest(BaseModel):
    asset: str
    news_headlines: list = []


class StrategyRequest(BaseModel):
    goal: str
    risk_tolerance: str = "moderate"
    time_horizon: str = "1-3 years"
    capital: float = 10000
    excluded_sectors: list = []


class StrategyAdjustRequest(BaseModel):
    current_strategy: dict
    market_change: str


class CentralBankRequest(BaseModel):
    statement_text: str
    bank: str = "fed"


class PredictionRequest(BaseModel):
    agent_type: str
    event_trigger: str
    asset: str
    predicted_direction: str
    predicted_magnitude: float
    timeframe_days: int
    metadata: dict = {}


class GeopoliticsScoreRequest(BaseModel):
    country: str


class GeopoliticsCompareRequest(BaseModel):
    country1: str
    country2: str


class ClimateEventRequest(BaseModel):
    event: str
    location: str
    severity: str = "moderate"


class ElectionSimRequest(BaseModel):
    country: str
    candidates: list = []
    election_date: str = ""


class CulturalImpactRequest(BaseModel):
    event: str
    region: str


class UnusualActivityRequest(BaseModel):
    asset: str
    activity_description: str


class UnusualScanRequest(BaseModel):
    assets: list


# Additional request models (new endpoints)
class LawAnalysisRequest(BaseModel):
    law_text: str
    title: str = ""


class SentimentRequest(BaseModel):
    asset: str
    news_headlines: list = []


class CountryRiskRequest(BaseModel):
    country: str


class ClimateRequest(BaseModel):
    event: str
    location: str
    severity: str = "moderate"


class ElectionRequest(BaseModel):
    country: str
    candidates: list = []
    election_date: str = ""


class CulturalRequest(BaseModel):
    event: str
    region: str


class AnomalyRequest(BaseModel):
    assets: list


class SocialSentimentRequest(BaseModel):
    asset: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/query")
async def query(req: QueryRequest):
    try:
        return wrap(await run_query(req.question, req.history))
    except Exception as e:
        return error(e)


@router.post("/debate")
async def debate(req: DebateRequest):
    try:
        return wrap(await run_debate(req.asset, req.question))
    except Exception as e:
        return error(e)


@router.post("/butterfly")
async def butterfly(req: ButterflyRequest):
    try:
        return wrap(await run_butterfly(req.headline, req.description))
    except Exception as e:
        return error(e)


@router.post("/stress-test")
async def stress_test(req: StressTestRequest):
    try:
        return wrap(await run_stress_test(req.event, req.region))
    except Exception as e:
        return error(e)


@router.post("/timeline")
async def timeline(req: TimelineRequest):
    try:
        return wrap(await run_timeline(req.event))
    except Exception as e:
        return error(e)


@router.post("/opportunities")
async def opportunities(req: OpportunityRequest):
    try:
        return wrap(await find_opportunities(req.event, req.affected_asset))
    except Exception as e:
        return error(e)


@router.post("/memory")
async def memory(req: MemoryRequest):
    try:
        return wrap(await find_historical_pattern(req.situation))
    except Exception as e:
        return error(e)


@router.post("/score-news")
async def score_news(req: NewsScoreRequest):
    try:
        return wrap(await score_batch(req.articles))
    except Exception as e:
        return error(e)


# ── Law-to-Ledger ─────────────────────────────────────────────────────────────

@router.post("/law-to-ledger/analyze")
async def law_to_ledger(req: LawRequest):
    try:
        return wrap(await analyze_law(req.law_text, req.title))
    except Exception as e:
        return error(e)


@router.get("/law-to-ledger/recent")
async def recent_laws(country: str = "US"):
    try:
        return wrap(await fetch_and_analyze_recent_laws(country))
    except Exception as e:
        return error(e)


# ── Sentiment & Emotions ─────────────────────────────────────────────────────

@router.get("/sentiment/fear-greed-extended")
async def fear_greed_extended():
    try:
        return wrap(await get_fear_greed_extended())
    except Exception as e:
        return error(e)


@router.post("/sentiment/asset")
async def asset_sentiment(req: SentimentAssetRequest):
    try:
        return wrap(await analyze_sentiment(req.asset, req.news_headlines))
    except Exception as e:
        return error(e)


@router.get("/sentiment/market-emotions")
async def market_emotions():
    try:
        return wrap(await get_market_emotions())
    except Exception as e:
        return error(e)


# ── Strategy Builder ─────────────────────────────────────────────────────────

@router.post("/strategy/build")
async def strategy_build(req: StrategyRequest):
    try:
        return wrap(await build_strategy(
            req.goal,
            req.risk_tolerance,
            req.time_horizon,
            req.capital,
            req.excluded_sectors,
        ))
    except Exception as e:
        return error(e)


@router.post("/strategy/adjust")
async def strategy_adjust(req: StrategyAdjustRequest):
    try:
        return wrap(await adjust_strategy(req.current_strategy, req.market_change))
    except Exception as e:
        return error(e)


# ── Central Bank ─────────────────────────────────────────────────────────────

@router.post("/central-bank/analyze")
async def central_bank_analyze(req: CentralBankRequest):
    try:
        return wrap(await analyze_statement(req.statement_text, req.bank))
    except Exception as e:
        return error(e)


@router.get("/central-bank/rate-outlook")
async def central_bank_outlook():
    try:
        return wrap(await get_rate_outlook())
    except Exception as e:
        return error(e)


# ── Self-Learning ────────────────────────────────────────────────────────────

@router.post("/self-learning/predictions")
async def self_learning_save(req: PredictionRequest):
    try:
        return wrap(await save_prediction(
            req.agent_type,
            req.event_trigger,
            req.asset,
            req.predicted_direction,
            req.predicted_magnitude,
            req.timeframe_days,
            req.metadata,
        ))
    except Exception as e:
        return error(e)


@router.get("/self-learning/performance")
async def self_learning_performance(agent_type: Optional[str] = None):
    try:
        return wrap(await get_agent_performance(agent_type))
    except Exception as e:
        return error(e)


@router.post("/self-learning/resolve")
async def self_learning_resolve():
    try:
        return wrap(await resolve_predictions())
    except Exception as e:
        return error(e)


# ── Geopolitical Risk ────────────────────────────────────────────────────────

@router.post("/geopolitics/score")
async def geopolitics_score(req: GeopoliticsScoreRequest):
    try:
        return wrap(await score_country_risk(req.country))
    except Exception as e:
        return error(e)


@router.get("/geopolitics/map")
async def geopolitics_map():
    try:
        return wrap(await get_global_risk_map())
    except Exception as e:
        return error(e)


@router.post("/geopolitics/compare")
async def geopolitics_compare(req: GeopoliticsCompareRequest):
    try:
        return wrap(await compare_country_pair(req.country1, req.country2))
    except Exception as e:
        return error(e)


# ── Climate-to-Market ────────────────────────────────────────────────────────

@router.post("/climate/analyze")
async def climate_analyze(req: ClimateEventRequest):
    try:
        return wrap(await analyze_climate_event(req.event, req.location, req.severity))
    except Exception as e:
        return error(e)


@router.get("/climate/watchlist")
async def climate_watchlist():
    try:
        return wrap(await get_climate_watchlist())
    except Exception as e:
        return error(e)


# ── Elections ────────────────────────────────────────────────────────────────

@router.post("/elections/simulate")
async def elections_simulate(req: ElectionSimRequest):
    try:
        return wrap(await simulate_election(req.country, req.candidates, req.election_date))
    except Exception as e:
        return error(e)


@router.get("/elections/upcoming")
async def elections_upcoming():
    try:
        return wrap(await get_upcoming_elections())
    except Exception as e:
        return error(e)


# ── Cultural Calendar ────────────────────────────────────────────────────────

@router.get("/culture/current")
async def culture_current():
    try:
        return wrap(await get_current_cultural_events())
    except Exception as e:
        return error(e)


@router.post("/culture/impact")
async def culture_impact(req: CulturalImpactRequest):
    try:
        return wrap(await analyze_cultural_impact(req.event, req.region))
    except Exception as e:
        return error(e)


# ── Unusual Activity ─────────────────────────────────────────────────────────

@router.post("/unusual/analyze")
async def unusual_analyze(req: UnusualActivityRequest):
    try:
        return wrap(await analyze_unusual_activity(req.asset, req.activity_description))
    except Exception as e:
        return error(e)


@router.post("/unusual/scan")
async def unusual_scan(req: UnusualScanRequest):
    try:
        return wrap(await scan_for_anomalies(req.assets))
    except Exception as e:
        return error(e)


# ── Additional endpoints (prompt 7) ──────────────────────────────────────────

@router.post("/law-analysis")
async def law_analysis(req: LawAnalysisRequest):
    try:
        return wrap(await analyze_law(req.law_text, req.title))
    except Exception as e:
        return error(e)


@router.get("/law-analysis/recent")
async def recent_laws_v2(country: str = "US"):
    try:
        return wrap(await fetch_and_analyze_recent_laws(country))
    except Exception as e:
        return error(e)


@router.post("/sentiment")
async def sentiment_analysis(req: SentimentRequest):
    try:
        return wrap(await analyze_sentiment(req.asset, req.news_headlines))
    except Exception as e:
        return error(e)


@router.get("/sentiment/market-emotions")
async def market_emotions_v2():
    try:
        return wrap(await get_market_emotions())
    except Exception as e:
        return error(e)


@router.get("/sentiment/fear-greed")
async def fear_greed_extended_v2():
    try:
        return wrap(await get_fear_greed_extended())
    except Exception as e:
        return error(e)


@router.post("/strategy")
async def build_strategy_v2(req: StrategyRequest):
    try:
        return wrap(await build_strategy(req.goal, req.risk_tolerance, req.time_horizon, req.capital, req.excluded_sectors))
    except Exception as e:
        return error(e)


@router.post("/central-bank")
async def central_bank_analysis(req: CentralBankRequest):
    try:
        return wrap(await analyze_statement(req.statement_text, req.bank))
    except Exception as e:
        return error(e)


@router.get("/central-bank/rate-outlook")
async def rate_outlook():
    try:
        return wrap(await get_rate_outlook())
    except Exception as e:
        return error(e)


@router.post("/predictions/save")
async def save_prediction_v2(req: PredictionRequest):
    try:
        return wrap(await save_prediction(req.agent_type, req.event_trigger, req.asset, req.predicted_direction, req.predicted_magnitude, req.timeframe_days, getattr(req, "metadata", {})))
    except Exception as e:
        return error(e)


@router.get("/predictions/performance")
async def prediction_performance(agent_type: Optional[str] = None):
    try:
        return wrap(await get_agent_performance(agent_type))
    except Exception as e:
        return error(e)


@router.get("/predictions/resolve")
async def resolve_predictions_v2():
    try:
        return wrap(await resolve_predictions())
    except Exception as e:
        return error(e)


@router.post("/geo-risk")
async def geo_risk(req: CountryRiskRequest):
    try:
        return wrap(await score_country_risk(req.country))
    except Exception as e:
        return error(e)


@router.get("/geo-risk/global-map")
async def global_risk_map():
    try:
        return wrap(await get_global_risk_map())
    except Exception as e:
        return error(e)


@router.post("/climate")
async def climate_analysis(req: ClimateRequest):
    try:
        return wrap(await analyze_climate_event(req.event, req.location, req.severity))
    except Exception as e:
        return error(e)


@router.get("/climate/watchlist")
async def climate_watchlist_v2():
    try:
        return wrap(await get_climate_watchlist())
    except Exception as e:
        return error(e)


@router.post("/election")
async def election_simulation(req: ElectionRequest):
    try:
        return wrap(await simulate_election(req.country, req.candidates, req.election_date))
    except Exception as e:
        return error(e)


@router.get("/election/upcoming")
async def upcoming_elections_v2():
    try:
        return wrap(await get_upcoming_elections())
    except Exception as e:
        return error(e)


@router.post("/cultural-calendar")
async def cultural_calendar_analysis(req: CulturalRequest):
    try:
        return wrap(await analyze_cultural_impact(req.event, req.region))
    except Exception as e:
        return error(e)


@router.get("/cultural-calendar/current")
async def current_cultural_events_v2():
    try:
        return wrap(await get_current_cultural_events())
    except Exception as e:
        return error(e)


@router.post("/anomalies")
async def detect_anomalies(req: AnomalyRequest):
    try:
        return wrap(await scan_for_anomalies(req.assets))
    except Exception as e:
        return error(e)


@router.post("/social-sentiment")
async def social_sentiment_analysis(req: SocialSentimentRequest):
    try:
        return wrap(await social_sentiment.get_multi_platform_sentiment(req.asset))
    except Exception as e:
        return error(e)


@router.get("/onchain/bitcoin")
async def bitcoin_onchain():
    try:
        return wrap(await on_chain.get_bitcoin_onchain())
    except Exception as e:
        return error(e)


@router.get("/onchain/defi")
async def defi_overview():
    try:
        return wrap(await on_chain.get_defi_overview())
    except Exception as e:
        return error(e)


# ── New request models ────────────────────────────────────────────────────────

class DeepfakeVerifyRequest(BaseModel):
    content: str
    source_url: str = ""
    media_type: str = "article"


class DeepfakeBatchRequest(BaseModel):
    articles: list


class BlackSwanRequest(BaseModel):
    market_context: str


class VolatilityRequest(BaseModel):
    asset: str
    context: str = ""


class CEOSpeechRequest(BaseModel):
    transcript: str
    company: str = ""
    speaker: str = "CEO"
    context: str = ""


class CEOCompareRequest(BaseModel):
    current_transcript: str
    previous_transcript: str
    company: str = ""


class PortfolioExposureRequest(BaseModel):
    positions: list
    total_capital: float = 100000


class PortfolioStressRequest(BaseModel):
    positions: list
    scenario: str


class EducationRequest(BaseModel):
    concept: str
    level: str = "intermediate"
    context: str = ""


class MarketEventEducationRequest(BaseModel):
    event: str
    level: str = "intermediate"


class LearningPathRequest(BaseModel):
    goal: str
    current_level: str = "beginner"


class FinancialQuestionRequest(BaseModel):
    question: str
    level: str = "intermediate"


class WealthFlowRequest(BaseModel):
    region: str = "Global"
    asset_class: str = "all"


class SovereignWealthRequest(BaseModel):
    country: str


class SmartMoneyRequest(BaseModel):
    asset: str


class BacktestRequest(BaseModel):
    strategy: str
    asset: str
    period: str = "10 years"
    initial_capital: float = 10000


class StrategyCompareRequest(BaseModel):
    strategies: list
    asset: str
    period: str = "10 years"


class EntryExitRequest(BaseModel):
    asset: str
    strategy_goal: str
    period: str = "5 years"


class LawIngestRequest(BaseModel):
    law_text: str
    title: str
    country: str = "US"


class LawSearchRequest(BaseModel):
    query: str
    n_results: int = 5


# ── Anti-Deepfake endpoints ───────────────────────────────────────────────────

@router.post("/deepfake/verify")
async def deepfake_verify(req: DeepfakeVerifyRequest):
    try:
        return wrap(await verify_content(req.content, req.source_url, req.media_type))
    except Exception as e:
        return error(e)


@router.post("/deepfake/batch")
async def deepfake_batch(req: DeepfakeBatchRequest):
    try:
        return wrap(await batch_verify(req.articles))
    except Exception as e:
        return error(e)


# ── Black Swan endpoints ──────────────────────────────────────────────────────

@router.post("/black-swan/scan")
async def black_swan_scan(req: BlackSwanRequest):
    try:
        return wrap(await scan_for_black_swan(req.market_context))
    except Exception as e:
        return error(e)


@router.post("/black-swan/volatility")
async def black_swan_volatility(req: VolatilityRequest):
    try:
        return wrap(await analyze_volatility_regime(req.asset, req.context))
    except Exception as e:
        return error(e)


@router.get("/black-swan/dashboard")
async def black_swan_dashboard():
    try:
        return wrap(await get_systemic_risk_dashboard())
    except Exception as e:
        return error(e)


# ── CEO Speech endpoints ──────────────────────────────────────────────────────

@router.post("/ceo-speech/analyze")
async def ceo_speech_analyze(req: CEOSpeechRequest):
    try:
        return wrap(await analyze_speech(req.transcript, req.company, req.speaker, req.context))
    except Exception as e:
        return error(e)


@router.post("/ceo-speech/compare")
async def ceo_speech_compare(req: CEOCompareRequest):
    try:
        return wrap(await compare_speech_baseline(req.current_transcript, req.previous_transcript, req.company))
    except Exception as e:
        return error(e)


# ── Portfolio Exposure endpoints ──────────────────────────────────────────────

@router.post("/portfolio/exposure")
async def portfolio_exposure(req: PortfolioExposureRequest):
    try:
        return wrap(await analyze_exposure(req.positions, req.total_capital))
    except Exception as e:
        return error(e)


@router.post("/portfolio/stress")
async def portfolio_stress(req: PortfolioStressRequest):
    try:
        return wrap(await stress_test_portfolio(req.positions, req.scenario))
    except Exception as e:
        return error(e)


@router.post("/portfolio/summary")
async def portfolio_summary(req: PortfolioExposureRequest):
    try:
        return wrap(await get_exposure_summary(req.positions, req.total_capital))
    except Exception as e:
        return error(e)


# ── Education endpoints ───────────────────────────────────────────────────────

@router.post("/education/explain")
async def education_explain(req: EducationRequest):
    try:
        return wrap(await explain_concept(req.concept, req.level, req.context))
    except Exception as e:
        return error(e)


@router.post("/education/event")
async def education_event(req: MarketEventEducationRequest):
    try:
        return wrap(await explain_market_event(req.event, req.level))
    except Exception as e:
        return error(e)


@router.post("/education/learning-path")
async def education_learning_path(req: LearningPathRequest):
    try:
        return wrap(await generate_learning_path(req.goal, req.current_level))
    except Exception as e:
        return error(e)


@router.post("/education/question")
async def education_question(req: FinancialQuestionRequest):
    try:
        return wrap(await answer_financial_question(req.question, req.level))
    except Exception as e:
        return error(e)


# ── Wealth Migration endpoints ────────────────────────────────────────────────

@router.post("/wealth/flows")
async def wealth_flows(req: WealthFlowRequest):
    try:
        return wrap(await track_wealth_flows(req.region, req.asset_class))
    except Exception as e:
        return error(e)


@router.post("/wealth/sovereign")
async def wealth_sovereign(req: SovereignWealthRequest):
    try:
        return wrap(await analyze_sovereign_wealth(req.country))
    except Exception as e:
        return error(e)


@router.post("/wealth/smart-money")
async def wealth_smart_money(req: SmartMoneyRequest):
    try:
        return wrap(await get_smart_money_divergence(req.asset))
    except Exception as e:
        return error(e)


# ── Backtesting endpoints ─────────────────────────────────────────────────────

@router.post("/backtest/run")
async def backtest_run(req: BacktestRequest):
    try:
        return wrap(await backtest_strategy(req.strategy, req.asset, req.period, req.initial_capital))
    except Exception as e:
        return error(e)


@router.post("/backtest/compare")
async def backtest_compare(req: StrategyCompareRequest):
    try:
        return wrap(await compare_strategies(req.strategies, req.asset, req.period))
    except Exception as e:
        return error(e)


@router.post("/backtest/optimize")
async def backtest_optimize(req: EntryExitRequest):
    try:
        return wrap(await optimize_entry_exit(req.asset, req.strategy_goal, req.period))
    except Exception as e:
        return error(e)


# ── Satellite / Alternative Data endpoints ────────────────────────────────────

@router.get("/satellite/weather")
async def satellite_weather(region: str = "Global"):
    try:
        return wrap(await get_weather_market_signals(region))
    except Exception as e:
        return error(e)


@router.get("/satellite/crops")
async def satellite_crops():
    try:
        return wrap(await get_crop_stress_signals())
    except Exception as e:
        return error(e)


@router.get("/satellite/signals")
async def satellite_signals():
    try:
        return wrap(await get_alternative_signals())
    except Exception as e:
        return error(e)


# ── Law RAG endpoints ─────────────────────────────────────────────────────────

@router.post("/law-to-ledger/ingest")
async def law_ingest(req: LawIngestRequest):
    try:
        return wrap(await ingest_law_to_vectorstore(req.law_text, req.title, req.country))
    except Exception as e:
        return error(e)


@router.post("/law-to-ledger/search")
async def law_search(req: LawSearchRequest):
    try:
        return wrap(await search_laws(req.query, req.n_results))
    except Exception as e:
        return error(e)


# ── Historical Mirror endpoints ───────────────────────────────────────────────

class HistoricalAnalogRequest(BaseModel):
    current_conditions: str
    top_n: int = 3

class EventDeepDiveRequest(BaseModel):
    event_id: str

class Predict30DRequest(BaseModel):
    asset: str
    current_context: str

@router.post("/historical-mirror/analogs")
async def historical_analogs(req: HistoricalAnalogRequest):
    try:
        return wrap(await find_historical_analogs(req.current_conditions, req.top_n))
    except Exception as e:
        return error(e)

@router.post("/historical-mirror/deep-dive")
async def historical_deep_dive(req: EventDeepDiveRequest):
    try:
        return wrap(await get_event_deep_dive(req.event_id))
    except Exception as e:
        return error(e)

@router.post("/historical-mirror/predict-30d")
async def predict_30d(req: Predict30DRequest):
    try:
        return wrap(await predict_next_30_days(req.asset, req.current_context))
    except Exception as e:
        return error(e)

@router.get("/historical-mirror/knowledge-graph")
async def knowledge_graph():
    try:
        return wrap(await get_knowledge_graph_summary())
    except Exception as e:
        return error(e)


# ── Regulatory Time Machine endpoints ────────────────────────────────────────

class RegSimRequest(BaseModel):
    company: str
    regulation: str
    apply_from_year: int
    current_year: int = 2025

class RegCompareRequest(BaseModel):
    companies: list
    regulation: str
    apply_from_year: int

class RegPredictRequest(BaseModel):
    company: str
    upcoming_regulation: str
    implementation_year: int

@router.post("/regulatory-time-machine/simulate")
async def reg_simulate(req: RegSimRequest):
    try:
        return wrap(await simulate_regulation(req.company, req.regulation, req.apply_from_year, req.current_year))
    except Exception as e:
        return error(e)

@router.post("/regulatory-time-machine/compare")
async def reg_compare(req: RegCompareRequest):
    try:
        return wrap(await compare_companies(req.companies, req.regulation, req.apply_from_year))
    except Exception as e:
        return error(e)

@router.post("/regulatory-time-machine/predict")
async def reg_predict(req: RegPredictRequest):
    try:
        return wrap(await predict_regulation_impact(req.company, req.upcoming_regulation, req.implementation_year))
    except Exception as e:
        return error(e)

@router.get("/regulatory-time-machine/presets")
async def reg_presets():
    try:
        return wrap(await get_regulation_presets())
    except Exception as e:
        return error(e)
