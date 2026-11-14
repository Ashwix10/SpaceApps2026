# AstroTwin dashboard skeleton

From this folder: `npm install`, then `npm run dev`. Run the API from the repo root in another terminal first. API mode is the default. Connection errors stay visible; mock mode is an explicit switch.

The initial screen exercises all seven API routes. Flat curves and identical comparison results are expected while the stub model is installed; these are not science predictions.

Person 3 replaces `src/body/BodyTwin.tsx`, preserving the props in `src/types.ts`. Open `http://localhost:5173/?sandbox=body` to work independently. Shared design tokens and `healthColor` live in `src/theme.ts`.

This is the initial integration frontend. The full dashboard, real 3D rendering, uncertainty display, editable alternative plan and playback remain the respective owners' next steps.

Build: `npm run build`. Configure `.env.local` using `.env.example` when needed. `VITE_API_URL` must include `/api`, for example `https://your-api.example/api`.

After the first successful install, commit the generated `package-lock.json`. CI uses `npm ci` when the lockfile exists and `npm install` until then.
