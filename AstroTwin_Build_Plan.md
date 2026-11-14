# AstroTwin: Desktop App Build Plan
Version 2.0 — Windows desktop transition — November 14, 2026

NASA Space Apps project. Five people, one shared repository. This replaces the website-first build plan. The science/product requirements remain; the main deliverable is now an installable Windows x64 application.

## 0. Instructions for every team member and coding assistant

1. Ask which person (1–5) the user is if they have not said. Work only in that person's owned folders unless the user explicitly authorizes broader integration work.
2. Read the repository's CONTRACT.md first. Its current version wins over this plan's embedded snapshot. This revision uses contract 1.1.
3. Inspect existing files and tests before coding. The skeleton already exists: extend it rather than starting a second app or recreating packages.
4. Keep the JSON shapes, snake_case names, model/explain interfaces, region IDs and BodyTwin props intact. Desktop packaging does not require an API rewrite.
5. Work in reviewable steps, run relevant checks, and report what passed and what could not be tested. Never call a packaged release complete based only on source tests.
6. Merge small PRs into **default**, the shared integration branch. Person 2 owns integration, root configuration and contract updates.
7. This is a research prototype built from fictional crew profiles and published averages. Do not claim clinical validation or invent science values to make a demo look better.

### What changed from the website plan

| Before | Now |
| --- | --- |
| Hosted frontend and cloud API are the primary deliverable | Installed Electron app with bundled React UI and Python backend |
| User opens a URL and relies on deployed services | User opens AstroTwin from the Windows shortcut |
| Backend usually started separately | Electron starts one local backend, waits for health, then opens the UI |
| Fixed developer API port | OS-assigned loopback port; renderer uses same-origin /api |
| Online fonts/assets could be loaded at runtime | All required UI/body assets are local |
| Final deployment means a Vercel/Render link | Final release means tested installer and offline demo |
| main was the planned integration branch | default is the actual shared integration branch |
| Automatic mock fallback was suggested | Mock mode must be explicit and visibly labeled |

The website workflow stays available for frontend iteration and an optional browser demo. There is one React UI and one Python model, not separate implementations.

## 1. Product and architecture

AstroTwin forecasts day-by-day bone, muscle and aerobic-fitness changes during a mission, the effect of an in-flight injury, and the difference between countermeasure plans. The UI centers on the hologram body, timeline, risk cards and before/after comparison from the PRD. Windows is the first shipping target; a phone/tablet app is outside this transition.

### Launch and close

1. User opens AstroTwin.
2. Electron's main process launches the bundled Python executable (the project venv during development).
3. Python binds only to 127.0.0.1 on a free port and announces that port.
4. Electron checks authenticated /api/health, then loads the compiled UI from that same local origin.
5. React calls the unchanged /api endpoints; Python calls the existing model and explanation package.
6. Closing the application stops its own child backend. If Electron crashes, closing the parent pipe stops the backend too.

The local host requires a random per-launch session header. Electron inserts it; React never handles the secret. The UI has no Node or filesystem privileges. External renderer navigation and popups are blocked.

### Offline boundary

Core forecasts, parameters, crew presets, charts, local body assets, comparisons and template explanations must work without internet. Optional AI explanations can use a runtime-configured key and must fall back within the contract timeout. Never ship API keys in an installer. Offline operation is a capability of the software prototype, not a claim that its model is clinically ready.

## 2. Team ownership

| Person | Role | Owns | Next handoff |
| --- | --- | --- | --- |
| 1 | Model engineer | model/ and generated data/fixtures/forecast_example.json | Real model with the existing interfaces and a new fixture |
| 2 | Backend, desktop and integration lead | api/, desktop/, scripts/, repo root, CI, CONTRACT.md, this plan | Local app lifecycle, frozen backend, Windows installer and merge checks |
| 3 | 3D body developer | web/src/body/ | Offline BodyTwin, sandbox and WebGL fallback |
| 4 | Frontend/dashboard developer (Aditya) | web/ except web/src/body/ | Complete mission-control dashboard inside the desktop window |
| 5 | Data, science and AI lead | data/, explain/, docs/ | Cited parameters, validation, offline templates and pitch |

The existing kickoff placeholder in web/src/body/ is handed to Person 3. Person 4 does not keep modifying that folder. Person 2 reviews new desktop dependencies; Person 4 reviews new renderer dependencies.

### Repository additions

- Root package.json: desktop launch, tests and Windows build commands.
- desktop/main.cjs: Electron window and lifecycle.
- desktop/launcher.cjs: backend process management and readiness.
- desktop/backend.py: local UI/API host and parent-watchdog.
- desktop/backend.spec: PyInstaller one-folder recipe.
- desktop/requirements-build.txt: build-only Python tooling.
- desktop/tests/: process/authentication lifecycle tests.
- desktop/smoke.cjs: source or frozen-backend integration checks.
- .github/workflows/desktop-release.yml: manual Windows installer build.

Keep release/, .backend-dist/, .backend-build/, node_modules/, .venv/, caches and secrets out of commits. Commit both package-lock.json files after successful installation.

## 3. Continue from the current skeleton

### 3.1 Status and boundaries

The previous browser skeleton passed 14 Python tests, five frontend contract tests, TypeScript/build and all seven API smoke checks in the user's supplied run. Those results cover the stub model and placeholder body. They are not evidence of completed scientific forecasting, a finished dashboard or an installed desktop release.

This transition supplies the desktop host, Electron shell, packaging recipes and revised contract. Read VALIDATION.md for exactly which desktop checks ran. Missing package downloads or a missing clean-machine test remain release blockers; do not silently describe them as complete.

### 3.2 Developer installation and launch (Windows CMD)

Run from the repo root:

```cmd
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -e model -e explain -r api/requirements.txt
npm install
npm --prefix web ci
npm start
```

If .venv already exists and the skeleton check passed, reuse it; do not recreate it. Python 3.11 is the team's baseline, though the current local skeleton also passed on 3.12. Node 20.19+ or a supported newer LTS is required. After the root's first successful npm install, commit its lockfile; later installs use npm ci.

