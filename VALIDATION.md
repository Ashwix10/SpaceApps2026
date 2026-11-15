# Validation status

Current as of 2026-11-15 · model 1.2-dose-response · parameters 0.4-dose-response.
Earlier milestone notes are kept in [docs/validation-history.md](docs/validation-history.md).

## What the model is checked against

| Check | Source | Result |
|---|---|---|
| Hip, spine, leg lean tissue and VO2peak decline | NASA Sprint study, 17 ISS astronauts, 165-day missions (English et al. 2020, CC BY) | All four group averages reproduced to rounding (`scripts/calibrate.py`) |
| Stronger resistance exercise protects hip bone | Smith et al. 2012, ARED vs iRED crews (abstract) | Direction matches |
| Adding a bisphosphonate gives further protection | LeBlanc et al. 2013, via the open review by Rosenthal et al. 2024 (CC BY) | Direction matches |
| Early-flight VO2peak (day 15) | Moore et al. 2014, NASA NTRS 20140003748, different cohort | **Missed.** The smooth model does not reproduce early adaptation. Reported in `docs/calibration_report.json` and shown on the chart |

Fitting four group averages is calibration, not independent validation of individual predictions.

## Automated checks (all passing)

| Command | Covers |
|---|---|
| `pytest model api` | 41 tests: model shapes and behaviour, every API route, 422 errors, explain fallback, and dose-response checks (every extra 30 minutes of exercise improves every measure; no flat plateaus) |
| `python scripts/calibrate.py` | Sprint fit, countermeasure direction checks, Moore comparison |
| `python docs/validate.py` | Every numeric parameter has an evidence status; scenario shapes; writes `docs/validation.md` |
| `npm --prefix web test` | 8 frontend contract and workspace tests |
| `npm run build:web` | TypeScript check and production build |
| `python scripts/smoke.py <url>` | All seven API routes against a running server |

## Still assumed (not validated)

- **Dose-response shape**: exercise benefit follows a diminishing-returns curve (`dose_saturation_min`), tuned so the 60-minute reference effect, and therefore the NASA calibration, is unchanged.
- **Effect sizes** of exercise minutes, protein, calories and bisphosphonate. Only their direction is checked; the per-site tables of Smith 2012 and LeBlanc 2013 are paywalled.
- **Injury** loss and healing factors.
- **Recovery half-lives**, loss floors and risk-colour cutoffs.
- **Moon and Mars**: they use the ISS rates; partial gravity is not modelled.
- **Individual differences**: age, sex and fitness factors are neutral. Fitting them needs individual records from NASA's Life Sciences Data Archive.

## Not yet done

- No public deployment. The Dockerfile and `render.yaml` are ready, but the container hasn't been built on a machine with a running Docker engine.
- No user testing with flight surgeons.
