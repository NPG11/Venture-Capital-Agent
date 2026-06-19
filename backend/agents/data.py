import json
import os

import requests
import wikipedia
import yfinance as yf
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from backend.state import AgentState

SYSTEM_PROMPT = """You are a VC data analyst extracting company information.
From the raw data provided, extract as much as possible into this JSON structure.

Rules:
- If you see "raised $330 million" → set total_funding_usd to 330000000
- If you see "valued at $10 billion" → set last_valuation_usd to 10000000000  
- If you see "about 3,000 employees" → set employee_count to 3000
- If you see a year like "founded in 2016" → set founded_year to 2016
- For revenue like "$67M ARR" → set estimated_revenue_usd to 67000000
- NEVER return null if there is any mention of the field anywhere in the text
- Make reasonable inferences — if Series C is mentioned, stage is "series_c"
- For key_investors extract any fund or firm names mentioned

Return ONLY valid JSON with these exact keys:
{
  "company_name": string,
  "founded_year": number | null,
  "headquarters": string | null,
  "total_funding_usd": number | null,
  "last_valuation_usd": number | null,
  "last_funding_round": string | null,
  "last_funding_year": number | null,
  "estimated_revenue_usd": number | null,
  "revenue_growth_pct": number | null,
  "employee_count": number | null,
  "employee_growth_pct_6m": number | null,
  "key_investors": [string],
  "business_model": string | null,
  "stage": "seed" | "series_a" | "series_b" | "growth" | "public" | null
}"""

llm = ChatAnthropic(model="claude-sonnet-4-20250514")


def _fetch_wikipedia(company: str) -> str:
    try:
        page = wikipedia.page(company)
        return page.content[:3000]
    except Exception:
        return ""


def _fetch_yfinance(company: str) -> dict:
    try:
        ticker = company.upper().replace(" ", "")
        info = yf.Ticker(ticker).info
        return {k: info.get(k) for k in [
            "longName", "sector", "industry", "fullTimeEmployees",
            "totalRevenue", "revenueGrowth", "marketCap", "enterpriseValue",
            "country", "city", "website", "longBusinessSummary",
        ]}
    except Exception:
        return {}


def _fetch_clearbit(company: str) -> dict:
    api_key = os.environ.get("CLEARBIT_API_KEY", "")
    if not api_key:
        return {}
    try:
        domain = f"{company.lower().replace(' ', '')}.com"
        resp = requests.get(
            f"https://company.clearbit.com/v2/companies/find?domain={domain}",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


def run_data_agent(state: AgentState) -> AgentState:
    company = state["company"]
    errors = state.get("errors") or []

    try:
        wiki_text = _fetch_wikipedia(company)
        yf_data = _fetch_yfinance(company)
        clearbit_data = _fetch_clearbit(company)

        human_msg = (
            f"Company: {company}\n\n"
            f"Wikipedia:\n{wiki_text}\n\n"
            f"Yahoo Finance:\n{json.dumps(yf_data, indent=2)}\n\n"
            f"Clearbit:\n{json.dumps(clearbit_data, indent=2)}"
        )

        response = llm.invoke([SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=human_msg)])
        text = response.content.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        try:
            state["structured_data"] = json.loads(text)
        except json.JSONDecodeError:
            state["structured_data"] = {"raw": response.content}
            errors.append("Data agent: JSON parse failure, stored raw response")

    except Exception as e:
        errors.append(f"Data agent error: {e}")
        state["structured_data"] = None

    state["errors"] = errors
    return state
