"""Protect the model facts used by the browser's finite routine search."""
from copy import deepcopy
import json
from pathlib import Path

from astrotwin_model import forecast, load_params

ROOT = Path(__file__).resolve().parents[2]


def case():
    crew = json.loads((ROOT / "data/crew_presets.json").read_text(encoding="utf-8"))[0]
    return {
        "crew": crew,
        "mission": {"destination": "ISS", "duration_days": 180, "eva_days": [60]},
        "injury": {"type": "lower_back_strain", "severity": 2, "day": 40, "side": None},
        "countermeasures": {"resistance_min_per_day": 90, "aerobic_min_per_day": 60,
                            "protein_g_per_kg": 1.2, "calorie_pct": 100, "bisphosphonate": False},
    }


def test_exercise_search_caps_match_model_saturation():
    params = load_params(str(ROOT / "data/params.json"))
    request = case()
    at_caps = forecast(request, params)
    request["countermeasures"].update(resistance_min_per_day=120, aerobic_min_per_day=120)
    above_caps = forecast(request, params)
    assert at_caps["series"] == above_caps["series"]
    assert at_caps["regions"] == above_caps["regions"]


def test_destination_labels_do_not_introduce_gravity_effects():
    params = load_params(str(ROOT / "data/params.json"))
    request = case()
    reference = forecast(request, params)
    for destination in ("MOON", "MARS"):
        request["mission"]["destination"] = destination
        assert forecast(request, params) == reference


def test_profile_measurements_do_not_create_personal_percent_forecasts():
    params = load_params(str(ROOT / "data/params.json"))
    request = case()
    reference = forecast(request, params)
    changed = deepcopy(request)
    changed["crew"].update(age=70, sex="M", mass_kg=100, fitness="low")
    changed["crew"]["baseline"] = {key: value * 0.8 for key, value in changed["crew"]["baseline"].items()}
    assert forecast(changed, params) == reference
