# VC Agent

An autonomous multi-agent system for VC deal research. Enter any company name 
and 4 specialized AI agents research it in parallel, score it against a 
stage-aware investment rubric, and produce a structured investment memo — 
in under 60 seconds.

## How it works

**Research agent** — fires targeted web searches via Tavily across 5 mandatory 
categories: funding, traction, team, competitors, and recent news.

**Data agent** — pulls structured company data from Wikipedia and Yahoo Finance, 
normalizes it into a clean JSON profile.

**Filing agent** — queries SEC EDGAR's free API for 10-K, S-1, and 8-K filings 
to extract revenue, burn rate, and risk signals.

**Analysis agent** — retrieves similar past deals from a ChromaDB vector store 
(RAG), applies a stage-aware weighted scoring rubric across 5 dimensions, and 
writes a full investment memo.

## Scoring model

Dimension scores (0–10) are weighted differently based on company stage:

| Dimension | Seed | Series A | Series B |
|---|---|---|---|
| Team | 35% | 25% | 15% |
| Market | 25% | 20% | 15% |
| Traction | 15% | 30% | 35% |
| Moat | 15% | 15% | 20% |
| Financial | 10% | 10% | 15% |

Risk flags apply score penalties. 2+ critical flags trigger an automatic Pass.

## Tech stack

| Layer | Technology |
|---|---|
| Agent orchestration | LangGraph |
| LLM backbone | Claude API (claude-sonnet-4) |
| Web search | Tavily |
| Vector store / RAG | ChromaDB |
| Financial data | Yahoo Finance, SEC EDGAR |
| Backend API | FastAPI |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Frontend | React + Vite + Tailwind + Recharts |

## Features

- 4-agent sequential pipeline with shared LangGraph state
- Stage-aware weighted scoring (Seed / Series A / Series B)
- RAG-augmented analysis using past deal memos
- Persistent deal database with full memo history
- Head-to-head company comparison
- Sector trend analytics across all analyzed deals
- Interactive React dashboard

## Getting started

```bash
# Backend
cd vc-agent
pip install -r requirements.txt
cp .env.example .env  # add ANTHROPIC_API_KEY and TAVILY_API_KEY
uvicorn backend.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /analyze | Run all 4 agents on a company |
| GET | /deals | List all past deals |
| GET | /deals/{id} | Get full deal detail |
| POST | /compare | Compare two companies |
| GET | /sectors | Sector trend analytics |
