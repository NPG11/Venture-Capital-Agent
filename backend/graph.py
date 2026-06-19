from langgraph.graph import END, StateGraph

from backend.agents.analysis import run_analysis_agent
from backend.agents.data import run_data_agent
from backend.agents.filing import run_filing_agent
from backend.agents.research import run_research_agent
from backend.state import AgentState

graph = StateGraph(AgentState)

graph.add_node("research", run_research_agent)
graph.add_node("data", run_data_agent)
graph.add_node("filing", run_filing_agent)
graph.add_node("analysis", run_analysis_agent)

graph.set_entry_point("research")
graph.add_edge("research", "data")
graph.add_edge("data", "filing")
graph.add_edge("filing", "analysis")
graph.add_edge("analysis", END)

agent_graph = graph.compile()


def run_analysis(company: str, stage: str) -> AgentState:
    initial_state: AgentState = {
        "company": company,
        "stage": stage,
        "research": None,
        "structured_data": None,
        "filing_data": None,
        "similar_deals": None,
        "scores": None,
        "risk_flags": None,
        "memo": None,
        "verdict": None,
        "final_score": None,
        "errors": [],
    }
    return agent_graph.invoke(initial_state)
