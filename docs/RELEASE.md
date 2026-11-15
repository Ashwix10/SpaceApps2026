# Browser release notes
2026-11-15 · Educational prototype · Model 1.1-cohort-development

## Scope
The app is functional locally: mission editing, simple exercise comparisons, timeline, recovery illustration, local MakeHuman 3D/keyboard-accessible 2D views, explanations and linked research. Four endpoint rates have a reproducible descriptive fit to published human data. This is suitable for an educational demonstration with its stated limits, not a personalized medical or flight-operations tool.

## Start
From the repository root, run `npm start` and open http://localhost:8000. Existing users can reuse their working virtual environment and frontend dependencies. Fresh setup is in README.md; api/requirements.lock records the exact Python environment used for local checks. Restart after source changes or use the two-terminal hot-reload workflow in README.md.

## Prepared hosting route
The Dockerfile builds React and serves UI plus API from one origin. `render.yaml` supplies an optional Render Blueprint using that Dockerfile and /api/health. No database, keys or third-party inference service is required. Source summaries are included locally; opening external research links requires internet.

Before publishing:
1. Build the container on a host with a working Docker engine: `docker build -f api/Dockerfile -t astrotwin .`.
2. Run `docker run --rm -p 8000:8000 astrotwin`, open the page and run `python scripts/smoke.py http://127.0.0.1:8000`.
3. Deploy the same artifact to the chosen host, check HTTPS /api/health, and complete one comparison in a clean browser.
4. Retain the educational scope notice and source panel. Do not advertise a personal health predictor or guaranteed competition score.

The local Docker executable was found, but its engine was unavailable; container construction and a clean-host installation have not been verified. No public service was created or deployed. The optional hosting manifest is prepared, not a live URL.

## Scientific acceptance
`python scripts/calibrate.py` verifies source-based endpoint reconstruction and reports a separate early-flight mismatch. `python docs/validate.py` verifies provenance coverage and scenario shapes. Neither establishes independent prediction accuracy. Published study means, chosen assumptions and simulations are explicitly separated.

## Remaining real-world evidence
A prospective user evaluation, independent human prediction validation and clinical/operational review have not occurred. For the current educational purpose, further iterations should improve comprehension and evidence quality rather than add controls. Scientific limitations cannot be completed through code alone.


## Remodeled interface

The initial URL opens an introduction. Mission, Explore, Compare and Research each have their own hash URL, page layout and navigation. This is a browser UI remodel; it does not add clinical validation or change the calibrated parameter file. Full reload restores the default scenario, while page navigation preserves the working mission. Before hosting, check that /models/human-reference.glb is included with the built static files.


## Workspace management update

The initial route now opens saved flight management and a profile directory. Versioned local browser storage restores flights, comparisons, profiles and selection across reloads. This supersedes earlier reload-reset notes. Storage is per browser origin and port; the interface does not claim account synchronization or shared clinical records. Native modal forms support creating/renaming flights and creating/editing simulation profiles. Archiving is reversible.
