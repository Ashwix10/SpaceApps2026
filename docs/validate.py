"""Parameter provenance and model consistency checks; not clinical validation."""
import json
from pathlib import Path

from astrotwin_model import compare, forecast, load_params
from astrotwin_model.schemas import CrewProfile, ForecastResponse

ROOT = Path(__file__).resolve().parents[1]


def leaves(value, prefix=""):
    if isinstance(value, dict):
        for key, child in value.items():
            yield from leaves(child, f"{prefix}.{key}" if prefix else key)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from leaves(child, f"{prefix}.{index}")
    elif isinstance(value, (int, float)):
        yield prefix


def main():
    params = load_params(str(ROOT / "data/params.json"))
    evidence = json.loads((ROOT / "data/evidence.json").read_text(encoding="utf-8"))
    assert evidence["params_version"] == params["version"], "Evidence and parameters have different versions"
    prefixes = [entry["path"] for entry in evidence["parameters"]]
    missing = [path for path in leaves(params) if not any(path == p or path.startswith(p + ".") for p in prefixes)]
    assert not missing, f"Missing evidence classifications: {missing}"
    source_ids = {source["id"] for source in evidence["sources"]}
    assert all(set(entry["source_ids"]) <= source_ids for entry in evidence["parameters"])
    crew = json.loads((ROOT / "data/crew_presets.json").read_text(encoding="utf-8"))
    for member in crew:
        CrewProfile.model_validate(member)
    standard = {"crew": crew[0], "mission": {"destination": "ISS", "duration_days": 180, "eva_days": [60, 120]},
                "injury": None, "countermeasures": {"resistance_min_per_day": 60, "aerobic_min_per_day": 60,
                "protein_g_per_kg": 1.2, "calorie_pct": 100, "bisphosphonate": False}}
    untreated = {**standard, "crew": {**crew[0], "age": 40, "sex": "M", "fitness": "average"},
                 "countermeasures": {**standard["countermeasures"], "resistance_min_per_day": 0, "aerobic_min_per_day": 0, "protein_g_per_kg": 0.8}}
    unprotected = forecast(untreated, params)
    injured = {**standard, "injury": {"type": "ankle_sprain", "severity": 2, "day": 40, "side": "left"}}
    alternative = {**standard["countermeasures"], "resistance_min_per_day": 90, "aerobic_min_per_day": 45, "protein_g_per_kg": 1.6, "bisphosphonate": True}
    comparison = compare(injured, alternative, params)
    scenarios = {"No countermeasures (neutral assumed personal factors)": unprotected,
                 "Standard plan, no injury": forecast(standard, params), "Injury, current plan": comparison["baseline"],
                 "Injury, alternative plan": comparison["alternative"]}
    lines = ["# Model consistency report", "", f"Parameter set: {params['version']}", "",
             "This report checks internal consistency and provenance coverage. It is not independent scientific or clinical validation.", "",
             f"All {len(list(leaves(params)))} numeric JSON settings are classified with an explicit evidence status.", "",
             "Four daily rates now have a descriptive human-cohort fit. See calibration_report.json for endpoint residuals and the historical early-flight mismatch.", "",
             "| Scenario | Hip at landing | Spine at landing | Leg muscle at landing | Aerobic fitness at landing |",
             "| --- | ---: | ---: | ---: | ---: |"]
    for name, output in scenarios.items():
        ForecastResponse.model_validate(output)
        values = [output["series"][key][180] for key in ("hip_bmd_pct", "spine_bmd_pct", "leg_muscle_pct", "vo2max_pct")]
        lines.append(f"| {name} | " + " | ".join(f"{v:.2f}%" for v in values) + " |")
    lines += ["", "Published group means are used by scripts/calibrate.py. These additional scenarios are simulations, not measured outcomes or independent validation.",
              "Site-specific references do not validate the exercise response equation, daily trajectory or individual outcomes.",
              "Injury, recovery, routine dose-response and status cutoffs still need validation; personal multipliers are neutral.", ""]
    (ROOT / "docs/validation.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"PASS: provenance coverage, cohort-reference parameter coverage, {len(crew)} fictional profiles and four scenario shapes; report written to docs/validation.md")


if __name__ == "__main__":
    main()