npm start builds the UI first, then launches Electron. No second CMD/API process is needed. To rebuild after source changes, close and run npm start again. For fast UI iteration only, retain the existing two-terminal Vite/API workflow from README, then recheck in Electron before handoff.

### 3.3 Automated checks

```cmd
.venv\Scripts\python.exe -m pytest model api
npm --prefix web test
npm run build:web
npm run test:desktop
npm run smoke:desktop
```

Add explain/ to pytest when Person 5 adds its tests. Desktop smoke checks must run after a renderer build. They cover the local UI, transport token, seven API routes, template explanation and backend shutdown. They do not prove the Electron window renders correctly.

### 3.4 Windows installer

Run on Windows x64:

```cmd
.venv\Scripts\python.exe -m pip install -r desktop/requirements-build.txt
npm run package:win
npm run dist:win
```

The unpacked app goes under release/win-unpacked/; the installer is release/AstroTwin-0.2.0-x64-Setup.exe (version comes from the root package.json). The installer includes the frozen Python backend, its libraries, data and UI. End users do not install developer tooling.

Before installer release, point ASTROTWIN_BACKEND_EXECUTABLE at the frozen backend and run the smoke script. Then use the clean-machine acceptance checklist in Part 6. An unsigned hackathon build may produce Windows trust prompts; signing and automatic updates are a later release milestone.

### 3.5 Immediate tasks

1. Person 2 installs desktop tools, checks npm start, builds the frozen backend and tests the installer.
2. Person 1 extends the existing stub into the real model and regenerates its fixture.
3. Person 3 replaces the body placeholder, using only local assets and shared types/theme.
4. Person 4 continues the full dashboard, editable comparison plan, uncertainty charts and playback. Keep the Electron wrapper out of web/.
5. Person 5 supplies cited parameter values, local science notes and template explanations before optional online AI work.

### 3.6 Checkpoints from adoption (adjust remaining time to the event)

| Time | Checkpoint | Owner |
| --- | --- | --- |
| First 2 hours | Every developer launches the same local app; desktop source checks pass | Person 2 + one fresh-clone tester |
| By hour 6 | First frozen backend and installer attempt; model fixture updated | Persons 2 and 1 |
| By hour 10 | Real API integration and full dashboard layout in Electron | Persons 2 and 4 |
| By hour 16 | Cited params v1 and crew presets bundled | Person 5 |
| By hour 20 | Real model and validation cases integrated | Persons 1 and 5 |
| By hour 24 | Local 3D body, timeline and comparison work together | Persons 3 and 4 |
| By hour 30 | Offline explanation, demo mode and actual installer tested on a second PC | Persons 2, 4 and 5 |
| By hour 36 | Feature freeze; clean Windows installer acceptance | Person 2 |
| By hour 44 | Code freeze; offline rehearsal and backup video | Persons 2 and 5 |
| By hour 48 | Submission includes installer access, repo, video and sources | Person 5 |

Do not spend time recreating already completed skeleton steps. Start packaging early because a successful Vite build does not guarantee a bundled Python app.

## 4. Shared contract snapshot

This is the complete current contract at the time of this plan. If the repository's CONTRACT.md later changes, that newer file wins. Person 2 updates the contract after coordinating interface changes.

