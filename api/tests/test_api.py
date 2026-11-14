from copy import deepcopy
from time import perf_counter

import pytest
from fastapi.testclient import TestClient
import astrotwin_explain
from astrotwin_model.schemas import Defaults, ForecastResponse, CompareResponse, ExplainResponse
from api.main import app, cached_forecast


@pytest.fixture
def client():
    with TestClient(app) as value:
        yield value


def seed(client):
    demo = client.get("/api/defaults").json()["demo"]
    alternative = demo.pop("alternative")
    return demo, alternative


def test_metadata(client):
    assert client.get("/api/health").json()["status"] == "ok"
    assert len(client.get("/api/crew").json()) >= 1
    assert len(client.get("/api/injuries").json()) == 4
    Defaults.model_validate(client.get("/api/defaults").json())
    assert "/api/forecast" in client.get("/openapi.json").json()["paths"]


@pytest.mark.parametrize("duration", [7, 180, 900])
def test_forecast_and_compare(client, duration):
    request, alternative = seed(client)
    request["mission"] = {"destination": "ISS", "duration_days": duration, "eva_days": []}
    request["injury"] = None
    response = client.post("/api/forecast", json=request)
    assert response.status_code == 200
    result = ForecastResponse.model_validate(response.json())
    assert result.days == list(range(duration + 91))
    for series in [*result.series.model_dump().values(), *result.regions.model_dump().values()]:
        assert len(series) == duration + 91
    for band in result.bands.model_dump().values():
        assert len(band["low"]) == len(band["high"]) == duration + 91
    comparison = client.post("/api/compare", json={"request": request, "alternative": alternative})
    assert comparison.status_code == 200
    assert CompareResponse.model_validate(comparison.json()).baseline == result


@pytest.mark.parametrize("change", ["duration", "side", "protein"])
def test_invalid_requests(client, change):
    request, _ = seed(client)
    if change == "duration":
        request["mission"]["duration_days"] = 5
    elif change == "side":
        request["injury"]["side"] = None
    else:
        request["countermeasures"]["protein_g_per_kg"] = 4
    response = client.post("/api/forecast", json=request)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


@pytest.mark.parametrize("failure", [None, "raise", "bad_shape"])
def test_explain_fallback(client, monkeypatch, failure):
    request, _ = seed(client)
    forecast = client.post("/api/forecast", json=request).json()
    if failure == "raise":
        def broken(*args):
            raise RuntimeError("offline")
        monkeypatch.setattr(astrotwin_explain, "explain", broken)
    elif failure == "bad_shape":
        monkeypatch.setattr(astrotwin_explain, "explain", lambda *args: {})
    response = client.post("/api/explain", json={"forecast": forecast, "comparison": None,
                                                  "crew_name": request["crew"]["name"], "audience": "crew"})
    assert response.status_code == 200
    assert ExplainResponse.model_validate(response.json()).source == "template"


def test_cache_and_cors(client):
    request, _ = seed(client)
    client.post("/api/forecast", json=request)
    hits = cached_forecast.cache_info().hits
    client.post("/api/forecast", json=deepcopy(request))
    assert cached_forecast.cache_info().hits == hits + 1
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_long_mission_latency(client):
    request, _ = seed(client)
    request["mission"]["duration_days"] = 900
    started = perf_counter()
    assert client.post("/api/forecast", json=request).status_code == 200
    assert perf_counter() - started < 0.3
