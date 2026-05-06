"""
Chart Analysis Service — AI-powered candlestick analysis
Click one or two candles → Claude identifies pattern, finds historical matches,
predicts next moves, compares with past history.

v2: Adds RSI, MACD, Bollinger Bands, ATR, Volume + live news context to Claude.
"""
import asyncio
import datetime as _datetime

from core.gemini import ask_json
from services.historical_patterns import find_similar_candles, find_similar_moves
from services.india_market import get_india_market_context


# ── Technical Indicators (calculated in Python, not by AI) ────────────────────

def _ema(data: list, n: int) -> float:
    if not data:
        return 0.0
    k = 2 / (n + 1)
    e = data[0]
    for v in data[1:]:
        e = v * k + e * (1 - k)
    return round(e, 4)


def _ema_series(data: list, n: int) -> list:
    if len(data) < n:
        return data[:]
    k = 2 / (n + 1)
    result = [sum(data[:n]) / n]
    for v in data[n:]:
        result.append(v * k + result[-1] * (1 - k))
    # Pad front with None so indices align with original data
    return [None] * (n - 1) + result


def _calc_rsi(closes: list, period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [d if d > 0 else 0 for d in deltas[-period:]]
    losses = [-d if d < 0 else 0 for d in deltas[-period:]]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def _calc_macd(closes: list) -> dict:
    if len(closes) < 26:
        return {"macd": 0, "signal": 0, "histogram": 0, "trend": "neutral"}
    ema12 = _ema_series(closes, 12)
    ema26 = _ema_series(closes, 26)
    macd_line = []
    for i in range(len(closes)):
        e12 = ema12[i]
        e26 = ema26[i]
        if e12 is not None and e26 is not None:
            macd_line.append(e12 - e26)
    if len(macd_line) < 9:
        return {"macd": 0, "signal": 0, "histogram": 0, "trend": "neutral"}
    signal = _ema(macd_line, 9)
    macd_val = macd_line[-1]
    hist = macd_val - signal
    trend = "bullish" if macd_val > signal else "bearish"
    return {
        "macd": round(macd_val, 4),
        "signal": round(signal, 4),
        "histogram": round(hist, 4),
        "trend": trend,
        "crossover": "golden_cross" if hist > 0 and macd_line[-2] - _ema(macd_line[:-1], 9) < 0 else
                     "death_cross" if hist < 0 and macd_line[-2] - _ema(macd_line[:-1], 9) > 0 else "none",
    }


def _calc_bollinger(closes: list, period: int = 20, std_dev: float = 2.0) -> dict:
    if len(closes) < period:
        c = closes[-1] if closes else 0
        return {"upper": c, "middle": c, "lower": c, "pct_b": 50.0, "squeeze": False}
    recent = closes[-period:]
    middle = sum(recent) / period
    variance = sum((x - middle) ** 2 for x in recent) / period
    std = variance ** 0.5
    upper = middle + std_dev * std
    lower = middle - std_dev * std
    current = closes[-1]
    band_width = upper - lower
    pct_b = ((current - lower) / band_width * 100) if band_width else 50.0
    squeeze = band_width / middle < 0.02  # Band width < 2% of price = squeeze
    return {
        "upper": round(upper, 2),
        "middle": round(middle, 2),
        "lower": round(lower, 2),
        "pct_b": round(pct_b, 1),
        "squeeze": squeeze,
        "position": "above_upper" if current > upper else "below_lower" if current < lower else "inside",
    }


def _calc_atr(bars: list, period: int = 14) -> float:
    if len(bars) < 2:
        return 0.0
    trs = []
    for i in range(1, len(bars)):
        high = bars[i]["high"]
        low = bars[i]["low"]
        prev_close = bars[i - 1]["close"]
        tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
        trs.append(tr)
    recent_trs = trs[-period:]
    return round(sum(recent_trs) / len(recent_trs), 2)


def _calc_support_resistance(bars: list, lookback: int = 20) -> dict:
    if len(bars) < lookback:
        lookback = len(bars)
    recent = bars[-lookback:]
    highs = [b["high"] for b in recent]
    lows = [b["low"] for b in recent]
    # Swing highs: higher than 2 bars each side
    swing_highs = []
    swing_lows = []
    for i in range(2, len(recent) - 2):
        if recent[i]["high"] >= max(recent[i-2]["high"], recent[i-1]["high"],
                                     recent[i+1]["high"], recent[i+2]["high"]):
            swing_highs.append(recent[i]["high"])
        if recent[i]["low"] <= min(recent[i-2]["low"], recent[i-1]["low"],
                                    recent[i+1]["low"], recent[i+2]["low"]):
            swing_lows.append(recent[i]["low"])
    current = bars[-1]["close"]
    resistance = min((h for h in swing_highs if h > current), default=max(highs))
    support = max((l for l in swing_lows if l < current), default=min(lows))
    return {"support": round(support, 2), "resistance": round(resistance, 2)}


def _calc_all_indicators(bars: list) -> dict:
    if not bars:
        return {}
    closes = [b["close"] for b in bars]
    volumes = [b.get("volume", 0) for b in bars]
    avg_vol_20 = sum(volumes[-20:]) / min(20, len(volumes)) if volumes else 1
    last_vol = volumes[-1] if volumes else 0
    vol_ratio = round(last_vol / avg_vol_20, 2) if avg_vol_20 else 0

    rsi = _calc_rsi(closes)
    macd = _calc_macd(closes)
    bb = _calc_bollinger(closes)
    atr = _calc_atr(bars)
    sr = _calc_support_resistance(bars)

    # Trend via EMAs
    ema20 = _ema(closes, min(20, len(closes)))
    ema50 = _ema(closes, min(50, len(closes)))
    ema200 = _ema(closes, min(200, len(closes)))
    current = closes[-1]

    # RSI interpretation
    rsi_signal = "overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral"

    return {
        "rsi": rsi,
        "rsi_signal": rsi_signal,
        "macd": macd,
        "bollinger": bb,
        "atr": atr,
        "ema20": round(ema20, 2),
        "ema50": round(ema50, 2),
        "ema200": round(ema200, 2),
        "price_vs_ema20": "above" if current > ema20 else "below",
        "price_vs_ema50": "above" if current > ema50 else "below",
        "price_vs_ema200": "above" if current > ema200 else "below",
        "support": sr["support"],
        "resistance": sr["resistance"],
        "volume_ratio": vol_ratio,
        "volume_signal": "high_volume" if vol_ratio > 1.5 else "low_volume" if vol_ratio < 0.5 else "normal_volume",
    }


def _format_indicators(ind: dict) -> str:
    if not ind:
        return ""
    macd = ind.get("macd", {})
    bb = ind.get("bollinger", {})
    return f"""
Technical Indicators (calculated from real bar data):
  RSI(14):          {ind.get('rsi')} — {ind.get('rsi_signal', '').upper()}
  MACD:             {macd.get('macd')} | Signal: {macd.get('signal')} | Hist: {macd.get('histogram')} — {macd.get('trend', '').upper()} {('(' + macd.get('crossover', '') + ')') if macd.get('crossover') != 'none' else ''}
  Bollinger Bands:  Upper:{bb.get('upper')} Mid:{bb.get('middle')} Lower:{bb.get('lower')} | %B:{bb.get('pct_b')} | {'SQUEEZE' if bb.get('squeeze') else 'Normal'} | Price is {bb.get('position')}
  EMA20:            {ind.get('ema20')} (price {ind.get('price_vs_ema20')})
  EMA50:            {ind.get('ema50')} (price {ind.get('price_vs_ema50')})
  EMA200:           {ind.get('ema200')} (price {ind.get('price_vs_ema200')})
  ATR(14):          {ind.get('atr')} pts (daily volatility range)
  Support:          {ind.get('support')}
  Resistance:       {ind.get('resistance')}
  Volume:           {ind.get('volume_ratio')}x avg — {ind.get('volume_signal', '').replace('_', ' ').upper()}"""


# ── News context ───────────────────────────────────────────────────────────────

SYMBOL_NEWS_KEYWORDS = {
    "^NSEI":      "NIFTY India stock market NSE",
    "^NSEBANK":   "Bank Nifty Indian banking RBI",
    "^BSESN":     "SENSEX BSE India market",
    "^GSPC":      "S&P 500 US stock market",
    "^IXIC":      "NASDAQ US tech stocks",
    "BTC-USD":    "Bitcoin crypto market",
    "ETH-USD":    "Ethereum crypto",
    "GC=F":       "Gold price market",
    "CL=F":       "Crude oil price market",
}

_news_cache: dict = {}


async def _ensure_enough_bars(symbol: str, bars: list, interval: str = "5m", min_bars: int = 60) -> list:
    """
    If bars < min_bars (early morning / short session), auto-fetch previous
    days' bars so RSI/MACD/BB have enough data to calculate properly.
    """
    if len(bars) >= min_bars:
        return bars
    try:
        from services.chart_data import _fetch_bars_sync
        loop = asyncio.get_event_loop()
        from concurrent.futures import ThreadPoolExecutor
        executor = ThreadPoolExecutor(max_workers=1)
        hist = await loop.run_in_executor(executor, _fetch_bars_sync, symbol, "5d", interval)
        hist_bars = hist.get("bars", [])
        if not hist_bars:
            return bars
        if bars:
            earliest = bars[0]["time"]
            hist_bars = [b for b in hist_bars if b["time"] < earliest]
        combined = hist_bars + bars
        return combined[-max(min_bars, len(bars)):]
    except Exception:
        return bars


async def _get_symbol_news(symbol: str, limit: int = 5) -> str:
    import time
    cache_key = symbol
    cached = _news_cache.get(cache_key)
    if cached and time.time() - cached[1] < 600:  # 10 min cache
        return cached[0]

    keyword = SYMBOL_NEWS_KEYWORDS.get(symbol, symbol.replace("^", "").replace("-USD", "").replace(".NS", " India"))
    try:
        from services.news import search_news
        articles = await search_news(keyword, limit=limit)
        if not articles:
            return ""
        lines = [f"  - {a['title']} ({a.get('source', '')})" for a in articles if a.get("title")]
        result = "\nRecent News Headlines (last 24h):\n" + "\n".join(lines[:limit])
        _news_cache[cache_key] = (result, time.time())
        return result
    except Exception:
        return ""


# ── Candle click analysis ──────────────────────────────────────────────────────

async def analyze_candle_click(
    symbol: str,
    clicked_candle: dict,
    context_bars: list,
    all_bars: list,
) -> dict:
    bar = clicked_candle
    body = abs(bar["close"] - bar["open"])
    wick_up = bar["high"] - max(bar["open"], bar["close"])
    wick_down = min(bar["open"], bar["close"]) - bar["low"]
    is_bullish = bar["close"] >= bar["open"]

    recent_closes = [b["close"] for b in context_bars[-10:]] if context_bars else [bar["close"]]
    trend = "uptrend" if recent_closes[-1] > recent_closes[0] else "downtrend"

    # Early morning fix: ensure enough bars for meaningful indicators
    all_bars = await _ensure_enough_bars(symbol, all_bars, interval="5m")

    hist_summary = [{"o": b["open"], "h": b["high"], "l": b["low"], "c": b["close"]} for b in all_bars[-50:]]

    # Calculate indicators from all available bars up to clicked candle
    indicators = _calc_all_indicators(all_bars)
    ind_text = _format_indicators(indicators)

    # Fetch live news + India market context in parallel
    news_text, india_ctx = await asyncio.gather(
        _get_symbol_news(symbol),
        get_india_market_context(symbol),
    )

    # Real historical pattern search
    real_matches = []
    try:
        real_matches = await find_similar_candles(symbol, bar, top_n=5)
    except Exception:
        pass

    real_matches_ctx = ""
    if real_matches:
        real_matches_ctx = "\n\nREAL HISTORICAL MATCHES (actual database search — use these exact values):\n"
        for i, m in enumerate(real_matches, 1):
            real_matches_ctx += (
                f"  {i}. {m['date']} @ {m['approximate_price_level']} "
                f"(similarity {int(m['similarity_score']*100)}%) -> "
                f"1d: {m['next_1d_change_pct']:+.2f}%, 5d: {m['next_5d_change_pct']:+.2f}%, "
                f"10d: {m['next_10d_change_pct']:+.2f}% — {m['outcome'].upper()}\n"
            )
        real_matches_ctx += "Use these real dates and outcomes in similar_past_occurrences.\n"

    result = await ask_json(f"""You are an expert technical analyst and price action trader.
The user clicked this candle. Predict the EXACT PRICE PATH forward using ALL signals below — not just candle shape.

Symbol: {symbol}{india_ctx}
Clicked Candle:
  Open: {bar['open']}  High: {bar['high']}  Low: {bar['low']}  Close: {bar['close']}
  Volume: {bar.get('volume', 0)}
  Body: {round(body, 4)}  Upper wick: {round(wick_up, 4)}  Lower wick: {round(wick_down, 4)}
  Direction: {'Bullish (Green)' if is_bullish else 'Bearish (Red)'}
  Recent trend: {trend}
  Recent 10 closes: {recent_closes}
{ind_text}{news_text}{real_matches_ctx}

IMPORTANT RULES:
- RSI > 70 = overbought (lean bearish even on bullish candles)
- RSI < 30 = oversold (lean bullish even on bearish candles)
- Price below EMA20 + EMA50 = structural downtrend — bearish bias
- MACD histogram negative = bearish momentum
- Bollinger %B > 100 = price extended, likely to revert
- Volume > 1.5x average on bearish candle = strong selling — high conviction down
- News sentiment must override technical pattern if strongly negative/positive
- Give EXACT price levels for every target.

Return JSON:
{{
  "symbol": "{symbol}",
  "pattern_name": str,
  "pattern_type": "bullish_reversal/bearish_reversal/continuation/indecision/strong_momentum",
  "pattern_reliability": "high/medium/low",
  "what_it_means": str,
  "indicator_summary": str (2-3 lines summarizing what RSI+MACD+BB+news say together),
  "news_impact": "bullish/bearish/neutral/unknown",
  "price_path": {{
    "direction": "up/down/sideways",
    "from_price": float,
    "description": str,
    "waypoints": [
      {{"label": "Entry / Current", "price": float, "candles_from_now": 0}},
      {{"label": "First target", "price": float, "candles_from_now": int}},
      {{"label": "Second target", "price": float, "candles_from_now": int}},
      {{"label": "Final target", "price": float, "candles_from_now": int}}
    ],
    "stop_loss": float,
    "invalidation": str
  }},
  "prediction": {{
    "next_1_candle": str,
    "next_3_candles": str,
    "next_5_candles": str,
    "expected_direction": "up/down/sideways",
    "confidence": int,
    "target_price": float,
    "stop_loss": float,
    "invalidation_level": float
  }},
  "key_levels": {{
    "immediate_support": float,
    "immediate_resistance": float
  }},
  "similar_past_occurrences": [
    {{
      "date": str,
      "approximate_price_level": float,
      "what_happened_next": str,
      "outcome": "bullish/bearish/neutral",
      "magnitude_pct": float,
      "similarity_score": float
    }}
  ],
  "volume_analysis": str,
  "key_insight": str
}}""")

    if isinstance(result, dict):
        result["indicators"] = indicators
        if real_matches:
            result["real_historical_matches"] = real_matches
        return result
    return {"error": "Analysis failed"}


# ── Range analysis ─────────────────────────────────────────────────────────────

async def analyze_candle_range(
    symbol: str,
    candle_a: dict,
    candle_b: dict,
    bars_between: list,
    context_bars: list,
    all_bars: list,
) -> dict:
    price_start = candle_a["close"]
    price_end = candle_b["close"]
    move_pct = ((price_end - price_start) / price_start * 100) if price_start else 0
    move_direction = "up" if price_end > price_start else "down"
    high_in_range = max(b["high"] for b in [candle_a] + bars_between + [candle_b])
    low_in_range = min(b["low"] for b in [candle_a] + bars_between + [candle_b])
    n_candles = len(bars_between) + 2
    volumes = [b.get("volume", 0) for b in [candle_a] + bars_between + [candle_b]]
    avg_vol = sum(volumes) / len(volumes) if volumes else 0

    recent_closes = [b["close"] for b in context_bars[-10:]] if context_bars else []
    hist_summary = [{"o": b["open"], "h": b["high"], "l": b["low"], "c": b["close"]} for b in all_bars[-60:]]

    indicators = _calc_all_indicators(all_bars)
    ind_text = _format_indicators(indicators)
    news_text = await _get_symbol_news(symbol)

    real_moves = []
    try:
        real_moves = await find_similar_moves(symbol, abs(move_pct), move_direction, n_candles, top_n=5)
    except Exception:
        pass

    real_moves_ctx = ""
    if real_moves:
        real_moves_ctx = "\n\nREAL HISTORICAL SIMILAR MOVES:\n"
        for i, m in enumerate(real_moves, 1):
            real_moves_ctx += (
                f"  {i}. {m['date_range']} — {m['magnitude_pct']:.1f}% {move_direction} over {m['duration_candles']} bars "
                f"-> 5d after: {m['next_5d_change_pct']:+.2f}%, 15d after: {m['next_15d_change_pct']:+.2f}% "
                f"— {m['outcome'].upper()}\n"
            )

    result = await ask_json(f"""You are an expert technical analyst. A user selected a range of {n_candles} candles on {symbol}.

Range Analysis:
  Start close: {price_start}  End close: {price_end}
  Move: {move_direction.upper()} {round(abs(move_pct), 2)}%
  Range High: {round(high_in_range, 4)}  Range Low: {round(low_in_range, 4)}
  Candles: {n_candles}  Avg Volume: {round(avg_vol, 0)}
  Context (last 10 closes before range): {recent_closes}
{ind_text}{news_text}{real_moves_ctx}

Return JSON:
{{
  "symbol": "{symbol}",
  "move_summary": {{
    "direction": "{move_direction}",
    "magnitude_pct": {round(abs(move_pct), 2)},
    "candles": {n_candles},
    "from_price": {price_start},
    "to_price": {price_end},
    "range_high": {round(high_in_range, 4)},
    "range_low": {round(low_in_range, 4)}
  }},
  "pattern_identified": str,
  "pattern_type": "impulse/correction/consolidation/reversal/breakout/breakdown",
  "phase": "accumulation/markup/distribution/markdown",
  "indicator_summary": str,
  "news_impact": "bullish/bearish/neutral/unknown",
  "has_this_happened_before": str,
  "similar_historical_moves": [
    {{
      "description": str,
      "year": str,
      "magnitude_pct": float,
      "what_happened_next": str,
      "duration_candles": int,
      "outcome": "continued/reversed/consolidated"
    }}
  ],
  "what_caused_this_move": str,
  "current_position": str,
  "prediction_after_range": {{
    "most_likely": str,
    "probability_continue": int,
    "probability_reverse": int,
    "probability_consolidate": int,
    "next_target_up": float,
    "next_target_down": float,
    "key_level_to_watch": float,
    "timeframe_estimate": str
  }},
  "entry_strategy": str,
  "stop_loss": float,
  "risk_reward": float,
  "confidence": int,
  "key_insight": str
}}""")

    if isinstance(result, dict):
        result["indicators"] = indicators
        if real_moves:
            result["real_historical_moves"] = real_moves
        return result
    return {"error": "Analysis failed"}


# ── Live bar analysis ──────────────────────────────────────────────────────────

async def analyze_live_bar(
    symbol: str,
    last_bar: dict,
    all_bars: list,
) -> dict:
    if not all_bars or len(all_bars) < 5:
        return {"error": "Insufficient data"}

    closes  = [b["close"] for b in all_bars]
    highs   = [b["high"]  for b in all_bars]
    lows    = [b["low"]   for b in all_bars]

    period_high = max(highs)
    period_low  = min(lows)
    current     = last_bar["close"]
    pct_from_high = round((current - period_high) / period_high * 100, 2)
    pct_from_low  = round((current - period_low)  / period_low  * 100, 2)

    recent5 = closes[-5:]
    momentum_5 = round((recent5[-1] - recent5[0]) / recent5[0] * 100, 2) if recent5[0] else 0

    compact = [{"o": b["open"], "h": b["high"], "l": b["low"], "c": b["close"], "v": b.get("volume", 0)}
               for b in all_bars[-60:]]

    # Early morning fix
    all_bars = await _ensure_enough_bars(symbol, all_bars, interval="5m")

    # Recalculate after potential bar augmentation
    closes  = [b["close"] for b in all_bars]
    highs   = [b["high"]  for b in all_bars]
    lows    = [b["low"]   for b in all_bars]
    period_high = max(highs)
    period_low  = min(lows)
    current     = last_bar["close"]
    pct_from_high = round((current - period_high) / period_high * 100, 2)
    pct_from_low  = round((current - period_low)  / period_low  * 100, 2)
    recent5 = closes[-5:]
    momentum_5 = round((recent5[-1] - recent5[0]) / recent5[0] * 100, 2) if recent5[0] else 0
    compact = [{"o": b["open"], "h": b["high"], "l": b["low"], "c": b["close"], "v": b.get("volume", 0)}
               for b in all_bars[-60:]]

    indicators = _calc_all_indicators(all_bars)
    ind_text = _format_indicators(indicators)
    news_text, india_ctx = await asyncio.gather(
        _get_symbol_news(symbol),
        get_india_market_context(symbol),
    )

    result = await ask_json(f"""You are a senior market analyst with real-time access to this chart.
The user clicked the MOST RECENT (live) bar. Give a comprehensive live market analysis and actionable prediction.
Use ALL signals — indicators + news — not just candle shape.

Symbol: {symbol}{india_ctx}
Current Bar (LIVE):
  Open: {last_bar['open']}  High: {last_bar['high']}  Low: {last_bar['low']}  Close: {last_bar['close']}
  Volume: {last_bar.get('volume', 0)}

Market Structure:
  Period High: {period_high}  ({pct_from_high}% from high)
  Period Low:  {period_low}   (+{pct_from_low}% from low)
  5-bar momentum: {momentum_5}%
{ind_text}{news_text}

Last 60 bars OHLCV: {compact}

RULES:
- If RSI > 70 AND price at resistance AND news negative -> strongly bearish
- If RSI < 30 AND price at support AND news positive -> strongly bullish
- If MACD histogram turning from negative to positive -> momentum shift bullish
- If volume > 2x average on a move -> high conviction, trend likely continues
- EMA alignment (price > EMA20 > EMA50 > EMA200) = strong uptrend
- Always give specific price targets and stop loss levels.

Return JSON:
{{
  "symbol": "{symbol}",
  "current_price": {current},
  "market_phase": "accumulation/markup/distribution/markdown/consolidation",
  "overall_trend": "strong_uptrend/uptrend/sideways/downtrend/strong_downtrend",
  "trend_strength": "strong/moderate/weak",
  "indicator_summary": str (summarize RSI+MACD+BB+EMA+volume+news in 2-3 lines),
  "news_impact": "bullish/bearish/neutral/unknown",
  "current_candle_type": str,
  "volume_signal": "high_buying/low_selling/climax/drying_up/normal",
  "key_levels": {{
    "immediate_support": float,
    "immediate_resistance": float,
    "strong_support": float,
    "strong_resistance": float
  }},
  "live_market_assessment": str,
  "what_is_happening_now": str,
  "next_candle_prediction": {{
    "direction": "up/down/sideways",
    "expected_range_high": float,
    "expected_range_low": float,
    "probability": int,
    "reasoning": str
  }},
  "short_term_prediction": {{
    "timeframe": "next 3-5 candles",
    "direction": "up/down/sideways",
    "target": float,
    "stop_loss": float,
    "confidence": int,
    "scenario": str
  }},
  "medium_term_prediction": {{
    "timeframe": "next 10-15 candles",
    "direction": "up/down/sideways",
    "target": float,
    "key_risk": str,
    "confidence": int
  }},
  "entry_now": {{
    "action": "buy/sell/wait",
    "entry_price": float,
    "stop_loss": float,
    "target_1": float,
    "target_2": float,
    "risk_reward": float,
    "reasoning": str
  }},
  "bears_case": str,
  "bulls_case": str,
  "key_insight": str,
  "warning": str
}}""")

    if isinstance(result, dict):
        result["indicators"] = indicators
        return result
    return {"error": "Analysis failed"}


# ── Market summary ─────────────────────────────────────────────────────────────

async def get_market_summary(symbol: str, bars: list) -> dict:
    if not bars or len(bars) < 5:
        return {"error": "Insufficient data"}

    last = bars[-1]
    prev = bars[-2]
    week_bars = bars[-5:]
    month_bars = bars[-20:] if len(bars) >= 20 else bars

    change = last["close"] - prev["close"]
    change_pct = (change / prev["close"] * 100) if prev["close"] else 0
    week_change_pct = ((last["close"] - week_bars[0]["close"]) / week_bars[0]["close"] * 100) if week_bars else 0
    month_change_pct = ((last["close"] - month_bars[0]["close"]) / month_bars[0]["close"] * 100) if month_bars else 0

    indicators = _calc_all_indicators(bars)
    ind_text = _format_indicators(indicators)
    news_text = await _get_symbol_news(symbol)

    result = await ask_json(f"""You are a financial market analyst. Give a quick summary for {symbol}.

Current data:
  Yesterday Close: {prev['close']}
  Today Open: {last['open']}  High: {last['high']}  Low: {last['low']}  Close: {last['close']}
  Today Change: {round(change, 4)} ({round(change_pct, 2)}%)
  Week Change: {round(week_change_pct, 2)}%
  Month Change: {round(month_change_pct, 2)}%
{ind_text}{news_text}

Return JSON:
{{
  "yesterday_close": {prev['close']},
  "today_open": {last['open']},
  "today_change_pct": {round(change_pct, 2)},
  "week_change_pct": {round(week_change_pct, 2)},
  "month_change_pct": {round(month_change_pct, 2)},
  "market_mood": "bullish/bearish/neutral/volatile",
  "indicator_summary": str,
  "key_levels": {{"support": float, "resistance": float}},
  "yesterday_recap": str,
  "today_analysis": str,
  "tomorrow_outlook": str,
  "week_outlook": str,
  "key_risk": str
}}""")

    return result if isinstance(result, dict) else {
        "yesterday_close": prev["close"],
        "today_open": last["open"],
        "today_change_pct": round(change_pct, 2),
    }


# ── Automated Backtest ─────────────────────────────────────────────────────────



async def run_chart_backtest(symbol: str, interval: str = "1d", candles: int = 50) -> dict:
    """
    Automated backtest: for each of the last N candles, predict the next candle
    using the preceding bars, then compare prediction vs actual outcome.
    Logs results to Supabase backtest_results table.
    Returns accuracy summary.
    """
    from services.chart_data import get_chart_data
    from core.db import get_db

    # Fetch enough bars to backtest N candles (need N + 60 context bars)
    # Use yfinance directly for historical depth — Angel One only returns today's bars
    period_map = {"1d": "2y", "1wk": "5y", "1mo": "10y", "5m": "60d", "15m": "60d", "1h": "2y"}
    fetch_period = period_map.get(interval, "2y")

    try:
        import yfinance as yf
        yf_sym = symbol
        ticker = yf.Ticker(yf_sym)
        hist = ticker.history(period=fetch_period, interval=interval)
        if hist.empty:
            raise ValueError("yfinance returned empty")
        all_bars = [
            {
                "time": str(ts),
                "open":   float(row["Open"]),
                "high":   float(row["High"]),
                "low":    float(row["Low"]),
                "close":  float(row["Close"]),
                "volume": float(row.get("Volume", 0)),
            }
            for ts, row in hist.iterrows()
        ]
    except Exception as e:
        return {"error": f"Failed to fetch data: {e}"}

    if not all_bars or len(all_bars) < candles + 30:
        return {"error": f"Insufficient data: got {len(all_bars) if all_bars else 0} bars, need {candles + 30}"}

    # ── Helper: detect market regime ─────────────────────────────────────────
    def _detect_regime(bars: list) -> str:
        """trending_up / trending_down / ranging"""
        if len(bars) < 20:
            return "ranging"
        closes = [b["close"] for b in bars[-30:]]
        ema_f = _ema(closes, 10)
        ema_s = _ema(closes, 20)
        atr_v = _calc_atr(bars[-20:])
        price_range = max(closes) - min(closes)
        # Trending if EMA separation > 0.3x ATR and price range > 2x ATR
        if ema_f > ema_s * 1.001 and price_range > atr_v * 2:
            return "trending_up"
        if ema_f < ema_s * 0.999 and price_range > atr_v * 2:
            return "trending_down"
        return "ranging"

    # ── Helper: time-of-day filter ────────────────────────────────────────────
    def _good_trading_hour(bar: dict) -> bool:
        """Returns False for 11:00–13:00 IST choppy window."""
        ts = str(bar.get("time", ""))
        try:
            # timestamps are UTC from yfinance; IST = UTC+5:30
            import re
            hour_match = re.search(r'T(\d{2}):', ts) or re.search(r' (\d{2}):', ts)
            if hour_match:
                utc_hour = int(hour_match.group(1))
                ist_hour = (utc_hour + 5) % 24
                ist_min  = 30
                # Skip 11:00–13:00 IST = 05:30–07:30 UTC
                if 5 <= utc_hour < 8:
                    return False
        except Exception:
            pass
        return True

    results = []
    correct_direction = 0
    skipped_time = 0
    total_price_error = 0.0
    tested = 0

    # Test on the last `candles` bars (skip the very last — no actual outcome yet)
    test_indices = range(len(all_bars) - candles - 1, len(all_bars) - 1)

    for i in test_indices:
        context = all_bars[:i + 1]
        actual_next = all_bars[i + 1]

        if len(context) < 30:
            continue

        # ── Improvement 2: Time filter ────────────────────────────────────────
        if not _good_trading_hour(context[-1]):
            skipped_time += 1
            continue

        indicators = _calc_all_indicators(context)
        closes  = [b["close"] for b in context]
        volumes = [b.get("volume", 0) for b in context]
        last_close = closes[-1]

        rsi       = indicators.get("rsi", 50)
        macd      = indicators.get("macd", {})
        macd_hist = macd.get("histogram", 0)
        macd_trend= macd.get("trend", "neutral")
        macd_cross= macd.get("crossover", "none")
        ema20     = indicators.get("ema20", last_close)
        ema50     = indicators.get("ema50", last_close)
        ema200    = indicators.get("ema200", last_close)
        bb        = indicators.get("bollinger", {})
        pct_b     = bb.get("pct_b", 0.5)
        atr       = indicators.get("atr", last_close * 0.01)
        vol_ratio = indicators.get("volume_ratio", 1.0)

        # ── Improvement 3: Market regime ──────────────────────────────────────
        regime = _detect_regime(context)

        # ── Improved scoring ──────────────────────────────────────────────────
        score = 0

        # RSI — weighted by extreme levels
        if rsi < 30:
            score += 2      # oversold — strong bounce signal
        elif rsi < 45:
            score += 1
        elif rsi > 70:
            score -= 2      # overbought — strong reversal signal
        elif rsi > 55:
            score -= 1

        # MACD — crossover is more reliable than just histogram
        if macd_cross == "bullish_cross":
            score += 2
        elif macd_hist > 0 and macd_trend == "bullish":
            score += 1
        if macd_cross == "bearish_cross":
            score -= 2
        elif macd_hist < 0 and macd_trend == "bearish":
            score -= 1

        # EMA alignment — full stack is strongest signal
        if last_close > ema20 > ema50 > ema200:
            score += 2      # full bull stack
        elif last_close > ema20 > ema50:
            score += 1
        elif last_close < ema20 < ema50 < ema200:
            score -= 2      # full bear stack
        elif last_close < ema20 < ema50:
            score -= 1

        # Bollinger Bands
        if pct_b < 0.1:
            score += 2      # extreme oversold, strong mean reversion
        elif pct_b < 0.25:
            score += 1
        elif pct_b > 0.9:
            score -= 2      # extreme overbought
        elif pct_b > 0.75:
            score -= 1

        # ── Improvement 1: Volume confirmation ───────────────────────────────
        # High volume amplifies the signal; low volume dampens it
        if vol_ratio > 2.0:
            score = int(score * 1.5)   # strong conviction — amplify
        elif vol_ratio > 1.5:
            score = int(score * 1.2)
        elif vol_ratio < 0.5:
            score = int(score * 0.5)   # weak volume — reduce confidence

        # ── Improvement 3: Regime adjustment ─────────────────────────────────
        # In trending market, don't fight the trend
        if regime == "trending_down" and score > 0:
            score -= 1      # reduce bullish signals in downtrend
        elif regime == "trending_up" and score < 0:
            score += 1      # reduce bearish signals in uptrend

        # In ranging market, trust mean reversion (BB) more
        if regime == "ranging":
            if pct_b < 0.2:
                score += 1
            elif pct_b > 0.8:
                score -= 1

        predicted_direction = "up" if score > 0 else ("down" if score < 0 else "sideways")

        # Target: last close +/- ATR (scaled by confidence)
        confidence_mult = min(abs(score) / 3, 1.5)
        predicted_target = round(
            last_close + atr * confidence_mult if predicted_direction == "up"
            else last_close - atr * confidence_mult,
            4
        )

        # Actual outcome
        actual_direction = "up" if actual_next["close"] > last_close else (
            "down" if actual_next["close"] < last_close else "sideways"
        )
        actual_close    = actual_next["close"]
        price_error_pct = abs(predicted_target - actual_close) / actual_close * 100 if actual_close else 0

        direction_correct = (predicted_direction == actual_direction) or (
            predicted_direction == "sideways" and abs(actual_close - last_close) / last_close < 0.002
        )

        if direction_correct:
            correct_direction += 1
        total_price_error += price_error_pct
        tested += 1

        candle_result = {
            "candle_index": i,
            "date": context[-1].get("time", str(i)),
            "close_before": last_close,
            "predicted_direction": predicted_direction,
            "predicted_target": predicted_target,
            "actual_direction": actual_direction,
            "actual_close": actual_close,
            "direction_correct": direction_correct,
            "price_error_pct": round(price_error_pct, 3),
            "score": score,
            "regime": regime,
            "vol_ratio": round(vol_ratio, 2),
        }
        results.append(candle_result)

    if tested == 0:
        return {"error": "No candles tested"}

    direction_accuracy = round(correct_direction / tested * 100, 1)
    avg_price_error = round(total_price_error / tested, 3)

    summary = {
        "symbol": symbol,
        "interval": interval,
        "candles_tested": tested,
        "skipped_choppy_hours": skipped_time,
        "direction_accuracy_pct": direction_accuracy,
        "avg_price_error_pct": avg_price_error,
        "correct_direction": correct_direction,
        "wrong_direction": tested - correct_direction,
        "improvements": ["volume_confirmation", "time_filter", "regime_detection", "weighted_scoring"],
        "date_run": _datetime.datetime.utcnow().isoformat(),
        "results": results,
    }

    # Log to Supabase
    db = get_db()
    if db:
        try:
            db.table("backtest_results").insert({
                "symbol": symbol,
                "interval": interval,
                "candles_tested": tested,
                "direction_accuracy_pct": direction_accuracy,
                "avg_price_error_pct": avg_price_error,
                "correct_direction": correct_direction,
                "wrong_direction": tested - correct_direction,
                "date_run": _datetime.datetime.utcnow().isoformat(),
            }).execute()
        except Exception:
            pass  # Supabase logging is best-effort

    return summary
