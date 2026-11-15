"""Every change in a routine must change the forecast in the expected direction (no flat plateaus)."""
import json
from pathlib import Path

import pytest

from astrotwin_model import forecast, load_params

ROOT = Path(__file__).resolve().parents[2]
KEYS = ("hip_bmd_pct", "spine_bmd_pct", "leg_muscle_pct", "vo2max_pct")


@pytest.fixture(scope="module")
def run():
    params = load_params(str(ROOT / "data" / "params.json"))
    crew = json.loads((ROOT / "data" / "crew_presets.json").read_text(encoding="utf-8"))[0]

    def landing(**measures):
        cm = {"resistance_min_per_day": 60, "aerobic_min_per_day": 60, "protein_g_per_kg": 1.2,
              "calorie_pct": 100, "bisphosphonate": False, **measures}
        out = forecast({"crew": crew, "mission": {"destination": "ISS", "duration_days": 180, "eva_days": []},
                        "injury": None, "countermeasures": cm}, params)
        return {k: out["series"][k][180] for k in KEYS}
    return landing


@pytest.mark.parametrize("low,high", [(0, 30), (30, 60), (60, 90), (90, 120)])
def test_more_exercise_always_helps(run, low, high):
    less, more = run(resistance_min_per_day=low, aerobic_min_per_day=low), run(resistance_min_per_day=high, aerobic_min_per_day=high)
    for key in KEYS:
        assert more[key] > less[key], f"{key} did not improve from {low} to {high} min"


@pytest.mark.parametrize("low,high", [(0, 30), (30, 60), (60, 90), (90, 120)])
def test_more_cardio_improves_aerobic_fitness(run, low, high):
    assert run(aerobic_min_per_day=high)["vo2max_pct"] > run(aerobic_min_per_day=low)["vo2max_pct"]


def test_bisphosphonate_protects_bone(run):
    base, med = run(), run(bisphosphonate=True)
    assert med["hip_bmd_pct"] > base["hip_bmd_pct"] and med["spine_bmd_pct"] > base["spine_bmd_pct"]


def test_identical_routines_give_identical_forecasts(run):
    assert run() == run()
