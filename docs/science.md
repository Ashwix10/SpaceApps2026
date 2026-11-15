# Science and model assumptions

Reviewed: 2026-11-14. Parameter set: 0.2-bone-anchored-development.

Only the generic bone anchor is numerically grounded in a published range. A 1.25% loss per 30 days is our chosen midpoint, not a measured hip or spine rate. The daily conversion is `1 - (1 - 0.0125) ** (1 / 30)` = 0.00041920484931. Both bone sites share this rate until suitable site-specific data are fitted.

## Parameter provenance

The table classifies every numeric setting by a complete path or path prefix. Values remain in data/params.json; data/evidence.json stores provenance without changing the API contract. A source listed next to an assumption provides context, not validation of that number.

| Parameter or prefix | Current value(s) | Classification | Note | Sources |
| --- | --- | --- | --- | --- |
| daily_loss.hip_bmd | `0.00041920484931` | derived assumption | Uses the chosen 1.25% midpoint of a broad published range, converted to a compounded daily rate; not a measured hip-specific coefficient. | nasa_bone |
| daily_loss.spine_bmd | `0.00041920484931` | derived assumption | Uses the same generic anchor as hip bone because separate site-specific calibration is unavailable. | nasa_bone |
| daily_loss.leg_muscle | `0.0015` | development assumption | Illustrative loss curve; muscle mass is not interchangeable with strength or operational performance. | nasa_muscle |
| daily_loss.vo2max | `0.002` | development assumption | A fixed exponential rate has not been fitted to astronaut aerobic measurements. | nasa_exercise |
| loss_floor_pct | `{"hip_bmd": 80, "spine_bmd": 82, "leg_muscle": 65, "vo2max": 70}` | development assumption | Simulation floors prevent indefinite decay; they are not established physiological lower bounds. | None; development assumption |
| countermeasure_max_effect | `{"resistance": 0.6, "aerobic": 0.5, "protein": 0.1, "bisphosphonate": 0.5}` | development assumption | Related evidence supports studying countermeasures, but does not validate these exact efficacy fractions or our way of combining them. | nasa_exercise |
| injury | `{"ankle_sprain": {"extra_local_loss": 2.0, "healing_days": [10, 21, 42], "microgravity_slowdown": 1.3}, "thigh_muscle_tear": {"extra_local_loss": 2.5, "healing_days": [14, 28, 56], "microgravity_slowdown": 1.3}, "wrist_fracture": {"extra_local_loss": 1.5, "healing_days": [28, 42, 70], "microgravity_slowdown": 1.4}, "lower_back_strain": {"extra_local_loss": 1.5, "healing_days": [7, 21, 42], "microgravity_slowdown": 1.2}}` | development assumption | All severity durations, local loss multipliers and microgravity slowdowns are hypothetical scenario settings, not validated return-to-duty estimates. | nasa_fracture |
| recovery_half_life_days | `{"hip_bmd": 180, "spine_bmd": 180, "leg_muscle": 30, "vo2max": 14}` | development assumption | Exponential recovery is illustrative. Recovery depends on the person, tissue and rehabilitation; these half-lives are not fitted. | nasa_exercise |
| person_factors | `{"age_per_decade_over_40": 0.08, "fitness": {"low": 1.15, "average": 1.0, "high": 0.9}, "sex": {"F": 1.05, "M": 1.0}}` | development assumption | These illustrative modifiers do not establish individual susceptibility or demographic differences. All crew presets and baselines are fictional. | None; development assumption |
| uncertainty_pct | `0.2` | development assumption | Sensitivity envelopes around the scenario, not statistical confidence intervals. | None; development assumption |
| risk_thresholds | `{"fracture": {"yellow": 94, "red": 90}, "eva_fitness": {"yellow": 90, "red": 82}, "landing_fitness": {"yellow": 88, "red": 80}}` | development assumption | Heuristic display cutoffs, not NASA operational standards, calibrated probabilities, or clearance for medication, EVA or landing. | nasa_exercise |

## Interpretation limits

- Only the generic bone base-rate anchor is tied numerically to a published range. Other coefficients remain assumptions.
- A midpoint within a reported range is an analyst choice, not a new observation or independent validation.
- Matching a range used to choose a parameter is a consistency check; it does not establish prediction accuracy.
- The same rates currently apply to ISS, Moon and Mars. Forecasts beyond the cited four-to-six-month context are extrapolations.
- The regional body colors, injury-day dip and thickness changes are illustrative mappings, not anatomical measurements.
- Absolute preflight baselines are displayed, but most predictions are percentages adjusted by assumed personal factors.
- No astronaut-level dataset, clinical outcomes, medical-device validation or independent held-out validation is included.

## Fictional profiles

All four crew names, demographic combinations and absolute baseline measurements are synthetic demo inputs. They are not astronaut records, population norms or evidence of demographic differences. Percent forecasts currently use the model's assumed personal factors rather than a fitted relationship to measured baselines.

## References

- nasa_bone: [NASA: Risk of Spaceflight-Induced Bone Changes](https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/)
- nasa_muscle: [NASA: Muscle Risk](https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/)
- nasa_exercise: [NASA: OCHMO-TB-031 Exercise Overview](https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/)
- nasa_fracture: [NASA Human Research Roadmap: Fracture 1](https://humanresearchroadmap.nasa.gov/gaps/gap.aspx?i=557)

## Reproduce the checks

Run `python docs/validate.py` from the repo root. It writes docs/validation.md with provenance coverage, anchor arithmetic and standard/no-exercise/injury comparisons. There is no held-out dataset, so passing these checks is not a claim of forecast accuracy.

## Still-unverified equations

The 85% combined-effect cap, half-rate arm curve, calorie multiplier, regional health mapping, severity dip and risk-score scaling are development conventions in model/astrotwin_model/engine.py, not sourced physiological laws. See model/README.md for the full formula list.
