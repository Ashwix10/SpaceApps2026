from copy import deepcopy
import json
from pathlib import Path
from time import perf_counter

import pytest
from pydantic import ValidationError
from astrotwin_model import compare, forecast, load_params
from astrotwin_model.schemas import ForecastResponse

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def case():
    crew = json.loads((ROOT / "data/crew_presets.json").read_text())[0]
    return {"crew": crew, "mission": {"destination": "ISS", "duration_days": 180, "eva_days": [60, 120]},
            "injury": None, "countermeasures": {"resistance_min_per_day": 60, "aerobic_min_per_day": 60,
            "protein_g_per_kg": 1.2, "calorie_pct": 100, "bisphosphonate": False}}


@pytest.fixture
def params():
    return load_params(str(ROOT / "data/params.json"))


@pytest.mark.parametrize("duration", [7, 180, 900])
def test_bounds_baseline_loss_recovery_and_bands(case, params, duration):
    case["mission"] = {"destination": "ISS", "duration_days": duration, "eva_days": []}
    out = forecast(case, params)
    ForecastResponse.model_validate(out)
    assert out["days"] == list(range(duration + 91))
    for key, curve in out["series"].items():
        assert curve[0] == 100
        assert curve[duration] < 100
        assert curve[-1] > curve[duration]
        assert all(0 <= value <= 100 for value in curve)
        assert all(a >= b for a, b in zip(curve[:duration], curve[1:duration + 1]))
        assert all(a <= b for a, b in zip(curve[duration:], curve[duration + 1:]))
        band = out["bands"][key]
        assert len(band["low"]) == len(band["high"]) == len(curve)
        assert all(0 <= lo <= value <= hi <= 100 for lo, value, hi in zip(band["low"], curve, band["high"]))
    assert len(out["regions"]) == 9
    assert all(len(v) == duration + 91 and all(0 <= x <= 1 for x in v) for v in out["regions"].values())


def test_daily_equation_and_recovery_half_life(case, params):
    # Independent closed-form expectation: disable all modifiers and use a 7-day mission.
    case["crew"].update(age=40, fitness="average", sex="M")
    case["mission"] = {"destination": "ISS", "duration_days": 7, "eva_days": []}
    case["countermeasures"].update(resistance_min_per_day=0, aerobic_min_per_day=0, protein_g_per_kg=0.8)
    out = forecast(case, params)
    expected = 100 * (1 - params["daily_loss"]["hip_bmd"]) ** 7
    assert out["series"]["hip_bmd_pct"][7] == round(expected, 2)
    recovered = 100 - (100 - expected) * 0.5 ** (90 / params["recovery_half_life_days"]["hip_bmd"])
    assert out["series"]["hip_bmd_pct"][-1] == round(recovered, 2)


def test_medication_and_exercise_are_tissue_specific(case, params):
    base = forecast(case, params)
    case["countermeasures"]["bisphosphonate"] = True
    medicated = forecast(case, params)
    assert medicated["series"]["hip_bmd_pct"][180] > base["series"]["hip_bmd_pct"][180]
    assert medicated["series"]["vo2max_pct"] == base["series"]["vo2max_pct"]
    assert medicated["series"]["leg_muscle_pct"] == base["series"]["leg_muscle_pct"]
    case["countermeasures"].update(bisphosphonate=False, resistance_min_per_day=90)
    resistance = forecast(case, params)
    assert resistance["series"]["hip_bmd_pct"][180] > base["series"]["hip_bmd_pct"][180]
    assert resistance["series"]["leg_muscle_pct"][180] > base["series"]["leg_muscle_pct"][180]


@pytest.mark.parametrize("kind,region,side", [("ankle_sprain", "left_leg", "left"), ("wrist_fracture", "right_arm", "right"),
                                             ("lower_back_strain", "spine", None), ("thigh_muscle_tear", "right_leg", "right")])