```text
# AstroTwin CONTRACT.md
Version 1.1 (desktop transition). This file is the source of truth. Only Person 2 edits it, after team agreement.
If code and this file disagree, this file wins.

## 1. Repo layout and owners
astrotwin/
  CONTRACT.md, README.md, AstroTwin_Build_Plan.md, .github/workflows/ci.yml, package.json, package-lock.json, scripts/   Person 2
  desktop/                                                  Person 2 (Electron shell, Python host, packaging and lifecycle tests)
  model/                                                    Person 1
    pyproject.toml
    astrotwin_model/__init__.py   exports forecast, compare, load_params
    astrotwin_model/schemas.py    Pydantic v2 models for every shape in section 4
    scripts/make_fixture.py
    tests/
  api/                                                      Person 2
    main.py, requirements.txt, Dockerfile, tests/
  explain/                                                  Person 5
    pyproject.toml
    astrotwin_explain/__init__.py exports explain
  data/                                                     Person 5
    params.json, crew_presets.json, injuries.json
    fixtures/forecast_example.json   (generated by Person 1's script)
  docs/                                                     Person 5
  web/                                                      Person 4
    package.json, vite.config.ts
    src/types.ts    TypeScript copy of section 4
    src/theme.ts    design tokens, section 8
    src/api/        API client
    src/mocks/      mock forecast generator
    src/body/                                               Person 3
      index.ts      exports BodyTwin (section 9)
      dev/Sandbox.tsx
Never edit a folder you do not own. Ask the owner.

## 2. Running locally
Primary deliverable: an installable Windows x64 desktop app using Electron, the React UI and a bundled Python service.
Development baseline: Python 3.11, Node 20.19+ (or supported newer LTS). Keep the web developer workflow for UI work.
Install: pip install -e model -e explain -r api/requirements.txt
Desktop dependencies: npm install (repo root), then npm --prefix web ci.
Desktop start: npm start (repo root). Builds the renderer, launches Electron, starts its local backend and opens the UI after health is ready.
Desktop tests: npm run test:desktop and npm run smoke:desktop (after npm run build:web).
Windows packaging: pip install -r desktop/requirements-build.txt, then npm run dist:win (repo root).
Output: release/AstroTwin-0.2.0-x64-Setup.exe (version follows root package.json). End users need no Python or Node installation.
The Python host serves the compiled renderer and /api on one dynamically allocated 127.0.0.1 port.
The desktop renderer always uses /api on its own origin. VITE_API_URL is for optional browser deployment only.
VITE_USE_MOCKS is false for desktop builds; choosing mocks must be explicit and visibly labeled.
The desktop shell starts and stops the backend. Team members must not start a second backend for npm start.
Optional browser development:
API: uvicorn api.main:app --reload --port 8000   (run from repo root)
Web: cd web && npm install && npm run dev   (port 5173)
Vite proxies /api to http://localhost:8000. In production, VITE_API_URL sets the API base URL.
VITE_USE_MOCKS=true makes the web app use src/mocks instead of the API.
OpenAPI docs: http://localhost:8000/docs

## 3. Conventions
- Time is whole days. Day 0 is launch. landing_day = mission.duration_days.
- Every daily array runs from day 0 to landing_day + 90, inclusive, one value per day. Length = landing_day + 91.
- Percent series: 100 = the person's own preflight baseline.
- Region health: number from 0 to 1. 1 = baseline. 0.85 = moderate loss. 0.75 or lower = severe.
- JSON keys are snake_case everywhere, including in TypeScript types. No renaming.
- Numbers in arrays are rounded to 2 decimals.

## 4. Shapes
CrewProfile
  id: string                      example "crew_maya"
  name: string
  age: int
  sex: "F" | "M"
  mass_kg: number
  fitness: "low" | "average" | "high"
  role: string                    example "Commander", "Private astronaut"
  baseline: { hip_bmd_g_cm2: number, spine_bmd_g_cm2: number, leg_lean_mass_kg: number, vo2max_ml_kg_min: number }

Mission
  destination: "ISS" | "MOON" | "MARS"
  duration_days: int, 7 to 900
  eva_days: int[]                 planned spacewalk days

Injury (or null)
  type: "ankle_sprain" | "wrist_fracture" | "lower_back_strain" | "thigh_muscle_tear"
  severity: 1 | 2 | 3             1 mild, 2 moderate, 3 severe
  day: int                        mission day it happened
  side: "left" | "right" | null   null only for lower_back_strain

Countermeasures
  resistance_min_per_day: number, 0 to 120, default 60
  aerobic_min_per_day: number, 0 to 120, default 60
  protein_g_per_kg: number, 0.8 to 2.0, default 1.2
  calorie_pct: number, 80 to 110, default 100
  bisphosphonate: bool, default false

ForecastRequest
  crew: CrewProfile
  mission: Mission
  injury: Injury | null
  countermeasures: Countermeasures

RiskScore
  level: "green" | "yellow" | "red"
  score: int, 0 to 100, higher = more risk
  reason: string, one plain sentence

ForecastResponse
  days: int[]
  landing_day: int
  series: { hip_bmd_pct: number[], spine_bmd_pct: number[], leg_muscle_pct: number[], vo2max_pct: number[] }
  bands:  { same four keys: { low: number[], high: number[] } }
  regions: { RegionId: number[] }   all 9 region ids, region health per day
  risks: { fracture: RiskScore, eva_fitness: RiskScore, landing_fitness: RiskScore }
  events: [ { day: int, type: "launch" | "injury" | "eva" | "landing", label: string } ]
  meta: { model_version: string, params_version: string }

RegionId (exactly these 9)
  head_neck, chest, heart, spine, pelvis, left_arm, right_arm, left_leg, right_leg

Injury to region
  ankle_sprain -> {side}_leg
  thigh_muscle_tear -> {side}_leg
  wrist_fracture -> {side}_arm
  lower_back_strain -> spine

CompareRequest   { request: ForecastRequest, alternative: Countermeasures }
CompareResponse  { baseline: ForecastResponse, alternative: ForecastResponse }
ExplainRequest   { forecast: ForecastResponse, comparison: CompareResponse | null, crew_name: string, audience: "surgeon" | "crew" }
ExplainResponse  { text: string, source: "ai" | "template" }
InjuryInfo       { type: string, label: string, needs_side: bool }

## 5. API routes (JSON, prefix /api)
GET  /api/health     -> { status: "ok", model_version, params_version }
GET  /api/crew       -> CrewProfile[]          from data/crew_presets.json
GET  /api/injuries   -> InjuryInfo[]           from data/injuries.json
GET  /api/defaults   -> { countermeasures: Countermeasures, mission: Mission, demo: DemoSeed }
POST /api/forecast   ForecastRequest  -> ForecastResponse
POST /api/compare    CompareRequest   -> CompareResponse
POST /api/explain    ExplainRequest   -> ExplainResponse
Errors: HTTP 422 with { detail: string }.
CORS allows http://localhost:5173, http://127.0.0.1:5173 and WEB_ORIGIN for optional browser development. Desktop requests are same-origin.
/api/forecast must answer in under 300 ms for a 900-day mission.

## 6. Python interfaces
astrotwin_model.load_params(path: str = "data/params.json") -> dict
astrotwin_model.forecast(request: dict, params: dict) -> dict              returns ForecastResponse
astrotwin_model.compare(request: dict, alternative: dict, params: dict) -> dict   returns CompareResponse
astrotwin_explain.explain(forecast: dict, comparison: dict | None, crew_name: str, audience: str) -> dict
  returns ExplainResponse. Never raises. Uses the Anthropic API when ANTHROPIC_API_KEY is set,
  otherwise a template. 8 second timeout, then template.

## 7. data/params.json shape
Person 5 owns the values; Person 1 reads them. Placeholder values below are rough guesses for development only.
{
  "version": "0.1-placeholder",
  "daily_loss": { "hip_bmd": 0.0004, "spine_bmd": 0.00035, "leg_muscle": 0.0015, "vo2max": 0.002 },
  "loss_floor_pct": { "hip_bmd": 80, "spine_bmd": 82, "leg_muscle": 65, "vo2max": 70 },
  "countermeasure_max_effect": { "resistance": 0.6, "aerobic": 0.5, "protein": 0.1, "bisphosphonate": 0.5 },
  "injury": {
    "ankle_sprain":      { "extra_local_loss": 2.0, "healing_days": [10, 21, 42], "microgravity_slowdown": 1.3 },
    "thigh_muscle_tear": { "extra_local_loss": 2.5, "healing_days": [14, 28, 56], "microgravity_slowdown": 1.3 },
    "wrist_fracture":    { "extra_local_loss": 1.5, "healing_days": [28, 42, 70], "microgravity_slowdown": 1.4 },
    "lower_back_strain": { "extra_local_loss": 1.5, "healing_days": [7, 21, 42],  "microgravity_slowdown": 1.2 }
  },
  "recovery_half_life_days": { "hip_bmd": 180, "spine_bmd": 180, "leg_muscle": 30, "vo2max": 14 },
  "person_factors": { "age_per_decade_over_40": 0.08, "fitness": { "low": 1.15, "average": 1.0, "high": 0.9 }, "sex": { "F": 1.05, "M": 1.0 } },
  "uncertainty_pct": 0.2,
  "risk_thresholds": {
    "fracture":        { "yellow": 94, "red": 90 },
    "eva_fitness":     { "yellow": 90, "red": 82 },
    "landing_fitness": { "yellow": 88, "red": 80 }
  }
}
Risk inputs: fracture uses the lower of hip_bmd_pct and spine_bmd_pct at landing_day.
eva_fitness uses the lower of leg_muscle_pct and vo2max_pct at the first eva day (landing_day if none).
landing_fitness uses the lower of leg_muscle_pct and vo2max_pct at landing_day.
At or below "red" = red, at or below "yellow" = yellow, otherwise green.

## 8. Design tokens (web/src/theme.ts, owned by Person 4, used by Person 3)
bg #0B0F1A, panel #121829, border #23304A, text #E6EDF7, muted #8A97AD, accent #4FD1FF
healthy #3B82F6, warning #F59E0B, danger #EF4444. Font: bundled Inter if available, otherwise the local system sans-serif. No runtime font download.
healthColor(h: number): string blends healthy at 1.0, warning at 0.85, danger at 0.75 and below.

## 9. BodyTwin component (web/src/body/index.ts, owned by Person 3)
export function BodyTwin(props: {
  regions: Record<RegionId, number[]>;
  day: number;
  compareRegions?: Record<RegionId, number[]> | null;   when set, show the current plan and the new plan side by side
  injuredRegion?: RegionId | null;
  selectedRegion?: RegionId | null;
  onRegionSelect?: (id: RegionId | null) => void;
  height?: number;                                      pixels, default 520
}): JSX.Element
BodyTwin never fetches data. It only draws what it is given.
The dev sandbox shows when the URL contains ?sandbox=body.

## 10. Web dependencies (installed by Person 4 at hour 0)
react, react-dom, typescript, vite, tailwindcss, zustand, @tanstack/react-query, recharts, framer-motion,
three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
Ask Person 4 before adding any other package.

## 11. Demo seed (DemoSeed, returned by /api/defaults)
crew: first entry of crew_presets.json
mission: { destination: "ISS", duration_days: 180, eva_days: [60, 120] }
injury: { type: "ankle_sprain", severity: 2, day: 40, side: "left" }
countermeasures: the defaults
alternative: { resistance_min_per_day: 90, aerobic_min_per_day: 45, protein_g_per_kg: 1.6, calorie_pct: 100, bisphosphonate: true }

## 12. Git
Integration branch: default. Branches: model, api, body, web, data and personal branches such as aditya. Small pull requests into default; Person 2 merges.
CI must pass: pytest model api (plus explain tests when present), npm test and npm run build in web, and desktop lifecycle/smoke tests.

## 13. Desktop runtime and packaging
Owner: Person 2. No changes to the section 4 JSON shapes, the seven API routes, Python model/explain interfaces or BodyTwin props are required by desktop packaging.
desktop/main.cjs owns the Electron window. Node integration is off, context isolation and sandboxing are on. No renderer filesystem or subprocess privileges.
desktop/launcher.cjs starts exactly one backend child, waits for authenticated /api/health, and stops only its own child on exit. A second app launch focuses the first window.
desktop/backend.py binds 127.0.0.1 on an OS-assigned free port, serves web/dist plus the existing API, and requires an unpredictable per-launch X-AstroTwin-Session header.
The token is held in Electron's main process and inserted only into requests to the local app origin. It never enters the React API shapes, query string or saved data.
The runtime header is desktop transport only; the standalone API and its smoke scripts keep their existing interface.
Backend readiness announcement on stdout is a JSON line: {"event":"ready","port":<int>}. Electron still checks health before opening the page.
Backend stdin accepts shutdown followed by newline. EOF stops the backend when its parent disappears. Startup failures are shown as app errors; no silent switch to mock data.
Local UI/API requests are allowed; remote renderer content, popups, arbitrary navigation and device permissions are blocked. Any new remote assets require Person 2 review and offline fallback.
PyInstaller one-folder build includes model/explain code, data/ and web/dist. electron-builder includes that folder in the installer; no .venv, repository checkout or developer path is required on the user's computer.
App resources are read-only. Future user-created files belong under Electron's userData directory through an agreed interface, never in the install folder. Persistence is not implemented in this transition.
Core forecasts, presets, body assets and template explanations work offline. AI explanations are optional; configure keys at runtime and never bundle secrets.
Windows x64 is the first release target. macOS/Linux installers, signing, auto-updates and app-store distribution are later work.
Package smoke check: set ASTROTWIN_BACKEND_EXECUTABLE to the frozen astrotwin-backend executable and run npm run smoke:desktop.
Release acceptance: install on a clean Windows machine without Python/Node, open, run demo offline, close, reopen, and confirm no leftover backend or install-path writes. A successful source test alone is not installer acceptance.
```

