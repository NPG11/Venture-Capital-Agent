WEIGHTS = {
    "seed":     {"team": 0.35, "market": 0.25, "traction": 0.15, "moat": 0.15, "financial": 0.10},
    "series_a": {"team": 0.25, "market": 0.20, "traction": 0.30, "moat": 0.15, "financial": 0.10},
    "series_b": {"team": 0.15, "market": 0.15, "traction": 0.35, "moat": 0.20, "financial": 0.15},
}

DIMENSIONS = ["team", "market", "traction", "moat", "financial"]


def compute_final_score(scores: dict, risk_flags: list, stage: str) -> tuple[float, str]:
    weights = WEIGHTS.get(stage, WEIGHTS["series_a"])

    raw_score = sum(scores.get(dim, 0) * weights.get(dim, 0) for dim in DIMENSIONS)

    critical_count = sum(1 for f in risk_flags if f.get("severity") == "critical")
    moderate_count = sum(1 for f in risk_flags if f.get("severity") == "moderate")
    penalty = (critical_count * 0.3) + (moderate_count * 0.1)

    final_score = max(0.0, min(10.0, raw_score - penalty))

    if critical_count >= 2:
        verdict = "Pass"
    elif final_score >= 7.5:
        verdict = "Invest"
    elif final_score >= 5.5:
        verdict = "Watch"
    else:
        verdict = "Pass"

    return round(final_score, 2), verdict
