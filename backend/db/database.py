import json
import os
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./vc_agent.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String, index=True)
    stage = Column(String)
    final_score = Column(Float)
    verdict = Column(String)
    sector = Column(String, nullable=True)
    scores_json = Column(Text)
    risk_flags_json = Column(Text)
    structured_data_json = Column(Text)
    memo = Column(Text)
    analyzed_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def save_deal(state: dict) -> Deal:
    db: Session = SessionLocal()
    try:
        structured = state.get("structured_data") or {}
        sector = None
        if isinstance(structured, dict):
            sector = structured.get("sector") or structured.get("industry")

        deal = Deal(
            company=state.get("company"),
            stage=state.get("stage"),
            final_score=state.get("final_score"),
            verdict=state.get("verdict"),
            sector=sector,
            scores_json=json.dumps(state.get("scores") or {}),
            risk_flags_json=json.dumps(state.get("risk_flags") or []),
            structured_data_json=json.dumps(structured),
            memo=state.get("memo"),
        )
        db.add(deal)
        db.commit()
        db.refresh(deal)
        return deal
    finally:
        db.close()


def get_all_deals() -> list:
    db: Session = SessionLocal()
    try:
        return db.query(Deal).order_by(Deal.analyzed_at.desc()).all()
    finally:
        db.close()


def get_deal_by_id(deal_id: int) -> Deal | None:
    db: Session = SessionLocal()
    try:
        return db.query(Deal).filter(Deal.id == deal_id).first()
    finally:
        db.close()


def get_sector_stats() -> list:
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(
                Deal.sector,
                func.count(Deal.id).label("deal_count"),
                func.avg(Deal.final_score).label("avg_score"),
            )
            .group_by(Deal.sector)
            .all()
        )
        results = []
        for row in rows:
            total = db.query(Deal).filter(Deal.sector == row.sector).count()
            invest = db.query(Deal).filter(Deal.sector == row.sector, Deal.verdict == "Invest").count()
            invest_rate = round(invest / total, 2) if total > 0 else 0.0
            results.append({
                "sector": row.sector,
                "deal_count": row.deal_count,
                "avg_score": round(row.avg_score or 0, 2),
                "invest_rate": invest_rate,
            })
        return results
    finally:
        db.close()