---

## 5. Role sections

### Person 1: Model engineer

**Owns:** `model/` and the generated `data/fixtures/forecast_example.json`.
**Hands off to:** Person 2 (API) and Person 5 (validation).

Desktop handoff: keep this a pure Python package. No Electron imports, network calls, machine-specific paths or writes to installed resources. Person 2 freezes it unchanged.

My role: model engineer. I own the Python package in `model/` (import name `astrotwin_model`). It turns a crew member, a mission, an injury and an exercise plan into daily curves, body-region health and risk scores.

**Rules**
1. Match the contract (Part 4) exactly. If something is missing or unclear, stop and tell me; do not invent new fields or rename anything.
2. Only create or edit files inside `model/`, plus `data/fixtures/forecast_example.json` through the script below.
3. Read model values from `data/params.json` through `load_params()`. Never hard-code values that belong there.
4. Work in small steps. Show me a short plan, build step 1, run the tests, then continue.

**Step 1, inspect and extend the existing stub (do not recreate it)**
- `model/pyproject.toml`, so that `pip install -e model` works. Dependencies: pydantic>=2, numpy.
- `astrotwin_model/schemas.py`: Pydantic v2 models for every shape in contract section 4, with the same field names, allowed values and ranges. Person 2 imports these for API validation.
- `forecast()` returning correctly shaped data with simple straight-line curves, so others can integrate.
- `scripts/make_fixture.py`: builds the demo seed request (contract section 11), calls `forecast()`, and writes `data/fixtures/forecast_example.json`. Run it and commit the file.

