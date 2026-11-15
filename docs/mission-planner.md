# Mission planner and routine search

The planner uses the existing forecast API and parameter set. It does not add physiological equations or calibrated probabilities to the browser.

## Destinations

ISS, Moon and Mars are the three destination labels in the model contract. The visual map is a selection control, not a trajectory, distance, transit-time or orbit calculation. Selecting a destination, dragging the spacecraft, or using its left/right arrow keys updates the same `mission.destination` value. The route follows the dragged spacecraft and draws into the selected endpoint after release.

An explicit destination change sets an editable scenario duration: ISS 180 days, Moon 30 days, Mars 210 days. Selecting the already active destination preserves a manual duration. Opening a saved flight or re-rendering settings never reapplies a default. The four mission preset buttons are ISS visit (14 days), ISS expedition (180 days), lunar visit (30 days), and Mars transit (210 days). Selecting a preset explicitly applies its destination and duration. Shortening a mission removes EVA days beyond landing and moves an out-of-range injury onset to landing.

These durations are interface scenario choices, not calculated transit times or NASA mission prescriptions. The expedition preset is consistent with NASA's description of [typical six-month ISS missions](https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/). NASA describes [a roughly seven-month robotic Mars journey](https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/); the 210-day preset is a rounded exploration scenario, not a validated human transfer design. The 14-day ISS visit and 30-day lunar visit are chosen short-duration scenarios, not claims about specific completed or scheduled missions.

All three labels use the same ISS-derived rates. Lunar and Martian surface gravity, radiation and gravity transitions are not modeled. Durations from 7 to 900 days are supported by the API; the source cohort represents approximately six-month ISS missions, so this input range is not an evidence-validated operating range.

## Crew and baseline inputs

The profile directory and mission settings use the existing age, sex, mass, fitness and four baseline measurements. No height, body-shape, BMI, medical-history or personal-risk multiplier has been added. Hip and spine measurements are DXA areal bone density (g/cm²); leg lean tissue is a DXA proxy (kg); cardio uses mass-relative VO₂peak (mL/kg/min) under the legacy `vo2max` wire key.

Percentage curves begin at 100. Absolute displays multiply the baseline by the modeled percentage. The active age, sex and fitness factors are neutral, and mass and baseline measurements do not independently change percentage curves. A changed baseline therefore scales the absolute display without establishing individualized prediction. Directory presets remain fictional scenario profiles. Flight-level edits are stored in the flight's existing request, rather than introducing new API fields.

## Injury scenarios

Ankle sprain, wrist fracture, lower-back strain and thigh tear are optional, explicit events. Each has onset day, severity and (where applicable) side. The planner does not estimate the probability of an injury occurring. Existing model assumptions control the local loss and healing illustration; these are not validated individual healing forecasts.

Leg injuries also increase modeled global leg-tissue loss while active. Back strain temporarily halves resistance effectiveness. Wrist injury changes the local arm index without changing the four global tissue series. Routine comparisons retain the same injury scenario; the optimizer does not prescribe rehabilitation or select a medically safe exercise dose.

An amber/coral ring identifies the injury site independently of the anatomy system colors. It appears only when injury is enabled and the current day falls within the model's active interval. The display mirrors the shipped parameter set's existing daily healing accumulation, including the change to Earth recovery speed after landing. The ring disappears when the model's active interval ends; that is not a medical recovery determination. The active label includes injury name and onset day. Forecast graphs mark the injury event's onset day even after its active interval has ended.

## How recommendations are calculated

`web/src/routineOptimizer.ts` builds a canonical search request from crew, mission and injury plus the explicit medication-scenario constraint. It replaces all incoming countermeasure fields with a fixed reference, so changing manual strength, cardio, protein, energy or medication controls cannot restart or alter the recommendation search. Objective and exercise-time budget are independent search settings. The same settings produce the same recommendation, regardless of the applied or test routine.

The search has two sequential stages, both evaluated by the forecast API:

