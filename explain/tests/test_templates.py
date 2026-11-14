import json
from pathlib import Path

from astrotwin_explain import explain


def test_template_uses_forecast_values_and_discloses_placeholders():
    forecast = json.loads((Path(__file__).resolve().parents[2] / "data/fixtures/forecast_example.json").read_text())
    output = explain(forecast, None, "Demo crew", "crew")
    day = forecast["landing_day"]
    assert output["source"] == "template"
    assert f"{forecast['series']['vo2max_pct'][day]:.2f}%" in output["text"]
    assert "Development estimates" in output["text"]
    assert "Explanation coming soon" not in output["text"]


def test_summary_never_raises_for_missing_data():
    assert explain({}, None, "Crew", "surgeon")["source"] == "template"


def test_comparison_reports_tradeoffs():
    from copy import deepcopy
    forecast = json.loads((Path(__file__).resolve().parents[2] / "data/fixtures/forecast_example.json").read_text())
    alternative = deepcopy(forecast)
    day = forecast["landing_day"]
    alternative["series"]["hip_bmd_pct"][day] += 1
    alternative["series"]["vo2max_pct"][day] -= 2
    output = explain(forecast, {"baseline": forecast, "alternative": alternative}, "Crew", "surgeon")
    assert "+1.00" in output["text"]
    assert "-2.00" in output["text"]
