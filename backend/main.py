import json

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.db.database import (
    get_all_deals,
    get_deal_by_id,
    get_sector_stats,
    init_db,
    save_deal,
)
from backend.graph import run_analysis

app = FastAPI(title="VC Deal Research API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ---------- Request / Response models ----------

class AnalyzeRequest(BaseModel):
    company: str
    stage: str = "series_a"


class CompareRequest(BaseModel):
    company_a: str
    company_b: str


# ---------- Helpers ----------

def _deal_summary(deal):
    return {
        "id": deal.id,
        "company": deal.company,
        "stage": deal.stage,
        "final_score": deal.final_score,
        "verdict": deal.verdict,
        "sector": deal.sector,
        "analyzed_at": deal.analyzed_at.isoformat() if deal.analyzed_at else None,
    }


def _deal_detail(deal):
    return {
        **_deal_summary(deal),
        "scores": json.loads(deal.scores_json or "{}"),
        "risk_flags": json.loads(deal.risk_flags_json or "[]"),
        "structured_data": json.loads(deal.structured_data_json or "{}"),
        "memo": deal.memo,
    }


# ---------- Endpoints ----------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    valid_stages = {"seed", "series_a", "series_b"}
    if req.stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"stage must be one of {valid_stages}")

    state = run_analysis(company=req.company, stage=req.stage)
    deal = save_deal(state)

    return {
        "deal_id": deal.id,
        "company": state.get("company"),
        "stage": state.get("stage"),
        "final_score": state.get("final_score"),
        "verdict": state.get("verdict"),
        "scores": state.get("scores"),
        "risk_flags": state.get("risk_flags"),
        "structured_data": state.get("structured_data"),
        "memo": state.get("memo"),
        "errors": state.get("errors") or [],
    }


@app.get("/deals")
def list_deals():
    deals = get_all_deals()
    return [_deal_summary(d) for d in deals]


@app.get("/deals/{deal_id}")
def get_deal(deal_id: int):
    deal = get_deal_by_id(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return _deal_detail(deal)


@app.post("/compare")
def compare_deals(req: CompareRequest):
    all_deals = get_all_deals()

    deal_a = next((d for d in all_deals if d.company.lower() == req.company_a.lower()), None)
    deal_b = next((d for d in all_deals if d.company.lower() == req.company_b.lower()), None)

    missing = []
    if not deal_a:
        missing.append(req.company_a)
    if not deal_b:
        missing.append(req.company_b)
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Companies not yet analyzed: {', '.join(missing)}. Run /analyze first.",
        )

    def scores_for(deal):
        raw = json.loads(deal.scores_json or "{}")
        return {k: v for k, v in raw.items() if k != "rationale"}

    return {
        "company_a": {
            "id": deal_a.id,
            "company": deal_a.company,
            "stage": deal_a.stage,
            "final_score": deal_a.final_score,
            "verdict": deal_a.verdict,
            "scores": scores_for(deal_a),
        },
        "company_b": {
            "id": deal_b.id,
            "company": deal_b.company,
            "stage": deal_b.stage,
            "final_score": deal_b.final_score,
            "verdict": deal_b.verdict,
            "scores": scores_for(deal_b),
        },
    }


@app.get("/sectors")
def sectors():
    return get_sector_stats()