1. Exercise: strength and cardio are sampled in 15-minute steps, with total minutes constrained by the chosen budget. Strength stops at 90 minutes and cardio at 60 minutes, the existing model's saturation points. This stage uses 1.6 g/kg/day protein and 100% energy intake and evaluates at most 35 routines.
2. Nutrition: at the winning exercise split, protein values 0.8, 1.2 and 1.6 g/kg/day are crossed with energy values 80%, 90% and 100%. One result already exists from the exercise stage, so this adds at most eight API calls. Total search size is at most 43 distinct forecasts.

This bounded approach follows the equations in `model/astrotwin_model/engine.py`: protein effects on leg lean tissue are non-decreasing until 1.6 g/kg/day; energy deficit increases bone and leg-tissue loss, and intake above 100% adds no modeled benefit. Exercise is first evaluated at nutrition values that cannot be worse in those equations, so a large exercise-by-nutrition cross-product would add no stronger candidate. Manual controls retain the full API ranges, including protein up to 2.0 and energy up to 110%, for scenario exploration.

Medication is never a searched treatment choice. It defaults to excluded and is fixed by the separate, explicit "Include bone medication scenario" setting. An enabled setting evaluates a hypothetical medication scenario; it does not establish a medical indication or prescribe treatment. All candidate forecasts retain crew, mission, EVA days and injury. There is no client-side replacement for the forecast service.

The selected objective is evaluated at landing:

| Objective | Ranking measure |
| --- | --- |
| All four measures | Unweighted mean of hip density, spine density, leg lean tissue and cardio percentages |
| Bone density | Mean of hip and spine percentages |
| Cardio | Cardio percentage |
| Leg lean tissue | Leg lean-tissue percentage |

Higher retained baseline percentage ranks first. Ties on a selected objective are resolved by all four landing outcomes, so a cardio tie cannot favor an energy deficit that worsens bone or leg outcomes. Remaining ties favor less exercise time, 100% energy intake, protein closest to the 1.2 g/kg reference and then lower strength duration. The all-measures average is an explicit UI ranking convention, not a validated composite health outcome or a clinical optimization target. The result is the best evaluated grid candidate for its selected objective and budget, rather than a continuous optimum or a clinical prescription.

The card displays all four landing outcomes as percentages of preflight baseline. Its larger scatter plot shows actual evaluated exercise and nutrition candidates, with the selected candidate outlined. The graph's average score is explained by the selected objective; it is not presented as a new health measurement. Protein grams per day are simply crew mass multiplied by the recommended grams per kilogram. This conversion does not introduce a mass-dependent physiological response.

Crew profiles can receive the same optimum by design: age, sex and fitness effects are neutral, and baseline measurements scale absolute displays without changing percentage curves. Duration, injury, objective, budget and medication constraint can affect the search. The card states that routine response uses shared ISS parameters.

The browser debounces canonical search changes for 450 ms, sends at most four forecast requests concurrently, caches identical requests for 60 seconds, and stops dispatching an obsolete search when its inputs change. Nutrition starts only after exercise evaluation completes. The previous complete result stays mounted under a loading overlay to preserve panel height; stale results cannot be applied. An error keeps the same panel space and offers a retry. Responses require the requested landing day, finite values for all four measures, and consistent model and parameter versions.

`RoutineOptimizer` can report completed recommendations to its parent. The flight's Recommended mode may apply a completed, current recommendation automatically; Manual override preserves user edits. Returning to Recommended re-delivers a valid existing result without rerunning the search. In the comparison workspace, "Use in test" changes only the test routine, and applying that test to the flight is a separate explicit action. Callback identity changes and manual routine edits do not restart the optimizer. Objective, budget and medication constraint can be controlled by the parent to preserve settings across navigation.

## Evidence and validation

See [Scientific basis and limits](science.md) for cohort measurements, assumptions, known mismatches and sources. The planner changes presentation and scenario selection only. The exercise effects being compared remain assumed model effects; the descriptive cohort fit does not identify them as causal treatment effects. Legacy risk fields remain heuristic change indicators, not fracture probability or operational readiness.

Frontend tests exercise canonical-input independence from manual sliders, identical candidate sequences across manual edits, exercise and nutrition bounds, explicit medication constraints, staged evaluation, ranking against supplied forecast responses, tie handling, concurrency, cancellation and invalid/mixed-version outputs. Model tests check the saturation and destination/profile invariances on which the UI depends.
