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

Requires Python 3.11 and Node 20. Run every command from the repo root.

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
cd web && npm ci && npm run build   # CI also runs this once web/package.json exists
```

## Git workflow

Branches: `model`, `api`, `body`, `web`, `data`. Work on your branch and open small pull requests into
`main`. Person 2 merges after CI is green. `main` must always run.
