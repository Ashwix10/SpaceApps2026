"""Serve the browser app and its API from one origin."""
import argparse
from pathlib import Path
import sys
import threading

from starlette.staticfiles import StaticFiles
import uvicorn

ROOT = Path(__file__).resolve().parents[1]


def create_app():
    from api.main import app
    assets = ROOT / "web" / "dist"
    if not (assets / "index.html").is_file():
        raise RuntimeError("Browser build missing. Run npm run build:web from the repository root.")
    if not any(getattr(route, "name", None) == "web-ui" for route in app.routes):
        app.mount("/", StaticFiles(directory=str(assets), html=True), name="web-ui")
    return app


def main():
    parser = argparse.ArgumentParser(description="AstroTwin browser app")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--managed", action="store_true", help="Stop when the npm launcher exits")
    args = parser.parse_args()
    server = uvicorn.Server(uvicorn.Config(create_app(), host=args.host, port=args.port, log_level="info", access_log=False))
    if args.managed:
        def watch_parent():
            for line in sys.stdin:
                if line.strip() == "shutdown":
                    break
            server.should_exit = True
        threading.Thread(target=watch_parent, daemon=True).start()
    server.run()


if __name__ == "__main__":
    main()
