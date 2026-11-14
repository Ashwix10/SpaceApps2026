"""Desktop-only local host. The ordinary API remains available independently."""
import hmac
import json
import os
from pathlib import Path
import socket
import sys
import threading

import uvicorn
from starlette.responses import JSONResponse
from starlette.staticfiles import StaticFiles

ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[1]))
if not getattr(sys, "frozen", False):
    sys.path.insert(0, str(ROOT))


def main():
    token = os.environ.get("ASTROTWIN_DESKTOP_TOKEN", "")
    if len(token) < 32:
        raise RuntimeError("Launch through Electron or npm run smoke:desktop; the desktop host needs a session token.")
    assets = ROOT / "web" / "dist"
    if not (assets / "index.html").is_file():
        raise RuntimeError("Dashboard build missing. Run npm run build:web first.")
    os.environ.setdefault("ASTROTWIN_DATA_DIR", str(ROOT / "data"))
    from api.main import app

    @app.middleware("http")
    async def desktop_access(request, call_next):
        supplied = request.headers.get("x-astrotwin-session", "")
        if not hmac.compare_digest(supplied.encode(), token.encode()):
            return JSONResponse({"detail": "Desktop session required"}, status_code=401)
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; "
            "worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    # API routes are registered first; the remaining paths serve local UI assets.
    app.mount("/", StaticFiles(directory=str(assets), html=True), name="desktop-ui")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, log_level="warning", access_log=False, loop="asyncio", http="h11", ws="none"))

    def watch_parent():
        # EOF handles a crashed Electron process; normal exit requests graceful stop.
        for line in sys.stdin:
            if line.strip() == "shutdown":
                server.should_exit = True
                return
        os._exit(0)

    threading.Thread(target=watch_parent, daemon=True).start()
    print(json.dumps({"event": "ready", "port": port}), flush=True)
    try:
        server.run(sockets=[sock])
    finally:
        sock.close()


if __name__ == "__main__":
    main()
