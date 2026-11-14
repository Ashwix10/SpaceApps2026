"""Offline explanations built only from forecast outputs. Never calls an external service."""
from __future__ import annotations

__all__ = ["explain"]


def explain(forecast: dict, comparison: dict | None, crew_name: str, audience: str) -> dict:
    try:
        day = forecast["landing_day"]
        series = forecast["series"]
        bone = min(series["hip_bmd_pct"][day], series["spine_bmd_pct"][day])
        muscle = series["leg_muscle_pct"][day]
        aerobic = series["vo2max_pct"][day]
        risk = forecast["risks"]["landing_fitness"]["level"]
        name = str(crew_name).strip()[:80] or "Crew member"
        prefix = "Development estimates" if "placeholder" in forecast["meta"]["params_version"] else "Research simulation"
        text = (f"{prefix} for {name}: at landing on day {day}, lowest bone density is {bone:.2f}%, "
                f"leg muscle {muscle:.2f}%, and aerobic fitness {aerobic:.2f}% of baseline. "
                f"Landing-fitness flag: {risk}.")
        if comparison:
            alt = comparison["alternative"]["series"]
            base = comparison["baseline"]["series"]
            difference = alt["hip_bmd_pct"][day] - base["hip_bmd_pct"][day]
            aerobic_difference = alt["vo2max_pct"][day] - base["vo2max_pct"][day]
            text += f" Alternative hip bone: {difference:+.2f} percentage points; aerobic fitness: {aerobic_difference:+.2f}."
        if audience == "surgeon":
            text += " Review uncertainty and model assumptions before interpreting these simulated flags."
        else:
            text += " Review the comparison. Discuss the simulated plan with the mission team."
        return {"text": text, "source": "template"}
    except Exception:
        return {"text": "A forecast summary is unavailable. Review the forecast inputs and model assumptions with the mission team.", "source": "template"}
