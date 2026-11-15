# AstroTwin

A browser-based astronaut health research prototype. The interface is mostly black and white, with color reserved for meaningful changes. The React UI, Python engine, API, 3D body, comparison logic, timeline and source work are preserved from the earlier desktop version.

## Open the web app

From CMD in the repository folder:

```cmd
cd /d "C:\Users\adity\OneDrive\Documents\SpaceApps\SpaceApps2026"
npm start
```

Open **http://localhost:8000**. This command builds the UI and starts one Python service for both the page and /api. Press Ctrl+C to stop it. Close any previous server using port 8000 first; to use another port in CMD, run `set PORT=8001` before `npm start`.

No Electron window or new dependency installation is needed for an existing working checkout.

## First-time setup

Requires Python 3.11 and Node 20.19+ or a supported newer LTS. From the repository root:

```cmd
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -e model -e explain -r api/requirements.lock
npm --prefix web ci
npm start
```

Reuse an existing working .venv. ASTROTWIN_PYTHON can point to another Python executable. Root npm installation is unnecessary for the web runtime; root desktop dependencies are retained only for optional legacy builds.

## Workspace and navigation

AstroTwin opens on a flight-management workspace. Choose **New flight**, give it a name and assign an astronaut. Its setup, body view and routine comparison stay together as one saved record.

- **Workspace** (`#/`): create, search, open, rename, archive and restore flights.
- **Astronauts** (`#/astronauts`): browse the four fictional starter profiles, add a simulation profile, edit its name/role and open or create its linked flights.
- **Flight setup** (`#/mission`): edit the current flight's destination, duration, astronaut, routine and optional injury scenario.
- **Body view** (`#/explore`): the human reference model and mission-to-recovery timeline for the current flight.
- **Compare routines** (`#/compare`): a separately saved alternative routine for that flight, with optional detailed charts.
- **Research & sources** (`#/research`): original measurements, citations, model assumptions and asset attribution.

Flights, profiles and the selected flight save in this browser's local storage, including across a refresh. Use the same browser and origin/port to reopen them. This is local browser persistence, not cloud accounts or shared-client storage. If saved data cannot be read, it is preserved instead of silently overwritten; the app reports when changes can only last for the session.

New profiles copy a fictional research template; entering a name does not create a medically validated personal twin. Profile name/role edits update linked flight labels while preserving research settings. Archiving keeps a flight's inputs and comparison available for restoration.

The sidebar keeps workspace navigation separate from the current flight. Back/Forward and reduced-motion page transitions remain available. Required human assets and research summaries are bundled locally. The MakeHuman surface is a generic CC0 illustration, not a NASA scan. Sources and model limits remain explicit.

## Development

For hot reload, run these separately:

```cmd
.venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8000
npm run dev:web
```

Open http://localhost:5173. The body sandbox remains `?sandbox=body`.

`npm run build:web` builds for the same-origin server. For a separately hosted API, build web/ directly with VITE_API_URL set to the complete API base ending in /api, and configure WEB_ORIGIN on the API. No cloud deployment has been performed by this conversion.

## Checks and model notes

[CONTRACT.md](CONTRACT.md) records unchanged data interfaces and the browser startup. [VALIDATION.md](VALIDATION.md) records actual checks and limits. [docs/science.md](docs/science.md) classifies model assumptions; `.venv\Scripts\python.exe docs/validate.py` regenerates the consistency report.

The earlier full test/check scripts remain available. UI work is checked with a production build and focused browser interaction instead of repeatedly running every suite.

## Optional container delivery

```cmd
docker build -f api/Dockerfile -t astrotwin .
docker run --rm -p 8000:8000 astrotwin
```

The multi-stage recipe builds the renderer and serves UI/API together. The recipe is prepared for deployment, but its Docker build could not be run locally because the Docker engine is unavailable. No public deployment has been performed. See docs/RELEASE.md.

## Earlier desktop work

The desktop/ folder, optional `npm run start:desktop` and installer recipes are preserved. They are no longer part of normal browser startup. The shared integration branch remains default.

## Reproduce the research fit

```cmd
.venv\Scripts\python.exe scripts/calibrate.py
.venv\Scripts\python.exe docs/validate.py
```

The study transcription is in data/research/sprint_control.json. The generated report distinguishes fitting its source endpoints from a separate historical challenge that the daily curve does not reproduce. See docs/science.md for the full method and limitations. Four source endpoints fitting to rounding does not imply prediction accuracy.
