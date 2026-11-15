# AstroTwin build plan
Version 6.0 · 2026-11-15 · Browser app, simple interface, evidence first

## Product

Help people understand how a space mission can affect bone, muscle and fitness, and explore the difference a daily exercise routine might make. Keep the human body and mission timeline central. This is a research and education prototype with fictional crew, not a clinical prediction tool.

All development is consolidated in this workspace. Earlier five-person ownership rules and Windows-installer milestones are superseded. CONTRACT.md defines the API and shared types; do not duplicate it inside this plan. The browser app is the primary deliverable. Legacy desktop code is optional.

## Product experience: a flight-management app

The browser app opens on a workspace, not a promotional landing page. Keep the persistent sidebar and restrained black/white/gray styling. Workspace-level navigation contains saved flights, astronaut profiles and research. Selecting a flight adds its setup, body and comparison views to the sidebar.

- **Workspace:** name/create flights, search records, open and rename them, archive and restore them.
- **Astronauts:** browse/add/edit simulation profiles, view linked flights and start a flight for the selected person.
- **Selected flight:** retain its own astronaut, mission, routine, optional injury and alternative routine. Never reuse one flight's settings for another record.
- **Persistence:** save the versioned workspace on this browser and restore it after reload. Make browser-only storage clear; do not imply shared cloud accounts. Preserve unreadable saved data and report failed writes.
- **Scientific boundary:** profile creation clones fictional template values. Names and roles do not establish personal physiological predictions. Preserve all NASA sources, numerical assumptions and model limitations.

The local MakeHuman reference, timeline, three routine choices and research data are retained. Keep charts and numerical settings collapsed by default. Use normal browser history and reduced-motion transitions. No extra dashboard features are required for this management workflow.

## Implemented foundation

- Browser launch: `npm start` builds React and serves the UI and Python API together at http://localhost:8000.
- Day-by-day simulation, fictional crew, injury scenarios, recovery, comparison, timeline and offline explanations.
- Locally packaged MakeHuman human reference with selection, health coloring, rotation, comparison and a keyboard-accessible 2D fallback.
- Saved workspace, astronaut directory and flight-specific setup/body/comparison views with restrained transitions.
- Per-parameter provenance, explicit model limitations and four endpoint rates referenced to a published NASA human study.
- Published NASA aggregate observations stored with units/context/links in `data/nasa_observations.json` and displayed in Sources.
- Simplified exercise choices and comparison that preserves food/medication when first opened.

## Scientific status

Four rates now have a descriptive fit to NASA Sprint CON group means: total hip density, lumbar-spine density, leg lean tissue (a proxy, not strength) and relative peak oxygen uptake. Actual postflight measurement windows are retained through an explicitly assumed recovery correction. Nominal group size is 17 and mean flight duration is 165 days.

The fit reproduces its source endpoints; it is not independent validation. A separate historical early-flight cardio result is not reproduced and is documented. Age/sex/fitness multipliers are neutral. Exercise dose-response, recovery, injury curves, body mapping, sensitivity ranges and status cutoffs remain assumptions. Moon/Mars are labeled extrapolations. See docs/science.md and docs/calibration_report.json.

## Completion against the five remaining steps

1. **Human evidence: implemented.** Public cohort table transcription includes units, sample context, SEs, timing, DOI and source location. Individual astronaut records are not included. Other endpoint types and overlapping cohorts were reviewed rather than pooled indiscriminately.
2. **Comparable-outcome fit: implemented for the educational model.** Four rates reference matching measurements. Reproduction script and challenge report are included. Stronger personal-prediction claims remain blocked by missing independent validation; no code change can replace that evidence.
3. **Simple comparison: implemented.** One sentence identifies the largest landing difference and flags opposite-direction changes. Charts stay in details, and points refer to the scale where preflight is 100.
4. **Usability remodel: implemented, verification recorded in VALIDATION.md.** Human 2D outline, keyboard selection, page heading focus, reduced-motion transitions, explicit scope, lazy chart/body loading and retry without silently resetting edited inputs. User-study evidence remains future work.
5. **Browser delivery: locally functional; hosting prepared.** Same-origin launcher and release instructions are supplied. A Docker/Render recipe is ready for a chosen host. Container and hosted acceptance remain unverified because the local Docker engine is unavailable and no public service has been created. See docs/RELEASE.md.

## What is actually left

For a publicly shareable educational demo: verify the container on a working Docker host, publish it, and run the release flow against its HTTPS URL. For higher scientific confidence: obtain independent endpoint-matched human data and user comprehension feedback. A competition score or clinical readiness cannot be guaranteed. Do not add more dashboard features to compensate for missing evidence.

## Completion requirements for each step

- Preserve existing JSON shapes and snake_case fields.
- Keep source findings, chosen assumptions and generated forecasts distinguishable.
- Use relevant focused checks. For presentation-only changes, run the production build and one targeted browser check; do not repeat the full suite without a reason.
- For model changes, check the changed scientific relationship and update provenance/fixtures as needed. Report the limits of any validation.
- Record what changed, the source and the remaining uncertainty. A passing build is not proof of scientific accuracy.

## Local workflow (Windows CMD)

```cmd
cd /d "C:\Users\adity\OneDrive\Documents\SpaceApps\SpaceApps2026"
npm start
```

Reuse the working virtual environment. If installing from a fresh checkout, follow README.md for Python and frontend dependencies. For a quick build check, run `npm run build:web`.
