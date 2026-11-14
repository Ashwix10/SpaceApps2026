"""AstroTwin forecast model.

STUB by Person 2 (hour 0): flat lines at 100, all regions at 1.0, green risks.
Person 1 replaces this with the real model. Interface: CONTRACT.md section 6.
"""
from __future__ import annotations

import json
from typing import Any

from .schemas import REGION_IDS

__all__ = ["load_params", "forecast", "compare", "MODEL_VERSION"]

MODEL_VERSION = "0.0-stub"

_SERIES_KEYS = ("hip_bmd_pct", "spine_bmd_pct", "leg_muscle_pct", "vo2max_pct")


def load_params(path: str = "data/params.json") -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _risk(reason: str) -> dict:
    return {"level": "green", "score": 0, "reason": reason}


def forecast(request: dict, params: dict) -> dict:
    mission = request["mission"]
    landing_day = int(mission["duration_days"])
    n = landing_day + 91
    days = list(range(n))
    flat = [100.0] * n

    events: list[dict[str, Any]] = [{"day": 0, "type": "launch", "label": "Launch"}]
    injury = request.get("injury")
    if injury:
        events.append({"day": int(injury["day"]), "type": "injury",
                       "label": injury["type"].replace("_", " ").capitalize()})
    for d in mission.get("eva_days", []):
        events.append({"day": int(d), "type": "eva", "label": f"Spacewalk day {d}"})
    events.append({"day": landing_day, "type": "landing", "label": "Landing"})
    events.sort(key=lambda e: e["day"])

    return {
        "days": days,
        "landing_day": landing_day,
        "series": {k: list(flat) for k in _SERIES_KEYS},
        "bands": {k: {"low": list(flat), "high": list(flat)} for k in _SERIES_KEYS},
        "regions": {r: [1.0] * n for r in REGION_IDS},
        "risks": {
            "fracture": _risk("Stub model: no bone loss predicted yet."),
            "eva_fitness": _risk("Stub model: no fitness loss predicted yet."),
            "landing_fitness": _risk("Stub model: no fitness loss predicted yet."),
        },
        "events": events,
        "meta": {"model_version": MODEL_VERSION, "params_version": str(params.get("version", "unknown"))},
    }


def compare(request: dict, alternative: dict, params: dict) -> dict:
    alt_request = {**request, "countermeasures": alternative}
    return {"baseline": forecast(request, params), "alternative": forecast(alt_request, params)}
