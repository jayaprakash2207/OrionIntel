"""
Real Historical Pattern Matching Engine
Searches actual historical price data (not AI guesses) for similar candles and moves.
Uses yfinance for 20yr daily data + Angel One for 3mo intraday data.
"""
import asyncio
import math
import time
import logging
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

log = logging.getLogger("hist_patterns")
_executor = ThreadPoolExecutor(max_workers=4)

# Cache: symbol -> {"bars": [...], "fetched_at": timestamp}
_cache: dict = {}
CACHE_TTL = 3600  # refresh daily data once per hour


# ── Data fetching ─────────────────────────────────────────────────────────────

def _fetch_daily_bars(symbol: str) -> list:
    """Fetch maximum available daily OHLCV bars for a symbol."""
    cached = _cache.get(symbol)
    if cached and time.time() - cached["fetched_at"] < CACHE_TTL:
        return cached["bars"]

    bars = []

    # Try Angel One first for NSE/BSE symbols (5.5 years daily)
    try:
        from services.angel_one import is_configured, _fetch_history_sync, SYMBOL_MAP
        if is_configured() and symbol in SYMBOL_MAP:
            result = _fetch_history_sync(symbol, interval="1d", days=2000)
            if result.get("bars"):
                bars = result["bars"]
                log.info(f"[HistPat] {symbol}: {len(bars)} daily bars from Angel One")
    except Exception as e:
        log.debug(f"[HistPat] Angel One skip for {symbol}: {e}")

    # yfinance fallback / supplement (20+ years)
    if len(bars) < 200:
        try:
            import yfinance as yf
            hist = yf.Ticker(symbol).history(period="max", interval="1d")
            if not hist.empty:
                bars = []
                for ts, row in hist.iterrows():
                    try:
                        t = int(ts.timestamp())
                    except Exception:
                        t = int(ts.value // 1e9)
                    if row["Volume"] == 0 and row["High"] == row["Low"]:
                        continue  # skip zero-volume phantom bars
                    bars.append({
                        "time":   t,
                        "open":   round(float(row["Open"]),  4),
                        "high":   round(float(row["High"]),  4),
                        "low":    round(float(row["Low"]),   4),
                        "close":  round(float(row["Close"]), 4),
                        "volume": int(row["Volume"]) if row["Volume"] else 0,
                    })
                log.info(f"[HistPat] {symbol}: {len(bars)} daily bars from yfinance")
        except Exception as e:
            log.warning(f"[HistPat] yfinance error for {symbol}: {e}")

    _cache[symbol] = {"bars": bars, "fetched_at": time.time()}
    return bars


# ── Feature engineering ───────────────────────────────────────────────────────

def _candle_features(bar: dict, prev_bars: list) -> list:
    """
    Compute a normalised feature vector for one candle.
    Returns [body_ratio, direction, upper_wick, lower_wick, range_pct, vol_ratio]
    All values in [0, 1] or [-1, 1] so distances are comparable.
    """
    h, l, o, c = bar["high"], bar["low"], bar["open"], bar["close"]
    rng = h - l
    if rng == 0:
        rng = c * 0.001  # prevent div-by-zero

    body_ratio  = abs(c - o) / rng                            # 0=doji, 1=full body
    direction   = 1.0 if c >= o else -1.0                     # +1 bullish, -1 bearish
    upper_wick  = (h - max(o, c)) / rng                       # 0=no wick, 1=all wick
    lower_wick  = (min(o, c) - l) / rng
    range_pct   = min(rng / c, 0.10) / 0.10                   # normalise to 0-1 (cap at 10%)

    # Volume relative to 20-bar rolling average
    if prev_bars:
        vols = [b.get("volume", 0) for b in prev_bars[-20:] if b.get("volume", 0) > 0]
        avg_v = sum(vols) / len(vols) if vols else 0
        if avg_v > 0:
            vol_ratio = min(bar.get("volume", 0) / avg_v, 5.0) / 5.0
        else:
            vol_ratio = 0.2
    else:
        vol_ratio = 0.2  # neutral default

    return [body_ratio, direction, upper_wick, lower_wick, range_pct, vol_ratio]


def _distance(a: list, b: list, weights: list) -> float:
    """Weighted Euclidean distance between two feature vectors."""
    return math.sqrt(sum(w * (x - y) ** 2 for w, x, y in zip(weights, a, b)))


# ── Single candle similarity ──────────────────────────────────────────────────

def _find_similar_candles_sync(
    symbol: str,
    bar: dict,
    top_n: int = 5,
    lookahead: int = 10,
) -> list:
    """
    Search daily history for candles most similar to `bar`.
    Returns top_n matches with real dates and what actually happened next.
    """
    bars = _fetch_daily_bars(symbol)
    if len(bars) < 30:
        return []

    # Feature weights: direction matters most, then body, wicks, range, volume
    weights = [0.25, 0.35, 0.15, 0.15, 0.05, 0.05]

    # Target features
    target_idx = None
    # Try to find the bar in history by timestamp
    for i, b in enumerate(bars):
        if abs(b["time"] - bar.get("time", 0)) < 86400 and abs(b["close"] - bar["close"]) < bar["close"] * 0.005:
            target_idx = i
            break

    target_feat = _candle_features(bar, bars[:target_idx] if target_idx else [])

    candidates = []
    for i in range(20, len(bars) - lookahead):
        if target_idx and abs(i - target_idx) < 30:
            continue  # skip too-close-in-time matches
        feat = _candle_features(bars[i], bars[max(0, i-20):i])
        dist = _distance(target_feat, feat, weights)
        candidates.append((dist, i))

    candidates.sort(key=lambda x: x[0])
    results = []

    for dist, idx in candidates[:top_n * 3]:  # over-fetch, then filter best
        if len(results) >= top_n:
            break

        match_bar  = bars[idx]
        future     = bars[idx + 1 : idx + 1 + lookahead]
        if not future:
            continue

        # What actually happened next
        next_close_1  = future[0]["close"]
        next_close_5  = future[min(4,  len(future)-1)]["close"]
        next_close_10 = future[min(9,  len(future)-1)]["close"]
        ref           = match_bar["close"]

        chg_1  = round((next_close_1  - ref) / ref * 100, 2)
        chg_5  = round((next_close_5  - ref) / ref * 100, 2)
        chg_10 = round((next_close_10 - ref) / ref * 100, 2)

        outcome = "bullish" if chg_5 > 0.3 else ("bearish" if chg_5 < -0.3 else "neutral")

        # Human-readable date
        dt = datetime.fromtimestamp(match_bar["time"])
        date_str = dt.strftime("%d %b %Y")

        # Describe what happened
        if abs(chg_5) < 0.3:
            what_next = f"Price consolidated — moved only {chg_5:+.2f}% over next 5 days"
        elif chg_5 > 0:
            what_next = f"Rallied {chg_5:+.2f}% over 5 days, {chg_10:+.2f}% over 10 days"
        else:
            what_next = f"Fell {chg_5:+.2f}% over 5 days, {chg_10:+.2f}% over 10 days"

        results.append({
            "date":                 date_str,
            "approximate_price_level": round(ref, 2),
            "similarity_score":     round(1 - min(dist, 1), 2),   # 0-1, higher = more similar
            "next_1d_change_pct":   chg_1,
            "next_5d_change_pct":   chg_5,
            "next_10d_change_pct":  chg_10,
            "what_happened_next":   what_next,
            "outcome":              outcome,
            "magnitude_pct":        chg_5,
        })

    return results


# ── Range / move similarity ───────────────────────────────────────────────────

def _find_similar_moves_sync(
    symbol: str,
    magnitude_pct: float,
    direction: str,
    n_candles: int,
    top_n: int = 5,
    lookahead: int = 15,
) -> list:
    """
    Search for historical windows with a similar magnitude % move over similar duration.
    Returns top_n matches with what happened after.
    """
    bars = _fetch_daily_bars(symbol)
    if len(bars) < 50:
        return []

    dir_sign = 1 if direction == "up" else -1
    target_mag = abs(magnitude_pct)

    # Tolerance bands
    mag_tol      = max(target_mag * 0.35, 0.8)  # ±35% of magnitude (min ±0.8%)
    dur_tol      = max(n_candles * 0.5, 3)       # ±50% of duration (min ±3 bars)

    candidates = []

    for i in range(n_candles, len(bars) - lookahead):
        start = bars[i - n_candles]
        end   = bars[i]
        if start["close"] == 0:
            continue

        move = (end["close"] - start["close"]) / start["close"] * 100
        move_dir = 1 if move > 0 else -1

        # Must be same direction
        if move_dir != dir_sign:
            continue

        # Must be within magnitude tolerance
        if abs(abs(move) - target_mag) > mag_tol:
            continue

        # Score: closer magnitude = better
        score = abs(abs(move) - target_mag)
        candidates.append((score, i, move))

    candidates.sort(key=lambda x: x[0])
    results = []

    for score, idx, actual_move in candidates[:top_n * 3]:
        if len(results) >= top_n:
            break

        end_bar = bars[idx]
        future  = bars[idx + 1 : idx + 1 + lookahead]
        if not future:
            continue

        ref = end_bar["close"]
        chg_5  = round((future[min(4,  len(future)-1)]["close"] - ref) / ref * 100, 2)
        chg_15 = round((future[min(14, len(future)-1)]["close"] - ref) / ref * 100, 2)

        outcome = "continued" if (chg_5 * dir_sign) > 0.5 else ("reversed" if (chg_5 * dir_sign) < -0.5 else "consolidated")

        start_bar = bars[idx - n_candles]
        dt_start  = datetime.fromtimestamp(start_bar["time"])
        dt_end    = datetime.fromtimestamp(end_bar["time"])

        if abs(chg_5) < 0.5:
            what_next = f"Consolidated after the move — {chg_5:+.2f}% over next 5 days"
        elif (chg_5 * dir_sign) > 0:
            what_next = f"Continued {direction} — {chg_5:+.2f}% over 5 days, {chg_15:+.2f}% over 15 days"
        else:
            rev_dir = "down" if direction == "up" else "up"
            what_next = f"Reversed {rev_dir} — {chg_5:+.2f}% over 5 days, {chg_15:+.2f}% over 15 days"

        results.append({
            "year":              dt_start.strftime("%Y"),
            "date_range":        f"{dt_start.strftime('%b %Y')} to {dt_end.strftime('%b %Y')}",
            "magnitude_pct":     round(abs(actual_move), 2),
            "duration_candles":  n_candles,
            "from_price":        round(start_bar["close"], 2),
            "to_price":          round(end_bar["close"], 2),
            "next_5d_change_pct":  chg_5,
            "next_15d_change_pct": chg_15,
            "what_happened_next":  what_next,
            "outcome":             outcome,
            "description":         f"{direction.upper()} {abs(actual_move):.1f}% move over {n_candles} bars ({dt_start.strftime('%b %Y')})",
        })

    return results


# ── Async wrappers ────────────────────────────────────────────────────────────

async def find_similar_candles(symbol: str, bar: dict, top_n: int = 5) -> list:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor, _find_similar_candles_sync, symbol, bar, top_n, 10
    )


async def find_similar_moves(
    symbol: str,
    magnitude_pct: float,
    direction: str,
    n_candles: int,
    top_n: int = 5,
) -> list:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor, _find_similar_moves_sync,
        symbol, magnitude_pct, direction, n_candles, top_n, 15
    )


async def preload(symbol: str):
    """Warm up the cache for a symbol in the background."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _fetch_daily_bars, symbol)


def get_cache_status() -> dict:
    return {
        sym: {
            "bars": len(v["bars"]),
            "age_min": round((time.time() - v["fetched_at"]) / 60, 1),
        }
        for sym, v in _cache.items()
    }
