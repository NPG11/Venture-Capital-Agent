from typing import Optional, TypedDict


class AgentState(TypedDict):
    company: str
    stage: str
    research: Optional[str]
    structured_data: Optional[dict]
    filing_data: Optional[str]
    similar_deals: Optional[list]
    scores: Optional[dict]
    risk_flags: Optional[list]
    memo: Optional[str]
    verdict: Optional[str]
    final_score: Optional[float]
    errors: Optional[list]
