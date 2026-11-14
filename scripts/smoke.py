"""Exercise all seven routes against a running API. No third-party dependencies."""
import json
import sys
from urllib.request import Request, urlopen


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")

    def call(path, payload=None):
        body = None if payload is None else json.dumps(payload).encode()
        request = Request(base + "/api/" + path, data=body, headers={"Content-Type": "application/json"})
        with urlopen(request, timeout=10) as response:
            result = json.load(response)
        print("PASS", path)
        return result

    assert call("health")["status"] == "ok"
    assert len(call("crew")) >= 1
    assert len(call("injuries")) == 4
    defaults = call("defaults")
    request = defaults["demo"]
    alternative = request.pop("alternative")
    forecast = call("forecast", request)
    n = request["mission"]["duration_days"] + 91
    assert forecast["days"] == list(range(n))
    assert len(forecast["regions"]) == 9
    assert all(len(x) == n for x in forecast["series"].values())
    comparison = call("compare", {"request": request, "alternative": alternative})
    assert comparison["baseline"] == forecast
    explanation = call("explain", {"forecast": forecast, "comparison": comparison,
                                    "crew_name": request["crew"]["name"], "audience": "crew"})
    assert explanation["source"] in ("ai", "template")
    assert explanation["text"]
    print("PASS: all seven API routes and demo forecast")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