**Step 2, real model in `forecast(request, params)`**
- Simulate day by day from day 0 to landing_day + 90 for four tissues: hip_bmd, spine_bmd, leg_muscle, vo2max.
- In flight, each day: `value = max(floor, value * (1 - rate))`, where `rate = daily_loss[tissue] * (1 - c) * person_factor * injury_factor`.
- Countermeasure effectiveness c, per tissue, combined as `c = 1 - product(1 - e_i)`, capped at 0.85:
  - resistance: `max_effect.resistance * min(minutes / 90, 1)`; applies to bone and leg_muscle.
  - aerobic: `max_effect.aerobic * min(minutes / 60, 1)`; applies to vo2max, and at half strength to leg_muscle.
  - protein: `max_effect.protein * clamp((g_per_kg - 0.8) / 0.8, 0, 1)`; applies to leg_muscle.
  - bisphosphonate: `max_effect.bisphosphonate` if true; applies to bone only.
  - calorie_pct below 100 multiplies the leg_muscle and bone rate by `1 + 2 * (100 - calorie_pct) / 100`.
- `person_factor = (1 + age_per_decade_over_40 * max(0, (age - 40) / 10)) * fitness factor * sex factor`.
- Injury: active from injury.day for `healing_days[severity - 1] * microgravity_slowdown` days (no slowdown after landing). While active, the injured region loses at `rate * extra_local_loss`. A leg injury also multiplies the global leg_muscle rate by `1 + 0.5 * (extra_local_loss - 1)`. A lower_back_strain halves resistance effectiveness while active (the astronaut cannot lift).
- After landing, each tissue recovers toward 100: `value += (100 - value) * (1 - 0.5 ** (1 / half_life))`.
- Bands: `low = value - uncertainty_pct * (100 - value)`, `high = value + uncertainty_pct * (100 - value)`, max 100.
- Regions (health from 0 to 1): convert a percent to health with `h = clamp(1 - (100 - pct) / 40, 0, 1)`.
  - pelvis = hip_bmd. spine = spine_bmd. left_leg and right_leg = average of leg_muscle and hip_bmd.
  - left_arm and right_arm = a muscle curve that loses at half the leg_muscle rate. heart = vo2max.
  - chest = average of the arm curves and vo2max. head_neck = 1.0 always.
  - The injured region follows its own local curve, which also drops by `0.15 * severity` on the injury day and returns to the region's normal curve over the healing period.
- Risks: follow contract section 7 exactly. `score = clamp(round((100 - value) * 5), 0, 100)`. The reason is one plain sentence with the number, for example "Hip bone density is predicted at 91.2% of baseline at landing."
- Events: launch at day 0, the injury day, each eva day, landing at landing_day.
- `meta.model_version = "1.0"`; `meta.params_version = params["version"]`.
- Round all array values to 2 decimals. Use numpy for speed.

**Step 3:** `compare(request, alternative, params)` runs forecast twice: once with the request's countermeasures and once with the alternative. It returns `{ baseline, alternative }`.

**Tests (`model/tests`, pytest), all must pass**
- Every output validates against the Pydantic ForecastResponse, and every array has length landing_day + 91.
- More resistance exercise gives a higher hip_bmd_pct at landing.
- An ankle_sprain on the left adds a local dip to left_leg. The right leg receives any specified global leg-muscle loss but never the left leg's extra local dip.
- Values recover toward 100 after landing.
- Bisphosphonate changes bone but not vo2max.
- A 900-day forecast runs in under 300 ms.
- The demo alternative improves the relevant forecast values. A better risk category is a demo goal, not permission to invent parameter values; if the cited science does not cross a threshold, show the actual improvement and tell Person 5.

**Definition of done:** `pip install -e model` works; `pytest model` passes; the fixture file is committed; `model/README.md` explains every formula in plain words, one sentence each, so I can explain it to a judge.

---

### Person 2: Backend, desktop and integration lead

**Owns:** `api/`, `desktop/`, root configuration, `scripts/`, CI, `CONTRACT.md` and this plan.
**Delivers:** one installable Windows x64 app with a local Python engine. Merge all PRs into `default`.

**Step 1: verify and adopt the transition**
- Read contract 1.1, inspect the existing implementation before changing it, and preserve teammate changes.
- Install the root Electron dependencies and the web dependencies, then run `npm start`.
- Verify the authenticated local host, readiness check, single-instance behavior, failure message and process cleanup.
- Run `npm run test:desktop` and `npm run smoke:desktop`. Never mark a GUI or installer test passed from a source-only check.

**Step 2: maintain the API**
- Keep all seven contract routes, import validation models from `astrotwin_model.schemas`, and keep the wire shapes unchanged.
- Load parameters and presets once at startup. Honor ASTROTWIN_DATA_DIR; the packaged host sets its bundled data location.
- Preserve the 256-entry forecast/compare caches and route timing logs. Clear caches when parameters change.
- Invalid requests return 422 with a plain string detail. Explanations return a template on timeout, malformed output or package failure.
- Support localhost browser development through CORS, but do not disable desktop session authentication or renderer sandboxing.
- Run API tests for valid routes, invalid inputs, long missions and explanation failures. Keep the optional Dockerfile/browser workflow as development fallback.