def test_injury_is_timed_local_and_heals(case, params, kind, region, side):
    clean = forecast(case, params)
    case["injury"] = {"type": kind, "day": 40, "severity": 2, "side": side}
    injured = forecast(case, params)
    assert injured["regions"][region][:40] == clean["regions"][region][:40]
    assert injured["regions"][region][40] <= clean["regions"][region][40] - 0.29
    if kind == "wrist_fracture":
        assert injured["regions"]["left_arm"] == clean["regions"]["left_arm"]
        assert injured["series"] == clean["series"]
    if kind in ("ankle_sprain", "thigh_muscle_tear"):
        other = "right_leg" if region == "left_leg" else "left_leg"
        assert injured["regions"][region][40] < injured["regions"][other][40]
        assert injured["regions"][region][100] == injured["regions"][other][100]
        assert injured["series"]["leg_muscle_pct"][60] < clean["series"]["leg_muscle_pct"][60]
    assert injured["regions"][region][-1] > injured["regions"][region][40]


def test_landing_restores_normal_healing_speed(case, params):
    case["mission"] = {"destination": "ISS", "duration_days": 45, "eva_days": []}
    case["injury"] = {"type": "ankle_sprain", "day": 40, "severity": 2, "side": "left"}
    out = forecast(case, params)
    # Five slow in-flight healing intervals plus eighteen Earth intervals finish before day 64.
    assert out["regions"]["left_leg"][64] == out["regions"]["right_leg"][64]


def test_comparison_improves_bone_without_mutating_inputs(case, params):
    case["injury"] = {"type": "ankle_sprain", "day": 40, "severity": 2, "side": "left"}
    alternative = {**case["countermeasures"], "resistance_min_per_day": 90, "aerobic_min_per_day": 45,
                   "protein_g_per_kg": 1.6, "bisphosphonate": True}
    before = deepcopy((case, alternative, params))
    result = compare(case, alternative, params)
    assert (case, alternative, params) == before
    assert result["alternative"]["series"]["hip_bmd_pct"][180] > result["baseline"]["series"]["hip_bmd_pct"][180]
    # Trading aerobic minutes for resistance need not improve aerobic fitness.
    assert result["alternative"]["series"]["vo2max_pct"][180] <= result["baseline"]["series"]["vo2max_pct"][180]


def test_risks_use_contract_days_and_thresholds(case, params):
    case["mission"]["eva_days"] = [120, 60]
    out = forecast(case, params)
    for name, day, keys in [("fracture", 180, ("hip_bmd_pct", "spine_bmd_pct")),
                            ("eva_fitness", 60, ("leg_muscle_pct", "vo2max_pct")),
                            ("landing_fitness", 180, ("leg_muscle_pct", "vo2max_pct"))]:
        value = min(out["series"][k][day] for k in keys)
        limits = params["risk_thresholds"][name]
        expected = "red" if value <= limits["red"] else "yellow" if value <= limits["yellow"] else "green"
        assert out["risks"][name]["level"] == expected
        assert f"{value:.2f}%" in out["risks"][name]["reason"]


@pytest.mark.parametrize("field", ["eva", "injury"])
def test_out_of_mission_events_rejected(case, params, field):
    if field == "eva":
        case["mission"]["eva_days"] = [181]
    else:
        case["injury"] = {"type": "ankle_sprain", "day": 181, "severity": 1, "side": "left"}
    with pytest.raises(ValidationError):
        forecast(case, params)


def test_long_mission_performance_and_floors(case, params):
    case["mission"]["duration_days"] = 900
    case["countermeasures"].update(resistance_min_per_day=0, aerobic_min_per_day=0, protein_g_per_kg=0.8)
    start = perf_counter()
    out = forecast(case, params)
    assert perf_counter() - start < 0.3
    for tissue, key in [("hip_bmd", "hip_bmd_pct"), ("spine_bmd", "spine_bmd_pct"), ("leg_muscle", "leg_muscle_pct"), ("vo2max", "vo2max_pct")]:
        assert min(out["series"][key]) >= params["loss_floor_pct"][tissue]
