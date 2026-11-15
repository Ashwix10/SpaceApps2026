# AstroTwin browser interface

Start the full browser app with `npm start` from the repo root, then open http://localhost:8000. For UI hot reload, run the Python API on port 8000 and `npm run dev` in this folder; open http://localhost:5173.

The overview shows the mission, body, three status summaries and timeline. Drawers contain mission settings, daily routines, detailed results and sources. The primary Compare plans action opens the alternative routine. The overflow menu holds the guided tour and sample-data switch.

Black/white/gray is the default palette. Muted amber/red is used only for meaningful health/status changes. UI wording is simplified; snake_case API shapes stay unchanged.

Body components remain in src/body/; the independent sandbox is ?sandbox=body. Types and theme live in src/types.ts and src/theme.ts. Build with npm run build; the root build:web helper sets the same-origin API address.


The current browser release uses three exercise choices with exact settings collapsed. Charts and 3D code load separately. Source measurement units and postflight timing are available under Sources. The API's legacy muscle/VO2max field names refer to a leg lean-tissue proxy and VO2peak; avoid implying strength or personal predictions. See ../docs/science.md and ../docs/RELEASE.md.


## Five-page remodel (2026-11-15)

App.tsx retains the mission state and switches focused pages using navigation.ts hash routes. Page transitions use the installed Framer Motion dependency and respect reduced motion. No router/server rewrite is required. The landing page can display without the Python API; the mission pages require it. Research references are bundled locally.

BodyScene loads web/public/models/human-reference.glb via useGLTF. scripts/prepare-human.py documents the OBJ-to-GLB conversion. The original CC0 source is linked and hashed in the adjacent manifest. Vertex colors still map to the nine contract regions; mesh thickness is no longer altered. The old procedural generator is retained as historical source but is not imported by the active renderer.


## Saved flight workspace

workspace.ts defines and validates the version-1 browser records. useWorkspace.ts loads localStorage once, saves state changes and reports storage failures without replacing unreadable data. WorkspaceUI.tsx supplies flight management, astronaut cards and native modal forms. App.tsx derives model inputs from the selected flight and preserves separate alternatives for each record. New profiles clone a fictional template; name/role edits preserve its research baseline.

Workspace storage is per browser origin/port, with no cloud or account backend. The six routes are home/workspace, astronauts, mission, explore, compare and research. This supersedes the older in-memory-only/reload-reset behavior above. Research/API contracts are unchanged.
