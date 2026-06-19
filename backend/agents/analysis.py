import json
import os

import chromadb
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from backend.scoring import compute_final_score
from backend.state import AgentState

CHROMA_PATH = os.environ.get("CHROMA_PATH", "./chroma_db")

SCORING_PROMPT = """You are a senior VC analyst. Score each dimension 0-10 based on the signals provided.
Identify risk flags with severity "critical" or "moderate".

Return ONLY valid JSON:
{
  "scores": {
    "team": <0-10>,
    "market": <0-10>,
    "traction": <0-10>,
    "moat": <0-10>,
    "financial": <0-10>
  },
  "score_rationale": {
    "team": "<one sentence>",
    "market": "<one sentence>",
    "traction": "<one sentence>",
    "moat": "<one sentence>",
    "financial": "<one sentence>"
  },
  "risk_flags": [
    {"severity": "critical or moderate", "label": "<short>", "detail": "<one sentence>"}
  ]
}"""

MEMO_PROMPT = """You are a senior VC analyst writing a formal investment memo.
Write a structured memo with these sections:
1. Executive Summary
2. Company & Product
3. Team Assessment
4. Market Opportunity
5. Traction & Metrics
6. Competitive Moat
7. Financial Overview
8. Risk Factors
9. Comparable Deals
10. Recommendation

Be crisp and analytical. Base everything on the data provided. Max 800 words."""

llm = ChatAnthropic(model="claude-sonnet-4-20250514")


def _rag_retrieve(company: str, research: str) -> list[str]:
    try:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        collection = client.get_or_create_collection("past_deals")
        if collection.count() > 0:
            query_text = f"{company} {(research or '')[:200]}"
            results = collection.query(
                query_texts=[query_text],
                n_results=min(3, collection.count()),
            )
            return results["documents"][0]
    except Exception:
        pass
    return []


def _build_context(state: AgentState) -> str:
    parts = []
    if state.get("research"):
        parts.append(f"=== Research Brief ===\n{state['research']}")
    if state.get("structured_data"):
        parts.append(f"=== Structured Data ===\n{json.dumps(state['structured_data'], indent=2)}")
    if state.get("filing_data"):
        parts.append(f"=== SEC Filings ===\n{state['filing_data']}")
    if state.get("similar_deals"):
        deals_text = "\n---\n".join(state["similar_deals"])
        parts.append(f"=== Comparable Past Deals ===\n{deals_text}")
    return "\n\n".join(parts)


def run_analysis_agent(state: AgentState) -> AgentState:
    company = state["company"]
    stage = state["stage"]
    errors = state.get("errors") or []

    # Step 1: RAG retrieval
    try:
        similar_deals = _rag_retrieve(company, state.get("research") or "")
        state["similar_deals"] = similar_deals
    except Exception as e:
        errors.append(f"RAG retrieval error: {e}")
        state["similar_deals"] = []

    # Step 2: Scoring via Claude
    try:
        context = _build_context(state)
        human_msg = f"Company: {company}\nStage: {stage}\n\n{context}"

        score_response = llm.invoke([
            SystemMessage(content=SCORING_PROMPT),
            HumanMessage(content=human_msg),
        ])
        text = score_response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        try:
            parsed = json.loads(text)
            scores = parsed.get("scores", {})
            score_rationale = parsed.get("score_rationale", {})
            risk_flags = parsed.get("risk_flags", [])
        except json.JSONDecodeError:
            scores = {}
            score_rationale = {}
            risk_flags = []
            errors.append("Analysis agent: scoring JSON parse failure")

        # Attach rationale to scores dict
        full_scores = {**scores, "rationale": score_rationale}
        state["scores"] = full_scores
        state["risk_flags"] = risk_flags

        # Step 3: Apply weighted scoring formula
        final_score, verdict = compute_final_score(scores, risk_flags, stage)
        state["final_score"] = final_score
        state["verdict"] = verdict

    except Exception as e:
        errors.append(f"Analysis agent scoring error: {e}")
        state["scores"] = {}
        state["risk_flags"] = []
        state["final_score"] = 0.0
        state["verdict"] = "Pass"

    # Step 4: Generate investment memo
    try:
        context = _build_context(state)
        memo_context = (
            f"Company: {company}\nStage: {stage}\n"
            f"Final Score: {state['final_score']}/10\nVerdict: {state['verdict']}\n"
            f"Scores: {json.dumps(state.get('scores', {}), indent=2)}\n"
            f"Risk Flags: {json.dumps(state.get('risk_flags', []), indent=2)}\n\n"
            f"{context}"
        )
        memo_response = llm.invoke([
            SystemMessage(content=MEMO_PROMPT),
            HumanMessage(content=memo_context),
        ])
        state["memo"] = memo_response.content
    except Exception as e:
        errors.append(f"Analysis agent memo error: {e}")
        state["memo"] = None

    state["errors"] = errors
    return state
