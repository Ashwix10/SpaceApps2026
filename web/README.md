# AstroTwin dashboard

The React interface runs in the Electron desktop app or the optional Vite browser workflow. From the repo root, `npm start` builds and opens the app. For fast browser iteration, start the API and run `npm --prefix web run dev`.

The dashboard includes crew/mission/injury controls; independently editable current and alternative countermeasure plans; 3D/2D region selection; risk changes; four tissue charts with illustrative uncertainty envelopes; shared timeline and 1x/4x/16x playback; crew/surgeon explanation audiences; and a six-stage guided demo that stops on manual interaction.

All inputs preserve the shared contract. Mock mode is explicit, and parameter-validation limits remain visible. AI-provider integration and scientific calibration remain separate workstreams.

`src/body/` holds the local 3D/2D components. `?sandbox=body` opens the body sandbox. Shared types and colors live in `src/types.ts` and `src/theme.ts`.

Build from this folder with `npm run build`; desktop `npm run build:web` forces same-origin /api and mocks off. Dependencies are locked by package-lock.json.
