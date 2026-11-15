# Model consistency report

Parameter set: 0.4-dose-response

This report checks internal consistency and provenance coverage. It is not independent scientific or clinical validation.

All 51 numeric JSON settings are classified with an explicit evidence status.

Four daily rates now have a descriptive human-cohort fit. See calibration_report.json for endpoint residuals and the historical early-flight mismatch.

| Scenario | Hip at landing | Spine at landing | Leg muscle at landing | Aerobic fitness at landing |
| --- | ---: | ---: | ---: | ---: |
| No countermeasures (neutral assumed personal factors) | 94.49% | 96.54% | 97.74% | 87.72% |
| Standard plan, no injury | 96.66% | 97.91% | 99.03% | 93.66% |
| Injury, current plan | 96.66% | 97.91% | 98.95% | 93.66% |
| Injury, alternative plan | 98.55% | 99.10% | 99.11% | 92.85% |

Published group means are used by scripts/calibrate.py. These additional scenarios are simulations, not measured outcomes or independent validation.
Site-specific references do not validate the exercise response equation, daily trajectory or individual outcomes.
Injury, recovery, routine dose-response and status cutoffs still need validation; personal multipliers are neutral.
