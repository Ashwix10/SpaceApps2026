# Scientific basis and limits
Reviewed 2026-11-15. Model 1.1-cohort-development; parameters 0.3-human-cohort-development.

## Intended use
AstroTwin is an educational simulation of ISS-associated changes and illustrative exercise scenarios. It does not predict an individual's health, fracture probability, injury recovery or clearance for spaceflight. Fictional profiles do not establish age, sex or fitness effects; those multipliers are now neutral.

## Human measurements used
English et al. (2020), NASA Sprint study, DOI [10.1038/s41526-020-00111-x](https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884/), Tables 1, 4 and 5. The nominal CON group includes 17 people, with mission duration 165 +/- 42 days (mean +/- SD). It used individualized ARED/T2/CEVIS exercise, not the app's simplified minute controls. Data are manually transcribed into data/research/sprint_control.json with table locations, measurement units, means, SEs and timing. Numeric transcription is unchanged; derived calculations are our adaptation. Article license: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The fit uses total hip and lumbar-spine DXA density, leg lean tissue by DXA, and mass-relative VO2peak. Leg lean tissue is a proxy for muscle, not isolated muscle mass or strength; the study's lean-mass time effect was not significant (P=0.40). The legacy JSON names leg_muscle_pct and vo2max_pct remain for compatibility.

## Reproducible method
Run `.venv\Scripts\python.exe scripts/calibrate.py` to verify committed rates and write docs/calibration_report.json. `--write` intentionally regenerates rates from the transcribed table values and current assumed effectiveness/recovery settings.

For each endpoint, observed fraction = postflight group mean / preflight group mean. This is not the mean paired individual change. Bone/lean tests at R+7 to R+14 are represented by R+11; cardio is R+3. Given assumed recovery half-life H, inferred landing fraction = 1 - (1 - observed fraction) * 2**(postflight day/H). Effective daily loss = 1 - landing_fraction**(1/165). The stored base rate divides this effective rate by (1 - assumed reference exercise effect).

The reference scenario uses 60 minutes strength plus 60 minutes cardio, protein 1.2 g/kg, full energy intake and no bone medication. This UI reference is an analyst convention, not a measurement of the cohort's precise dose. No treatment-effect coefficient is identified by this fit. A successful endpoint reconstruction is calibration consistency, not validation of the daily trajectory or exercise benefit.

## Research reviewed but not interchangeable

- [NASA bone-risk summary](https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/): generic monthly range; now historical context, not the active site-specific fit.
- [Scott et al. (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9898566/), DOI 10.1038/s41526-023-00256-5: 46-person cohort, 178 +/- 48 days, varied multisystem response. Its participants can overlap with Sprint, so it is not an independent holdout. Individual data require a NASA LSDA request; none were requested or imported.
- [Moore et al. (2014), NASA NTRS 20140003748](https://ntrs.nasa.gov/citations/20140003748): early-flight peak oxygen uptake in a different historical cohort. The model misses its day-15 decline; the mismatch is reported numerically in calibration_report.json. This is a challenge comparison, not a controlled estimate of model error on today's crews.
- [Trappe et al. (2009)](https://pubmed.ncbi.nlm.nih.gov/19150852/): calf MRI volume and muscle performance. These are different endpoints and an older exercise context; not substituted for total leg DXA lean tissue.
- [NASA muscle risk](https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/) and [exercise overview](https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/) provide context; they do not establish the app's dose-response, injury factors or recovery rates.
- [NASA fracture gap](https://humanresearchroadmap.nasa.gov/gaps/gap.aspx?i=557) does not validate our human injury healing factors. Injuries remain optional hypothetical examples.

## What remains assumed

Exercise effects, protein/calorie response, medication efficacy, injury multipliers, recovery half-lives, long-term floors, body-region mappings and display cutoffs are assumptions. data/evidence.json classifies every parameter path. Percentage curves begin at 100; shaded bands are sensitivity envelopes, not statistical confidence or personal prediction intervals. Reported study SEs are not reused as individual variation because paired covariance and raw measurements are unavailable.

The same rates apply to ISS, Moon and Mars. Gravity transitions, radiation, equipment failures, workload, fluid shifts and individual health are not modeled. Extrapolation to short missions or beyond a typical ISS stay is labeled. The 3D thickness and color index are illustrations, not measured anatomy. Status colors indicate modeled changes, not safety or fitness for duty.

## Evidence needed for stronger claims

Independent endpoint-matched human data, a validated time-course and exercise response, prospective checks, and user evaluation are still needed before personalized or operational use. A demonstration may be technically complete while these scientific limitations remain. No guaranteed competition score or clinical readiness follows from the current fit.
