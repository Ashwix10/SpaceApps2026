"""Deterministic implementation of the build-plan equations, not a clinical model."""
from copy import deepcopy
import json
from math import prod

from .schemas import ForecastRequest

MODEL_VERSION = "1.0-development"
TISSUES = ("hip_bmd", "spine_bmd", "leg_muscle", "vo2max")
KEYS = dict(zip(TISSUES, ("hip_bmd_pct", "spine_bmd_pct", "leg_muscle_pct", "vo2max_pct")))


def clamp(value, low=0.0, high=1.0):
    return min(high, max(low, value))


def load_params(path: str = "data/params.json") -> dict:
    with open(path, encoding="utf-8") as stream:
        return json.load(stream)


def effectiveness(measures, params, back_injury=False):
    limits = params["countermeasure_max_effect"]
    resistance = limits["resistance"] * min(measures["resistance_min_per_day"] / 90, 1)
    if back_injury:
        resistance *= 0.5
    aerobic = limits["aerobic"] * min(measures["aerobic_min_per_day"] / 60, 1)
    protein = limits["protein"] * clamp((measures["protein_g_per_kg"] - 0.8) / 0.8)
    medication = limits["bisphosphonate"] if measures["bisphosphonate"] else 0

    def combine(*values):
        return min(0.85, 1 - prod(1 - value for value in values))

    return {"hip_bmd": combine(resistance, medication), "spine_bmd": combine(resistance, medication),
            "leg_muscle": combine(resistance, aerobic / 2, protein), "vo2max": combine(aerobic)}


def region_percentages(values, arm):
    leg = (values["leg_muscle"] + values["hip_bmd"]) / 2
    return {"head_neck": 100.0, "chest": (arm + values["vo2max"]) / 2,
            "heart": values["vo2max"], "spine": values["spine_bmd"], "pelvis": values["hip_bmd"],
            "left_arm": arm, "right_arm": arm, "left_leg": leg, "right_leg": leg}


def risk(value, thresholds, description):
    level = "red" if value <= thresholds["red"] else "yellow" if value <= thresholds["yellow"] else "green"
    return {"level": level, "score": int(clamp(round((100 - value) * 5), 0, 100)),
            "reason": f"{description} is projected at {value:.2f}% of preflight baseline."}


