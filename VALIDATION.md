# Skeleton validation

Checked on November 14, 2026, in the local `default` checkout.

## Passed here

- Existing model forecast and comparison shape tests, invoked directly using the installed Pydantic runtime.
- Model forecasts for 7-, 180-, and 900-day missions: schema validation, continuous day indices, four series, uncertainty-band lengths and nine region arrays.
- Request schemas reject a 5-day mission and an ankle sprain without a side.
- Committed forecast fixture exactly matches the Python stub output.
- Five frontend contract tests: boundary mission lengths, event ordering, independent responses and shared health-color thresholds. These ran using the existing local TypeScript compiler because npm installation was unavailable.
- Python AST parsing, TypeScript/TSX syntax transpilation, PowerShell syntax parsing and Git whitespace checks.

## Not yet verified

Network restrictions prevented pip and npm from installing dependencies and prevented contact with GitHub. Therefore the full FastAPI tests, live HTTP smoke test, frontend type check/build, browser rendering and a clean dependency installation have **not** passed here. Syntax transpilation is not a TypeScript type check. Model timings do not verify HTTP latency.

`web/package-lock.json` must be generated and committed after the first successful `npm install`. CI uses `npm install` until that lockfile exists, then `npm ci`.

## Complete the checks on a connected machine

From this checkout's repo root in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

This installs dependencies, runs the full Python and frontend contract tests, builds the frontend, and exercises all seven routes against a temporary live API. Then follow README's two-terminal development steps to check the page at http://localhost:5173 with Mock mode **off**. The API-connected badge and `0.0-stub` version should appear. Change mission length, scrub the timeline, enable the demo comparison and request an explanation. Flat curves and identical comparisons are expected for this integration stub.

Only treat the skeleton as verified end to end after those checks pass. Push the local `default` branch when the results are satisfactory. No deployment has been performed.