**Step 3: package Python and the UI**
- Install `desktop/requirements-build.txt` into the build venv.
- `npm run build:web` produces the desktop renderer with relative /api and mocks off.
- `npm run build:backend` runs `desktop/backend.spec`: one-folder PyInstaller output includes data and compiled UI.
- Any model/explain dependency change must be included in the build environment and rechecked in the frozen executable.
- `npm run package:win` makes the unpacked app; `npm run dist:win` makes the NSIS installer under `release/`.
- Keep generated bundles, release binaries, venvs, credentials and caches out of Git. Commit both npm lockfiles after successful installs.
- Code signing and automatic updates are later release work. Clearly label the hackathon installer as an unsigned research prototype.

**Step 4: release acceptance and handoff**
- Test the frozen backend through ASTROTWIN_BACKEND_EXECUTABLE and the same desktop smoke script.
- Install the actual installer on a separate clean Windows machine without Python or Node. Launch from its shortcut.
- Disconnect internet: crew presets, forecasts, comparison, all local 3D assets and template explanations still work.
- Close/reopen repeatedly, launch twice, simulate startup failure and confirm no orphan Python service. Closing an app must not stop another developer's API.
- Give the team the installer and a version/checksum in the release notes after these checks pass. A browser link is optional, not the primary delivery requirement.
- Maintain CI for model/API/explain tests, renderer tests/build, desktop lifecycle/smoke tests and a manual Windows packaging workflow.
- At each checkpoint, merge small PRs into default, rebuild and replay the same demo. Freeze features before the final clean-machine test.

**Definition of done:** the installed app launches without CMD, Python, Node or a checkout; the full offline demo works; startup/quit are reliable; API shapes remain compatible; CI passes and the installer acceptance checklist has a recorded result.

---

### Person 3: 3D body developer

**Owns:** `web/src/body/`.
**Hands off to:** Person 4, who places `<BodyTwin>` in the app.

Desktop handoff: the same component runs inside Electron. Bundle any model files, textures, decoders, fonts and environment maps locally under web/src/body/. Do not rely on CDN assets, remote fonts or a downloaded environment preset. Test with internet disconnected and ensure the 2D fallback still works.

My role: 3D body developer. I build the BodyTwin React component: a 3D hologram of an astronaut whose 9 body regions show their health on each mission day. It is the visual centerpiece of the demo.

**Rules**
1. Match the contract (Part 4) exactly, especially sections 3, 4 (RegionId), 8 (design tokens) and 9 (BodyTwin props). Do not invent new props without telling me.
2. Only create or edit files inside `web/src/body/`. Import colors and `healthColor` from `web/src/theme.ts` and types from `web/src/types.ts` (owned by Person 4). If they do not exist yet, use a temporary local copy in `web/src/body/tempTheme.ts` and delete it once Person 4's files exist.
3. Use only the packages listed in contract section 10. Ask me before adding any other.
4. BodyTwin never fetches data. It only draws its props.
5. Work in small steps. Show me a short plan, build step 1, run it in the sandbox, then continue.

**Step 1, sandbox (`web/src/body/dev/Sandbox.tsx`), shown when the URL contains `?sandbox=body`**
- Loads `data/fixtures/forecast_example.json` (copy it into `web/src/body/dev/fixture.json` if importing from outside `web/` is awkward). Until it exists, generate fake regions: 271 days, values falling from 1.0 to 0.8, with left_leg dropping to 0.6 at day 40 and recovering.
- A day slider and a play button, a toggle for compare mode (use the same data with every value + 0.07, capped at 1) and a dropdown for injuredRegion.

**Step 2, the body (`web/src/body/BodyTwin.tsx`), using @react-three/fiber and @react-three/drei**
- Build a stylized body from simple shapes (capsules, spheres and rounded boxes), with one mesh group per RegionId: head_neck, chest, heart (a small glowing shape inside the chest), spine (a column of small segments visible through the translucent torso), pelvis, left_arm, right_arm, left_leg, right_leg. A clean, stylized mannequin looks better and is far more reliable than a downloaded anatomy model. If there is time after hour 36, try a free glTF model with the same 9 groups.
- Hologram look: translucent surfaces with a fresnel rim glow, a soft bloom (@react-three/postprocessing), a dark background matching theme bg, a faint ring grid under the feet, and slow auto-rotation that stops while the user drags (OrbitControls with limited zoom and no panning).
- Each region's color = `healthColor(regions[id][day])`. Muscle regions (arms, legs, chest) also scale in thickness: radial scale = `0.85 + 0.15 * health`. Colors and scales ease smoothly toward new values over about 300 ms. Animate with useFrame and refs; never re-render React on every frame.
- injuredRegion: a pulsing red ring or glow around that region.
- Hover: highlight the region and show a small label with its name and health as a percent (drei Html). Click: call `onRegionSelect(id)`. Clicking empty space calls `onRegionSelect(null)`. selectedRegion gets an accent outline.
- compareRegions set: show two bodies side by side, labeled "Current plan" and "New plan", same camera, same day. Unset: one centered body.
- The height prop sets the canvas height (default 520); width fills the parent.

**Step 3, legend and fallback**
- Export `BodyLegend`: a small color bar from healthy to danger with the labels Baseline, Moderate loss and Severe loss.
- Export `BodyTwin2D`: an SVG front-view outline with the same 9 regions and the same props, used when WebGL is not available. BodyTwin checks for WebGL and switches to BodyTwin2D automatically.

**Step 4, exports (`web/src/body/index.ts`):** export `{ BodyTwin, BodyLegend, BodyTwin2D }` and the Sandbox as `BodySandbox`. Person 4 imports only from this file.

**Quality bar**
- 60 frames per second on a normal laptop with two bodies on screen.
- Readable on a projector: strong contrast, no tiny text.
- No console errors or warnings. `npm run build` passes.
- Moving the day slider from 0 to the end makes the change obvious: blue bodies turn orange and red, legs and arms thin out, and the injured leg is clearly worse.

**Definition of done:** the sandbox works with the real fixture; BodyTwin matches the props in contract section 9 exactly; Person 4 can drop it into the app with one import and no changes.

