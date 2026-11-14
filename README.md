# AstroTwin

A digital twin of an astronaut's body. It forecasts how bone, muscle and aerobic fitness decline in
microgravity, how an in-flight injury changes that, and how exercise, nutrition and medication plans change
the outcome, so a flight surgeon can compare plans before acting.

**[CONTRACT.md](CONTRACT.md) is the source of truth** for every shape, route, file path and name.

## Repo layout and owners

| Folder | Owner | What |
|---|---|---|
| `CONTRACT.md`, `README.md`, `.github/`, `api/` | Person 2 | Contract, CI, FastAPI server, deployment |
| `model/` | Person 1 | `astrotwin_model`: forecast, compare, load_params, schemas |
| `web/src/body/` | Person 3 | `BodyTwin` 3D body component |
| `web/` | Person 4 | Vite + React app |
| `explain/`, `data/`, `docs/` | Person 5 | Explanations, parameters, crew presets, docs |

Never edit a folder you do not own. Ask the owner.

## Running locally

Requires Python 3.11 and Node 20.19+ (or Node 22.12+). Run every command from the repo root.

The shared integration branch for this checkout is `default`. The existing hour-0 skeleton from `main` has been merged into it. `CONTRACT.md` is unchanged; its references to `main` describe the original plan.

### Windows quick check

In PowerShell, from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

This creates a virtual environment, installs dependencies, runs Python tests, builds the frontend, and starts a temporary API on port 18000 to check all seven routes. It stops that API afterward. Use `-SkipInstall` for subsequent checks when dependencies are already installed.

### Windows development

After installation, run these in two terminals:

```powershell
# Terminal 1, repo root
.\.venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8000

# Terminal 2, repo root
cd web
npm.cmd run dev
```

Open http://localhost:5173. API mode is the default. The top bar identifies the data source; select Mock mode explicitly to work without the backend. Model version `0.0-stub` returns flat lines at 100%, region health 1.0, and green risk scores. It verifies integration, not medical predictions.

### macOS / Linux

```bash
# 1. Python packages (a virtual environment is recommended)
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e model -e explain -r api/requirements.txt

# 2. API on http://localhost:8000  (OpenAPI docs at http://localhost:8000/docs)
uvicorn api.main:app --reload --port 8000

# 3. Web app on http://localhost:5173  (in a second terminal)
cd web && npm install && npm run dev
```

- Vite proxies `/api` to `http://localhost:8000`. In production, `VITE_API_URL` sets the API base URL.
- `VITE_USE_MOCKS=true` makes the web app use `src/mocks` instead of the API.
- `ASTROTWIN_DATA_DIR` overrides where the API reads `params.json`, `crew_presets.json` and `injuries.json`
  (default: `data/`).
- Regenerate the model fixture: `python model/scripts/make_fixture.py`

## Tests

```bash
pytest model api                    # what CI runs
cd web && npm install && npm run build
```

## Git workflow

Branches: `model`, `api`, `body`, `web`, `data`, and personal branches such as `aditya`. Target `default` for this integration. Person 2 merges after CI is green. If the team returns to `main`, update the workflow documentation consistently.

## API and deployment

- Every contract route is implemented, using shared Pydantic schemas. `/api/explain` falls back to a template on explanation-package errors.
- API smoke check against any running server: `python scripts/smoke.py http://localhost:8000` (or `bash scripts/smoke.sh`).
- Container: `docker build -f api/Dockerfile -t astrotwin-api .`, then `docker run --rm -p 8000:8000 astrotwin-api`. Build context must be the repo root.
- Render / Railway: use the Dockerfile, set `WEB_ORIGIN` to the exact deployed frontend origin. The API respects `PORT` (default 8000).
- Vercel: build from the repo root with `cd web && npm install && npm run build`, output `web/dist`. Keep files outside the web directory available because mock data imports use `data/`. Set `VITE_API_URL=https://your-api.example/api` and `VITE_USE_MOCKS=false`.
- After a successful npm install, commit `web/package-lock.json`; CI then switches automatically to `npm ci`.

## What is still a placeholder

The scientific model, cited parameter values, AI explanations and 3D body are intentionally replaceable stubs. The initial dashboard demonstrates the contract connection; Person 4 continues the full frontend and Person 3 supplies the body. No production deployment is included in this skeleton.
