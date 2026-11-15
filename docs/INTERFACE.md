# Interface and presentation notes

## Navigation and visual language

The application uses a large orbital workspace, compact icon navigation, searchable crew selection, direct manipulation of the flight route, anatomical selection, measured endpoint charts and a proportional mission timeline. Labels name the object or action. Marketing slogans, numbered page introductions, decorative status badges, account placeholders and repetitive explanatory footers have been removed.

The visual hierarchy is built around the spacecraft, people and measurements, with a smaller Earth and distant planets behind the flight workspace. It uses one sans-serif type family, restrained heading sizes, cyan for active interaction, amber and violet for bone regions, cyan for lean tissue and coral for cardio. Color is paired with labels or geometry. There are no animated ping indicators or changing hover glow effects.

Animations reveal navigation changes, show loading, move the spacecraft along the route and connect body selection to measurements. Decorative space layers are static; the planet's motion uses transforms. Reduced-motion preferences are respected. The interface does not add artificial network delays for a loading effect.

The design research informed progressive disclosure, meaningful motion and recognizable controls:

- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [Nielsen Norman Group: Icon Usability](https://www.nngroup.com/articles/icon-usability/)
- [Nielsen Norman Group: The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/)

These are usability principles, not a reliable test of whether an interface was made by AI. The requested icon-first navigation uses hover and focus tooltips on desktop, accessible names, and short visible labels on mobile. Essential measurements retain their names and units.

## Measurements and model boundaries

Actual study measurements are shown only in Research. Forecasts are the outputs of the existing educational model. There are no invented additional cohorts, individual astronaut records, study endpoints or calibrated injury probabilities.

Body measurements convert a normalized forecast to the profile's supplied baseline: displayed value = baseline × forecast percentage / 100. The associated change is relative to that baseline. Hip and spine density use g/cm², leg lean mass uses kg, and VO₂peak uses mL/kg/min. The API retains its historical vo2max field name. Regional animation indices are not interchangeable with measured tissue quantities.

The three model flags are heuristic thresholds. They are displayed as indicators rather than percentages of injury probability. EVA indicators refer to the earliest scheduled EVA, or landing when none is scheduled. Their source and threshold behavior remain in the model documentation.

ISS, Moon and Mars are the destinations supported by the current API. They share the existing spaceflight rate model. Changing the destination does not introduce a gravity-specific physiological calculation. The scene is illustrative; it does not calculate trajectories or represent exact orbital scale.

Age, sex, mass and fitness can be recorded, but the current percentage curves are not individualized by those fields. Baseline values affect the displayed physical units, not the percentage-rate model. No unimplemented body-fat or stature model is implied by the interface.

Injuries are user-selected scenarios with deterministic effects. The application does not infer likely injuries for a person. Their markers appear only after onset and before the existing model's healing interval completes. Anatomy colors indicate tissue systems, not injury. The optimizer searches bounded exercise and nutrition settings in the existing model while keeping medication as a separate explicit scenario constraint; it is not a clinical prescription. See [the routine optimizer documentation](mission-planner.md) for objective, candidate resolution and saturation limits.

## Routine workflow

New flights use Recommended mode. A completed search applies its result to that flight before simulation becomes available. A stored input signature prevents changed mission settings from being simulated as an up-to-date recommendation before the new search finishes. Manual override switches to editable settings without changing the independent recommendation search. Older flights retain their existing settings as manual overrides. Time budget, objective and the recommendation's medication scenario are saved per flight.

The comparison page distinguishes Applied to flight from Test routine. Editing a test routine or its search preferences changes only the comparison until Apply test to flight is selected. Test-search preferences are stored separately so navigating back to Recommended mode cannot silently apply them. Reset test copies the applied settings into the test. Individual landing outcomes carry the information; the aggregate score is used only to rank candidates and label its comparison plot.

Changing manual strength, cardio, protein, energy or medication does not restart the recommendation search. Changes to mission inputs or search constraints do. Existing results keep their space while a new search runs, and stale results cannot be applied. Nutrition controls remain visible beside the exercise controls.

Destination presets supply scenario durations that can be edited. They are not calculated transit times. The four presets map to the three existing model destination labels.

## Profiles and persistence

Starter profiles and portrait illustrations are fictional. New profiles inherit baseline values from a selected template until edited. Flights keep their own copy of the profile measurements. Later profile edits update linked labels and inherited measurements. Explicit flight-specific measurement overrides are recorded and preserved, even if a profile later converges on the same value.

The workspace persists in browser storage at the same origin. There are no user accounts, remote database or shared workspace. Routine storage notices have been removed from the product interface. A real persistence failure is still reported so the user can avoid losing work.

## Sources and assets

The study sources, fitted endpoints, model assumptions and validation limits are documented in [science.md](science.md), [calibration_report.json](calibration_report.json), [../model/README.md](../model/README.md) and the bundled research data. NASA sources are cited where the related measurements can be inspected.

The human reference mesh is adapted from MakeHuman's CC0 base mesh. It is not a NASA astronaut scan or a clinical reconstruction. Generated portraits and planet artwork are presentation assets, not research observations. Their appearance does not change the dataset or model outputs.