---

### Person 4: Frontend and dashboard developer

**Owns:** `web/` except `web/src/body/`.
**Depends on:** Person 2's API and Person 3's `<BodyTwin>`.

Desktop handoff: continue React in web/. Electron and Python packaging belong to Person 2; do not migrate to React Native or duplicate the UI. npm start at the repo root builds and opens the app; use the Vite browser workflow for fast iteration, then check every milestone in Electron. No renderer Node, filesystem or process APIs.

My role: frontend and dashboard developer. I build the app everyone sees: the mission-control layout, the controls, the charts and the timeline. I start on mock data and switch to the real API with one setting.

**Rules**
1. Match the contract (Part 4) exactly: shapes, routes, names, design tokens and the BodyTwin props. If something is missing, stop and tell me.
2. Never edit `web/src/body/` except to create the hour-0 placeholder below. Import BodyTwin only from `web/src/body/index.ts`.
3. Use only the packages in contract section 10.
4. Work in small steps. Show me a short plan, build step 1, run it, then continue.

**Step 1, verify the existing setup and shared files (already scaffolded)**
- Extend the existing Vite + React + TypeScript app in web/; preserve the installed dependencies, shared types, theme and API client. Complete styling without replacing the scaffold.
- `vite.config.ts`: proxy `/api` to http://localhost:8000.
- `src/types.ts`: TypeScript types for every shape in contract section 4, same snake_case names.
- `src/theme.ts`: the tokens and `healthColor()` from section 8. Person 3 imports these.
- The kickoff BodyTwin placeholder is already present. Hand it to Person 3 and stop editing their folder after the handoff.
- Keep ?sandbox=body in src/main.tsx. Coordinate any BodySandbox barrel export with Person 3; the current placeholder sandbox is already wired.

**Step 2, data layer**
- Extend the existing src/api/index.ts client with one typed function per contract route. Desktop builds use /api on their own origin; never hard-code port 8000 or a deployed server. VITE_API_URL remains only for optional browser development.
- Extend src/mocks/index.ts if illustrative curves are useful. Keep all mock output contract-valid and visibly marked as mock data. The current flat mock verifies integration only; a scientific forecast comes from the Python model.
- TanStack Query for requests. Debounce slider changes by 250 ms before calling `/api/compare`.
- A Zustand store for: crew list, selected crew, mission, injury, countermeasures (current plan), alternative countermeasures (new plan), compareMode, day, isPlaying, playSpeed, selectedRegion, audience.
- One day value drives everything: the body, the chart cursor and the timeline.

**Step 3, layout (dark mission-control style, built for 1440x900 and a 1920x1080 projector)**
- Top bar: AstroTwin logo text, crew switcher, a destination toggle ISS / MOON / MARS. MOON shows a badge "About 1.3 s signal delay"; MARS shows "Up to 22 min signal delay, plan runs on board".
- Left panel: crew profile card (name, role, age, fitness, mission length) and an injury picker (type, side when needs_side is true, severity 1 to 3, day). A "No injury" option.
- Center: BodyTwin with regions from the forecast, the current day, injuredRegion from the injury, compareRegions from the alternative when compareMode is on, plus BodyLegend underneath.
- Right panel:
  - Countermeasure sliders for the new plan (resistance, aerobic, protein, calories, bisphosphonate switch) with the current plan's values shown as small markers. A "Compare plans" toggle.
  - Three risk cards (fracture, spacewalk fitness, landing fitness): a colored dot, the score and the reason. In compare mode, show the change, for example "Red to Yellow".
  - Four small Recharts line charts (hip bone, spine bone, leg muscle, aerobic fitness) with the uncertainty band shaded, the current plan as a solid line, the new plan as a dashed accent line, a vertical line at landing and a cursor at the current day.
- Bottom: a timeline scrubber from day 0 to landing_day + 90, with event markers (launch, injury, EVA, landing), play/pause, speed 1x/4x/16x, and the day shown as "Day 40 of 180" or "Day 12 after landing".
- An explanation card under the risk cards: "Explain this" calls `/api/explain` with the forecast, the comparison and the audience (Surgeon / Crew toggle). Show a loading shimmer and then the text, with a small "AI" or "Template" tag from the source field.
- Clicking a body region selects it, highlights the matching chart, and shows that region's health at the current day.

**Step 4, demo mode**
- A "Run demo" button that follows the pitch script automatically, pausing about 4 seconds per step with a caption at the top: load the demo seed from `/api/defaults`; play from day 0; jump to day 40 when the injury appears; show risks turning red; turn on compare mode with the demo alternative; show the risk change; switch to MARS to show the delay badge. Any click stops demo mode.

**Quality bar**
- Smooth animations (Framer Motion for panels), no layout jumps, readable from the back of a room.
- Loading and error states for every request. If the API fails, show the failure and offer explicit retry or an explicit mock-mode switch. Never present silently substituted mocks as a real forecast.
- No console errors. `npm run build` passes with no TypeScript errors.

**Definition of done:** the app runs on mocks and on the real API with one setting; Person 3's BodyTwin drops in with no code changes; the demo mode runs start to finish without touching the mouse; the production renderer runs in the packaged Electron app with all assets local, no Node privileges and no hard-coded server address.

---

### Person 5: Data, science and AI lead

**Owns:** `data/`, `explain/`, `docs/`.
**Hands off to:** Person 1 (model values), Person 2 (explain package) and the whole team (pitch).

Desktop handoff: data is bundled into the installer and read-only at runtime. Supply local citations/limits text so it is readable offline. Never bundle API keys. The template explanation is mandatory; AI is an optional online enhancement.

My role: data, science and AI lead. I make the model's numbers credible, write the AI explanation feature and prepare the pitch materials. Judges for Best Use of Science will look closely at this work.

