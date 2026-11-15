# AstroTwin

**A digital twin of an astronaut's body that a flight surgeon can test plans on before acting.**

An astronaut sprains an ankle on day 40 of a 180-day mission. Bone and muscle are already declining in microgravity, and the injury adds to it. Will they be fit for the day-120 spacewalk, and for landing? AstroTwin forecasts hip and spine bone density, leg lean tissue and aerobic fitness day by day through landing and 90 days of recovery. You can compare two countermeasure plans (exercise, protein, calories, bone medication) side by side on a 3D body.

Commercial stations, private astronauts and Artemis crews will bring more people, older and less-trained flyers, and longer communication delays. Health planning has to become personal and predictive.

## How it uses NASA data

- **Calibrated:** the four loss rates are fitted to the NASA Sprint study (English et al. 2020: 17 ISS astronauts, 165-day missions). `scripts/calibrate.py` reproduces all four published group averages.
- **On every chart:** the measured NASA averages appear as white diamonds with error bars on the forecast curves. A separate NASA early-flight result (Moore 2014) is shown in orange, including where the model misses it.
- **Countermeasure checks:** the model ranks plans the same way NASA crews did. Crews using the ARED resistance machine kept hip bone better (Smith 2012), and adding a bisphosphonate protected it further (LeBlanc 2013).
- **Honest about gaps:** every parameter is labelled measured or assumed in `data/evidence.json` and on the in-app Research page. See [VALIDATION.md](VALIDATION.md) and [docs/science.md](docs/science.md).

## How it differs from earlier work

NASA's Digital Astronaut Project and related research built physiology models for scientists. AstroTwin puts that kind of model into a decision tool for the person who has to choose. It combines three things in one view: the in-flight injury, a side-by-side comparison of two plans, and a body you can scrub through the mission. Every curve is checked against published NASA astronaut data.

It is a research prototype calibrated to group averages, not a certified medical device or a personal prediction.

## Quick start (fresh clone)

Requires Python 3.11+ and Node 20.19+. Run these from the repository root.

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -e model -e explain -r api/requirements.txt   # Windows
# .venv/bin/python -m pip install -e model -e explain -r api/requirements.txt       # macOS / Linux
npm --prefix web ci
npm start
```

Open **http://localhost:8000**. `npm start` builds the UI and runs one Python server for both the page and `/api`. Press Ctrl+C to stop it. To use another port, set `PORT` first (Windows CMD: `set PORT=8001`). `ASTROTWIN_PYTHON` can point to a different Python executable.

This is a built React app, so opening `index.html` directly or using VS Code's Live Server shows a blank page. Always use `npm start`, or the development setup below. To view the app inside VS Code, run `npm start`, then open **Simple Browser: Show** from the Command Palette and enter `http://localhost:8000`.

`api/requirements.lock` pins the exact versions the checks were run with.

## Workspace and navigation

AstroTwin opens on a flight-management workspace. Choose **New flight**, give it a name and assign an astronaut. Its setup, body view and routine comparison stay together as one saved record.

- **Workspace** (`#/`): create, search, open, rename, archive and restore flights.
- **Astronauts** (`#/astronauts`): browse the four fictional starter profiles, add a simulation profile, edit its name/role and open or create its linked flights.
- **Flight setup** (`#/mission`): edit the current flight's destination, duration, astronaut, routine and optional injury scenario.
- **Body view** (`#/explore`): the human reference model and mission-to-recovery timeline for the current flight.
- **Compare routines** (`#/compare`): a separately saved alternative routine for that flight, with charts that plot NASA astronaut measurements against both plans.
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

The desktop/ folder, optional `npm run start:desktop` and installer recipes are preserved. They are no longer part of normal browser startup. The team's integration branch is `default`.

## Reproduce the research fit

```cmd
.venv\Scripts\python.exe scripts/calibrate.py
.venv\Scripts\python.exe docs/validate.py
```

The study transcription is in data/research/sprint_control.json. The generated report distinguishes fitting its source endpoints from a separate historical challenge that the daily curve does not reproduce. See docs/science.md for the full method and limitations. Four source endpoints fitting to rounding does not imply prediction accuracy.
