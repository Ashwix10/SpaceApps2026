# AstroTwin desktop

An astronaut-health digital twin research prototype. The primary app is now **Windows x64 desktop**, using Electron, the existing React dashboard and the existing Python model/API. API shapes and BodyTwin props are unchanged.

Read [AstroTwin_Build_Plan.md](AstroTwin_Build_Plan.md) for the complete five-person plan, [CONTRACT.md](CONTRACT.md) for interfaces/runtime rules, and [VALIDATION.md](VALIDATION.md) for what has actually been checked. Shared integration branch: **default**.

## Start the app on this computer

You already have the Python and web dependencies if the earlier skeleton check passed. From CMD:

```cmd
cd /d "C:\Users\adity\OneDrive\Documents\SpaceApps\SpaceApps2026"
npm install
npm start
```

The first command after cd installs Electron and the desktop build tools. Later launches need only **npm start**. It rebuilds the renderer, starts Electron, starts one private local backend and opens the dashboard once health is ready. Closing the app stops that backend. You do not start uvicorn or Vite separately for desktop use.

If downloads are blocked, run npm install from a normal terminal with network access. Root package-lock.json is generated on the first successful install; commit it and use npm ci thereafter. web/package-lock.json is already present.

The forecast engine now implements loss, injury, countermeasures and recovery. Its parameters are still unverified development estimates, clearly labeled in the UI. The body now renders nine interactive 3D regions with health colors, injury markers, comparison and a selectable 2D fallback. All workstreams are now implemented together in this workspace.

## Setup on another developer's Windows computer

Requires Python 3.11 and Node 20.19+ or supported newer LTS (Node 22 is used for desktop CI). Run from the repository root:

```cmd
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -e model -e explain -r api/requirements.txt
npm install
npm --prefix web ci
npm start
```

Reuse an existing working .venv. If you intentionally use another Python environment, set ASTROTWIN_PYTHON to its absolute executable path.

## Build a Windows installer

On Windows x64, after developer setup:

```cmd
.venv\Scripts\python.exe -m pip install -r desktop/requirements-build.txt
npm run dist:win
```

Expected output: **release/AstroTwin-0.2.0-x64-Setup.exe**. Version follows root package.json. For the unpacked app only, use npm run package:win; its executable is release/win-unpacked/AstroTwin.exe.

The installer contains a PyInstaller one-folder Python backend, parameters/presets and the compiled UI. End users need no Python, Node, terminal or repository. Do not copy only the backend .exe out of its folder: it needs the accompanying libraries/resources.

A manual GitHub Actions workflow, **Build Windows desktop installer**, runs tests, builds the installer and uploads an artifact when the changes are pushed. This creates a downloadable build artifact; it does not publicly publish a release. Signing and auto-updates are later work.

Before distributing, install on a second clean Windows machine, disconnect internet, run the demo, close/reopen and check process cleanup. See the complete acceptance list in the plan. An unsigned prototype may trigger Windows trust prompts.

## Checks

```cmd
.venv\Scripts\python.exe -m pytest model api explain
npm --prefix web test
npm run build:web
npm run test:desktop
npm run smoke:desktop
```

The desktop smoke test launches the real local host and checks UI assets, session authentication, all seven API routes, offline template output and shutdown. It does not launch Electron or certify the installer.

To check the backend copied into the packaged app, in CMD:

```cmd
set "ASTROTWIN_BACKEND_EXECUTABLE=%CD%\release\win-unpacked\resources\backend\astrotwin-backend.exe"
npm run smoke:desktop
set "ASTROTWIN_BACKEND_EXECUTABLE="
```

The existing Windows check script also checks the desktop host:

```cmd
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

## Ownership and implementation

| Owner | Files |
| --- | --- |
| Person 1 | model/ and generated forecast fixture |
| Person 2 | api/, desktop/, scripts/, root config/plan/contract and CI |
| Person 3 | web/src/body/ |
| Person 4 | web/ except body |
| Person 5 | data/, explain/, docs/ |

desktop/main.cjs runs an isolated, sandboxed renderer with Node integration disabled. desktop/launcher.cjs owns one child process. desktop/backend.py binds an OS-assigned loopback port and serves the UI and /api from the same origin. A per-launch transport token stays in Electron's main process. A second app launch focuses the existing window.

Core operation is offline. All required body/font/texture/decoder assets must be bundled locally. Template explanations must always work. ANTHROPIC_API_KEY and ANTHROPIC_MODEL, when used, are runtime configuration only; never bundle credentials. Persistent user records are outside this transition; do not write into installation resources.

## Optional browser workflow

For fast frontend work, keep the original development mode in two terminals:

```cmd
.venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8000
```

```cmd
npm --prefix web run dev
```

Open http://localhost:5173; Vite proxies /api to the developer backend. The API docs remain http://localhost:8000/docs in this mode. Person 3's sandbox is ?sandbox=body.

VITE_API_URL is for optional browser deployment. Desktop build:web forces same-origin /api and VITE_USE_MOCKS=false; a user can still select clearly labeled mock mode. Never substitute mocks silently on a failed forecast.

The existing api/Dockerfile is retained for optional server development. Cloud hosting is no longer required for the desktop deliverable.
