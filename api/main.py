"""Contract-compatible API backed by the team's replaceable model stubs."""
from contextlib import asynccontextmanager
from functools import lru_cache
import json
import logging
import os
from pathlib import Path
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import astrotwin_explain
import astrotwin_model
from astrotwin_model.schemas import (
    CompareRequest, CompareResponse, Countermeasures, CrewProfile, Defaults,
    ExplainRequest, ExplainResponse, ForecastRequest, ForecastResponse, Health,
    InjuryInfo, Mission,
)

ROOT = Path(__file__).resolve().parents[1]
log = logging.getLogger("uvicorn.error")


@lru_cache(maxsize=256)
def cached_forecast(payload: str, params: str) -> dict:
    return astrotwin_model.forecast(json.loads(payload), json.loads(params))


@lru_cache(maxsize=256)
def cached_compare(payload: str, params: str) -> dict:
    value = json.loads(payload)
    return astrotwin_model.compare(value["request"], value["alternative"], json.loads(params))


def canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    data = Path(os.environ.get("ASTROTWIN_DATA_DIR", str(ROOT / "data")))
    if not data.is_absolute():
        data = ROOT / data
    app.state.params = astrotwin_model.load_params(str(data / "params.json"))
    app.state.params_key = canonical(app.state.params)
    app.state.crew = [CrewProfile.model_validate(x) for x in json.loads((data / "crew_presets.json").read_text(encoding="utf-8"))]
    if not app.state.crew:
        raise ValueError("crew_presets.json must contain at least one crew member")
    app.state.injuries = [InjuryInfo.model_validate(x) for x in json.loads((data / "injuries.json").read_text(encoding="utf-8"))]
    cached_forecast.cache_clear()
    cached_compare.cache_clear()
    yield


app = FastAPI(title="AstroTwin", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([
        "http://localhost:5173", "http://127.0.0.1:5173",
        *filter(None, [os.environ.get("WEB_ORIGIN")]),
    ])),
    allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
)


@app.middleware("http")
async def timing(request: Request, call_next):
    start = perf_counter()
    response = await call_next(request)
    log.info("%s %s %s %.2f ms", request.method, request.url.path, response.status_code, (perf_counter() - start) * 1000)
    return response


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError):
    detail = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
    return JSONResponse(status_code=422, content={"detail": detail})


@app.get("/api/health", response_model=Health)
def health(request: Request):
    return {"status": "ok", "model_version": astrotwin_model.MODEL_VERSION,
            "params_version": str(request.app.state.params["version"])}


@app.get("/api/crew", response_model=list[CrewProfile])
def crew(request: Request):
    return request.app.state.crew


@app.get("/api/injuries", response_model=list[InjuryInfo])
def injuries(request: Request):
    return request.app.state.injuries


@app.get("/api/defaults", response_model=Defaults)
def defaults(request: Request):
    measures = Countermeasures().model_dump()
    mission = Mission(destination="ISS", duration_days=180, eva_days=[60, 120]).model_dump()
    return {"countermeasures": measures, "mission": mission, "demo": {
        "crew": request.app.state.crew[0], "mission": mission,
        "injury": {"type": "ankle_sprain", "severity": 2, "day": 40, "side": "left"},
        "countermeasures": measures,
        "alternative": {"resistance_min_per_day": 90, "aerobic_min_per_day": 45,
                        "protein_g_per_kg": 1.6, "calorie_pct": 100, "bisphosphonate": True},
    }}


@app.post("/api/forecast", response_model=ForecastResponse)
def forecast(body: ForecastRequest, request: Request):
    return cached_forecast(canonical(body.model_dump()), request.app.state.params_key)


@app.post("/api/compare", response_model=CompareResponse)
def compare(body: CompareRequest, request: Request):
    return cached_compare(canonical(body.model_dump()), request.app.state.params_key)


@app.post("/api/explain", response_model=ExplainResponse)
def explain(body: ExplainRequest):
    try:
        result = astrotwin_explain.explain(
            body.forecast.model_dump(),
            body.comparison.model_dump() if body.comparison else None,
            body.crew_name, body.audience,
        )
        return ExplainResponse.model_validate(result)
    except Exception:
        log.exception("Explanation unavailable; returning template")
        return ExplainResponse(text="Explanation unavailable. Review the forecast and risk scores with the mission team.", source="template")
