# OrionIntel — Global Financial Intelligence Platform

## Architecture
- **Frontend**: Next.js 14 + TypeScript → localhost:3000
- **Backend**: Python FastAPI + LangChain → localhost:8000
- **AI**: Google Gemini 2.5 Flash + 2.0 Flash Lite
- **Database**: Supabase (optional — gracefully disabled if not configured)

## Quick Start

### Windows
```
double-click start.bat
```

### Mac / Linux
```bash
bash start.sh
```

Then open: **http://localhost:3000**

---

## Manual Setup

### Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## API Keys

Fill in `backend/.env` before starting:

| Key | Where to get | Cost |
|-----|-------------|------|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | Free |
| `ALPHA_VANTAGE_KEY` | [alphavantage.co](https://alphavantage.co) | Free |
| `COINGECKO_API_KEY` | [coingecko.com/api](https://coingecko.com/api) | Free |
| `FINNHUB_API_KEY` | [finnhub.io](https://finnhub.io) | Free |
| `NEWS_API_KEY` | [newsapi.org](https://newsapi.org) | Free |
| `FRED_API_KEY` | [fred.stlouisfed.org](https://fred.stlouisfed.org) | Free |
| `SUPABASE_URL` | [supabase.com](https://supabase.com) | Free (optional) |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard | Free (optional) |

---

## Features

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Market overview + AI query + news |
| Bull vs Bear | `/debate` | 4-round AI debate on any asset |
| Butterfly Effect | `/butterfly` | 1st/2nd/3rd order market ripples |
| Stress Test | `/stress-test` | Historical + supply chain + predictions |
| Timeline | `/timeline` | 5-stage market reaction timeline |
| Opportunities | `/opportunities` | Contrarian plays from crises |
| News Feed | `/news` | Live news with AI impact scoring |

---

## API Documentation

Interactive Swagger UI: **http://localhost:8000/docs**

### Key endpoints
```
GET  /api/health              — Server + API key status
GET  /api/market/overview     — Indices, crypto, commodities, fear/greed
GET  /api/market/macro        — FRED economic indicators
GET  /api/news                — Latest financial news
GET  /api/news/search?q=...   — Search news
POST /api/ai/query            — Ask any financial question
POST /api/ai/debate           — Bull vs bear debate
POST /api/ai/butterfly        — Ripple effect analysis
POST /api/ai/stress-test      — Geopolitical stress test
POST /api/ai/timeline         — Market reaction timeline
POST /api/ai/opportunities    — Contrarian opportunity finder
POST /api/ai/memory           — Historical pattern matching
POST /api/ai/score-news       — AI news impact scoring
```

### Test all endpoints
```bash
cd backend
python test_all.py
```

---

## Project Structure

```
orionintel/
├── start.bat              # Windows launcher
├── start.sh               # Mac/Linux launcher
├── README.md
├── backend/
│   ├── main.py            # FastAPI app + CORS + routes
│   ├── .env               # API keys (never commit this)
│   ├── requirements.txt
│   ├── test_all.py        # Endpoint test suite
│   ├── core/
│   │   ├── config.py      # Pydantic settings
│   │   ├── gemini.py      # Gemini LLM + ask()/ask_json()
│   │   └── db.py          # Supabase client
│   ├── agents/
│   │   ├── query.py       # General financial Q&A
│   │   ├── debate.py      # Bull vs bear 4-round debate
│   │   ├── butterfly.py   # Market ripple effects
│   │   ├── stress_test.py # 3-agent sequential analysis
│   │   ├── timeline.py    # 5-stage timeline
│   │   ├── opportunity.py # Contrarian plays
│   │   ├── memory_engine.py # Historical patterns
│   │   └── news_scorer.py # Parallel article scoring
│   ├── routers/
│   │   ├── ai.py          # 8 AI endpoints
│   │   ├── market.py      # Market data endpoints
│   │   ├── news.py        # News endpoints
│   │   └── health.py      # Health check
│   └── services/
│       ├── market.py      # CoinGecko + Alpha Vantage
│       ├── news.py        # NewsAPI + GDELT
│       └── fred.py        # FRED economic data
└── frontend/
    ├── app/
    │   ├── dashboard/     # Main dashboard
    │   ├── debate/        # Bull vs bear
    │   ├── butterfly/     # Butterfly effect
    │   ├── stress-test/   # Stress test
    │   ├── timeline/      # Timeline
    │   ├── opportunities/ # Opportunities
    │   └── news/          # News feed
    ├── components/
    │   └── layout/        # Sidebar + DashboardShell
    └── lib/
        └── api.ts         # Python backend client
```