**Rules**
1. Match the contract (Part 4) exactly, especially sections 4, 6, 7 and 11. Keep every file in exactly the shape it describes. If I need a new field, stop and tell me so I can raise it with the team.
2. Only create or edit files inside `data/`, `explain/` and `docs/`. The fixture in `data/fixtures/` is generated by Person 1's script; do not edit it by hand.
3. Never make up a scientific number or a citation. If you are not sure of a value, say so, and mark it in `docs/science.md` as "estimate" with the reasoning. I will check the sources myself.
4. Work in small steps. Show me a short plan, build step 1, check it, then continue.

**Step 1, data files (by hour 16)**
- `data/params.json`: same shape as contract section 7. Replace the placeholder values with values based on published sources, then set "version" to "1.0". Find values for: monthly bone loss at the hip and spine, leg muscle and strength loss, aerobic fitness loss, how much resistance exercise, aerobic exercise, protein and bisphosphonates reduce loss, recovery time after landing, and healing times for the four injuries. Good places to look: the NASA Open Science Data Repository (OSDR, including GeneLab and ALSDA), the NASA Life Sciences Data Archive (LSDA), NASA Human Research Program evidence reports, the NASA Twins Study papers, and head-down tilt bed rest studies by NASA and the German Aerospace Center (DLR).
- `data/crew_presets.json`: 4 fictional astronauts, clearly made up, with realistic baselines and varied ages, sexes and fitness levels. Include a career commander, a flight engineer, a mission specialist and a 61-year-old private astronaut with low fitness. The first entry is used in the demo.
- `data/injuries.json`: the four injury types with friendly labels and needs_side.

**Step 2, science docs**
- `docs/science.md`: a table with each parameter, its value, its source with a link, and a confidence level (published, derived or estimate). Add a plain-language summary of the model and a "Limits" section (made-up crew, average values, not a medical device).
- `docs/validation.md` and a script `docs/validate.py`: run astrotwin_model on standard cases (180 days with standard exercise, 180 days with no exercise, the demo seed) and compare the results with published averages in a table. Note anything more than 10% off, and send Person 1 suggested fixes as values to change in params.json, never as model code changes.

**Step 3, AI explanations (`explain/astrotwin_explain`, by hour 30)**
- `explain(forecast, comparison, crew_name, audience) -> {"text": str, "source": "ai" | "template"}`, exactly as in contract section 6.
- Build a short fact sheet from the available request data: landing values, risk levels/reasons, event labels and comparison differences. ExplainRequest has no separate Injury or Countermeasures object, so do not invent missing severity, side or plan details. Request a team-approved contract change if those facts are essential. Send only this fact sheet to the model, never the full arrays.
- With `ANTHROPIC_API_KEY` set, call the Anthropic Messages API with httpx (model name configured by ANTHROPIC_MODEL after verifying provider availability; do not invent or assume a model identifier), with an 8 second timeout. System prompt rules: use only numbers in the fact sheet, at most 80 words, plain language. For audience "surgeon", be clinical and mention the key risk and the plan change. For "crew", be calm and encouraging, and give 2 simple actions. Never diagnose.
- Without a key, or on any error or timeout, return a template sentence built from the fact sheet with source "template". `explain()` must never raise an error.
- Tests in `explain/tests`: template output always works; numbers in the output come from the fact sheet; a fake API error falls back to the template.

**Step 4, pitch materials (`docs/pitch/`, by hour 40)**
- `demo-script.md`: the 3-minute demo, step by step, matching the app's demo mode.
- `slides-outline.md`: 6 to 8 slides: problem, why now, the product, live demo, the science, impact on Earth, team.
- `project-page.md`: text for the Space Apps project page, with every NASA dataset used named and linked.
- `video-script.md`: a 30-second video script.

**Definition of done:** params.json version 1.0 with every value traced in `docs/science.md`; validation shows the demo seed within 10% of published averages, or the gaps are explained; `explain()` passes its tests with and without an API key; the pitch docs are ready for rehearsal by hour 40.


## 6. Release acceptance and demo checklist

Person 2 records pass/fail and the app version. Person 5 records scientific validation separately.

- Install the actual generated installer on a second Windows x64 computer with no Python/Node requirement.
- Open from the desktop or Start menu shortcut; no terminal or manual API launch is needed.
- Confirm the UI displays the data source and model version correctly. Stub/mock status remains visible until replaced.
- Disconnect internet. Load crew, change mission and injury, scrub through landing + 90 days, compare two plans and request a template explanation.
- Confirm the 3D model, fonts, textures and any decoder assets need no downloads. Exercise the 2D fallback.
- Check minimum window size, maximize, resizing and projector text readability.
- Close/reopen the app several times; try a second launch; confirm no orphan backend process. A separate developer API must remain running.
- A failed backend start produces a clear app error. An unexpected backend crash does not silently convert results into mocks.
- The app launches from its installed location without relying on repo paths or writing beside its executable.
- Do not bundle .env files, credentials, real astronaut records or developer caches.
- If AI is enabled, test internet failure/timeout and template fallback; keep the science facts grounded in supplied outputs.
- Record the 3-minute demo and a backup video from the installed app, not only a development browser.
- Publish/distribute the installer only after the above results are recorded. Browser deployment remains optional.

### Scope after this transition

P0: scientifically grounded forecast/injury/countermeasure logic; 3D/2D body; risks; editable before/after plans; uncertainty; timeline; offline Windows demo. The installer and offline template explanation are part of desktop delivery. P1: online AI enhancement, communication-delay narrative and sensor simulation after P0 is stable. P2: real deployment safeguards, persistence/export, fleet/Earth modes, signing/updates and additional operating systems. The transition does not implement these future features.

### Technical references

- Electron security and renderer isolation: https://www.electronjs.org/docs/latest/tutorial/security
- Electron distribution: https://www.electronjs.org/docs/latest/tutorial/distribution-overview
- electron-builder v26 configuration: https://www.electron.build/v26/docs/configuration/
- PyInstaller spec/data files: https://pyinstaller.org/en/stable/spec-files.html
- PyInstaller runtime resources: https://pyinstaller.org/en/stable/runtime-information.html

The model equations and role responsibilities are retained from the original team plan with explicit corrections for injury-test consistency, explanation-input limits, explicit mock mode and offline packaging. Scientific rates still require Person 5's verification.
