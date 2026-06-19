import os
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from tavily import TavilyClient

from backend.state import AgentState

SEARCH_CATEGORIES = [
    "{company} total funding raised valuation investors",
    "{company} revenue growth ARR traction metrics",
    "{company} founding team CEO background",
    "{company} competitors competitive landscape market",
    "{company} news 2024 2025",
]

SYSTEM_PROMPT = """You are a VC research analyst. Synthesize these search results into a clean
research brief with sections: Company overview, Founding team, Market & competitors,
Recent news & signals, Key unknowns. Be factual. Max 600 words."""

llm = ChatAnthropic(model="claude-sonnet-4-20250514")


def run_research_agent(state: AgentState) -> AgentState:
    company = state["company"]
    errors = state.get("errors") or []
    snippets = []

    try:
        tavily = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
        for template in SEARCH_CATEGORIES:
            query = template.format(company=company)
            try:
                results = tavily.search(query=query, max_results=3)
                for r in results.get("results", []):
                    content = r.get("content") or r.get("snippet", "")
                    if content:
                        snippets.append(f"[{query}]\n{content}")
            except Exception as e:
                errors.append(f"Tavily query failed '{query}': {e}")

        combined = "\n\n---\n\n".join(snippets) if snippets else "No search results retrieved."
        human_msg = f"Company: {company}\n\nSearch results:\n{combined}"

        response = llm.invoke([SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=human_msg)])
        state["research"] = response.content

    except Exception as e:
        errors.append(f"Research agent error: {e}")
        state["research"] = None

    state["errors"] = errors
    return state