def forecast(request: dict, params: dict) -> dict:
    # Shared validation also protects direct callers, not only FastAPI clients.
    request = ForecastRequest.model_validate(request).model_dump()
    crew, mission, injury, measures = (request[k] for k in ("crew", "mission", "injury", "countermeasures"))
    landing = mission["duration_days"]
    count = landing + 91
    factors = params["person_factors"]
    person = (1 + factors["age_per_decade_over_40"] * max(0, (crew["age"] - 40) / 10))
    person *= factors["fitness"][crew["fitness"]] * factors["sex"][crew["sex"]]
    calories = 1 + 2 * max(0, 100 - measures["calorie_pct"]) / 100
    recovery = {t: 1 - 0.5 ** (1 / params["recovery_half_life_days"][t]) for t in TISSUES}
    values = {t: 100.0 for t in TISSUES}
    arm = 100.0
    series = {KEYS[t]: [] for t in TISSUES}
    previous_regions = region_percentages(values, arm)
    regions = {r: [] for r in previous_regions}
    healing = 0.0
    local_value = None
    injury_params = params["injury"][injury["type"]] if injury else None
    target = None if not injury else "spine" if injury["type"] == "lower_back_strain" else f"{injury['side']}_{'arm' if injury['type'] == 'wrist_fracture' else 'leg'}"
    normal_effect = effectiveness(measures, params)
    back_effect = effectiveness(measures, params, back_injury=True)

    for day in range(count):
        if injury and day > injury["day"] and healing < 1:
            speed = injury_params["microgravity_slowdown"] if day <= landing else 1
            healing = min(1.0, healing + 1 / (injury_params["healing_days"][injury["severity"] - 1] * speed))
        active = injury is not None and day >= injury["day"] and healing < 1
        effect = back_effect if active and target == "spine" else normal_effect
        if day and day <= landing:
            rates = {t: params["daily_loss"][t] * (1 - effect[t]) * person * (1 if t == "vo2max" else calories) for t in TISSUES}
            # Arms follow half the uninjured muscle rate, without a leg-specific disuse multiplier.
            arm *= max(0, 1 - rates["leg_muscle"] / 2)
            if active and target in ("left_leg", "right_leg"):
                rates["leg_muscle"] *= 1 + 0.5 * (injury_params["extra_local_loss"] - 1)
            for tissue in TISSUES:
                values[tissue] = max(params["loss_floor_pct"][tissue], values[tissue] * max(0, 1 - rates[tissue]))
        elif day > landing:
            for tissue in TISSUES:
                values[tissue] += (100 - values[tissue]) * recovery[tissue]
            arm += (100 - arm) * recovery["leg_muscle"]

        normal_regions = region_percentages(values, arm)
        health = {r: clamp(1 - (100 - pct) / 40) for r, pct in normal_regions.items()}
        if active:
            normal = normal_regions[target]
            if local_value is None:
                local_value = normal
            elif day <= landing:
                previous = previous_regions[target]
                rate = max(0, 1 - normal / previous) if previous else 0
                local_value *= max(0, 1 - rate * injury_params["extra_local_loss"])
            else:
                tissue = "spine_bmd" if target == "spine" else "leg_muscle"
                local_value += (normal - local_value) * recovery[tissue]
            # Fade the additional local loss and injury-day dip back into the normal curve as healing completes.
            extra = max(0, normal - local_value) / 40 + 0.15 * injury["severity"]
            health[target] = clamp(health[target] - extra * (1 - healing))

        for tissue in TISSUES:
            series[KEYS[tissue]].append(round(values[tissue], 2))
        for region, value in health.items():
            regions[region].append(round(value, 2))
        previous_regions = normal_regions

    bands = {key: {"low": [round(clamp(v - params["uncertainty_pct"] * (100 - v), 0, 100), 2) for v in curve],
                   "high": [round(min(100, v + params["uncertainty_pct"] * (100 - v)), 2) for v in curve]} for key, curve in series.items()}
    eva_day = min(mission["eva_days"], default=landing)
    thresholds = params["risk_thresholds"]
    risks = {
        "fracture": risk(min(series["hip_bmd_pct"][landing], series["spine_bmd_pct"][landing]), thresholds["fracture"], "Lowest bone density at landing"),
        "eva_fitness": risk(min(series["leg_muscle_pct"][eva_day], series["vo2max_pct"][eva_day]), thresholds["eva_fitness"], f"Spacewalk fitness on day {eva_day}"),
        "landing_fitness": risk(min(series["leg_muscle_pct"][landing], series["vo2max_pct"][landing]), thresholds["landing_fitness"], "Landing fitness"),
    }
    events = [{"day": 0, "type": "launch", "label": "Launch"}, {"day": landing, "type": "landing", "label": "Landing"}]
    if injury:
        events.append({"day": injury["day"], "type": "injury", "label": injury["type"].replace("_", " ").capitalize()})
    events.extend({"day": d, "type": "eva", "label": f"Spacewalk day {d}"} for d in mission["eva_days"])
    return {"days": list(range(count)), "landing_day": landing, "series": series, "bands": bands, "regions": regions,
            "risks": risks, "events": sorted(events, key=lambda e: e["day"]),
            "meta": {"model_version": MODEL_VERSION, "params_version": str(params["version"])}}


def compare(request: dict, alternative: dict, params: dict) -> dict:
    other = deepcopy(request)
    other["countermeasures"] = deepcopy(alternative)
    return {"baseline": forecast(request, params), "alternative": forecast(other, params)}
