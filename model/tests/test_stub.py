"""Shape test for the model stub. Person 1 replaces or extends these tests."""
import json
from pathlib import Path

from astrotwin_model import compare, forecast, load_params
from astrotwin_model.schemas import CompareResponse, ForecastRequest, ForecastResponse

ROOT = Path(__file__).resolve().parents[2]


def _request():
    crew = json.loads((ROOT / "data" / "crew_presets.json").read_text(encoding="utf-8"))[0]
    req = {
        "crew": crew,
        "mission": {"destination": "ISS", "duration_days": 180, "eva_days": [60, 120]},
        "injury": {"type": "ankle_sprain", "severity": 2, "day": 40, "side": "left"},
        "countermeasures": {"resistance_min_per_day": 60, "aerobic_min_per_day": 60,
                            "protein_g_per_kg": 1.2, "calorie_pct": 100, "bisphosphonate": False},
    }
    ForecastRequest.model_validate(req)
    return req


def test_forecast_shape():
    params = load_params(str(ROOT / "data" / "params.json"))
    out = ForecastResponse.model_validate(forecast(_request(), params))
    assert out.landing_day == 180
    assert len(out.days) == 180 + 91
    assert len(out.series.hip_bmd_pct) == len(out.days)
    assert len(out.regions.left_leg) == len(out.days)


def test_compare_shape():
    params = load_params(str(ROOT / "data" / "params.json"))
    alt = {"resistance_min_per_day": 90, "aerobic_min_per_day": 45, "protein_g_per_kg": 1.6,
           "calorie_pct": 100, "bisphosphonate": True}
    CompareResponse.model_validate(compare(_request(), alt, params))
