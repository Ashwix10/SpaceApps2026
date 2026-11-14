# Development forecast engine

This implements the build plan's deterministic equations using the existing parameter file. The rates, recovery times, injury multipliers, personal factors and risk thresholds are still **uncited development estimates**. They have not been calibrated or clinically validated. A working calculation is not a validated health prediction.

- All percentage curves start at the person's own preflight baseline of 100, with one sample per day through landing plus 90 days.
- Flight intervals end on days 1 through landing; the first recovery interval ends on landing plus 1.
- Each flight day multiplies a tissue by one minus its adjusted loss rate, stopping at its configured floor.
- Exercise, nutrition and medication reduce specified rates through independent combined effects, capped at 85% effectiveness.
- Low calorie intake increases bone and muscle loss; additional calories above 100% do not confer an invented benefit.
- The plan's age, fitness and sex multipliers scale the base loss rate; absolute preflight measurements are preserved in the request but do not independently alter these percentage curves.
- Active leg injuries increase global leg-muscle disuse and add a side-specific local penalty; wrist injuries affect their own arm without changing global tissue series.
- Active lower-back strain halves resistance effectiveness while healing.
- A local injured curve loses faster than its corresponding normal region, with an immediate severity-dependent health dip; both additional effects fade back to the normal region curve during healing.
- Healing advances more slowly during flight and returns to the configured Earth rate after landing, even if the injury spans landing.
- Postflight recovery closes half the remaining baseline deficit in each configured half-life.
- Region health maps a 40-percentage-point tissue deficit to the full zero-to-one health scale; head/neck remains at baseline by design.
- The four uncertainty envelopes use the configured fraction of estimated loss and are illustrative sensitivity ranges, not statistical confidence intervals.
- Fracture flags use the lowest bone series at landing; EVA flags use the lowest muscle/fitness series at the earliest scheduled EVA (landing if absent); landing flags use the lowest muscle/fitness series at landing.
- Risk scores and color cutoffs are heuristic simulation flags, not calibrated probabilities of fracture or failed landing.
- Destination is currently a scenario label: there is no invented Moon/Mars gravity modifier in the parameter contract.

Implementation uses Python's standard library; no NumPy dependency is needed for the bounded maximum of 991 days. Tests check the latency budget as well as the equations and boundary cases.

Run `python -m pytest model api explain` from the root. Regenerate the demo fixture with `python model/scripts/make_fixture.py` after model/parameter changes.
