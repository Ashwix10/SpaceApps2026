"""Write data/fixtures/forecast_example.json from the demo seed (CONTRACT.md section 11).

Run from the repo root: python model/scripts/make_fixture.py
STUB by Person 2; Person 1 owns this script.
"""
import json
from pathlib import Path

from astrotwin_model import forecast, load_params

ROOT = Path(__file__).resolve().parents[2]

params = load_params(str(ROOT / "data" / "params.json"))
crew = json.loads((ROOT / "data" / "crew_presets.json").read_text(encoding="utf-8"))[0]
request = {
    "crew": crew,
    "mission": {"destination": "ISS", "duration_days": 180, "eva_days": [60, 120]},
    "injury": {"type": "ankle_sprain", "severity": 2, "day": 40, "side": "left"},
    "countermeasures": {"resistance_min_per_day": 60, "aerobic_min_per_day": 60,
                        "protein_g_per_kg": 1.2, "calorie_pct": 100, "bisphosphonate": False},
}
out = ROOT / "data" / "fixtures" / "forecast_example.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(forecast(request, params)), encoding="utf-8")
print(f"wrote {out}")
