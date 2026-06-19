import os

import requests
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from backend.state import AgentState

EDGAR_URL = "https://efts.sec.gov/LATEST/search-index?q=\"{company}\"&forms=10-K,S-1,8-K"
HEADERS = {"User-Agent": "vc-agent research neel.gude11@gmail.com"}

SYSTEM_PROMPT = """From these SEC filing excerpts extract: revenue figures, gross margin, burn rate,
cash/runway signals, top 3 risk factors, major business events.
If no filings found (private company), say so clearly. Max 400 words."""

llm = ChatAnthropic(model="claude-sonnet-4-20250514")


def _fetch_edgar(company: str) -> list[dict]:
    try:
        url = EDGAR_URL.format(company=requests.utils.quote(company))
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return []
        data = resp.json()
        hits = data.get("hits", {}).get("hits", [])
        results = []
        for hit in hits[:3]:
            src = hit.get("_source", {})
            results.append({
                "form_type": src.get("form_type"),
                "file_date": src.get("file_date"),
                "display_names": src.get("display_names"),
                "period_of_report": src.get("period_of_report"),
                "entity_name": src.get("entity_name"),
            })
        return results
    except Exception:
        return []


def run_filing_agent(state: AgentState) -> AgentState:
    company = state["company"]
    errors = state.get("errors") or []

    try:
        filings = _fetch_edgar(company)

        if filings:
            filing_text = "\n\n".join(
                f"Form: {f['form_type']} | Date: {f['file_date']} | "
                f"Entity: {f['display_names']} | Period: {f['period_of_report']}"
                for f in filings
            )
        else:
            filing_text = f"No SEC filings found for {company}. This is likely a private company."

        human_msg = f"Company: {company}\n\nSEC Filings:\n{filing_text}"
        response = llm.invoke([SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=human_msg)])
        state["filing_data"] = response.content

    except Exception as e:
        errors.append(f"Filing agent error: {e}")
        state["filing_data"] = None

    state["errors"] = errors
    return state
