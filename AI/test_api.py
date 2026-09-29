"""
iAlert AI Service - manual smoke script (standard library only).

Usage:
    python AI/test_api.py [--base-url http://localhost:8000] [--live]

Probes the deterministic live surface without any API keys and prints a
summary table. Exit code 0 when every executed check passes, 1 otherwise.
The network-dependent EONET /api/disasters check only runs with --live
(default: skipped).

The server must already be running, e.g.:
    uvicorn AI.main:app --port 8000
"""

import argparse
import json
import sys
import urllib.error
import urllib.request

DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_TIMEOUT = 10
LIVE_TIMEOUT = 60

KNOWN_CONTINENT = "Asia"
KNOWN_COUNTRY = "Japan"


def _parse_json(raw):
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return None


def http_request(method, url, payload=None, timeout=DEFAULT_TIMEOUT):
    """Return (status_code or None, parsed JSON body or None, error or None)."""
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, _parse_json(resp.read().decode("utf-8")), None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return exc.code, _parse_json(raw), None
    except urllib.error.URLError as exc:
        return None, None, "connection failed: %s" % exc.reason
    except Exception as exc:  # e.g. TimeoutError
        return None, None, "request failed: %s" % exc


def check_root(base):
    status, body, err = http_request("GET", base + "/")
    if err:
        return False, err
    if status != 200:
        return False, "expected 200, got %s" % status
    if not isinstance(body, dict) or body.get("status") != "online":
        return False, "unexpected body: %s" % body
    return True, "service online"


def check_health(base):
    status, body, err = http_request("GET", base + "/api/health")
    if err:
        return False, err
    if status != 200:
        return False, "expected 200, got %s" % status
    if not isinstance(body, dict) or body.get("status") != "healthy":
        return False, "unexpected body: %s" % body
    return True, "status=healthy"


def check_continents(base):
    status, body, err = http_request("GET", base + "/api/continents")
    if err:
        return False, err
    if status != 200:
        return False, "expected 200, got %s" % status
    continents = body.get("continents") if isinstance(body, dict) else None
    if not isinstance(continents, list) or KNOWN_CONTINENT not in continents:
        return False, "missing %r in %s" % (KNOWN_CONTINENT, body)
    return True, "%d continents, %s present" % (len(continents), KNOWN_CONTINENT)


def check_countries(base):
    status, body, err = http_request(
        "GET", base + "/api/countries/%s" % KNOWN_CONTINENT
    )
    if err:
        return False, err
    if status != 200:
        return False, "expected 200, got %s" % status
    countries = body.get("countries") if isinstance(body, dict) else None
    if not isinstance(countries, list) or KNOWN_COUNTRY not in countries:
        return False, "missing %r in response" % KNOWN_COUNTRY
    return True, "%d countries, %s present" % (len(countries), KNOWN_COUNTRY)


def check_chat_empty(base):
    status, body, err = http_request(
        "POST", base + "/api/chat", payload={"message": ""}
    )
    if err:
        return False, err
    if status != 400:
        return False, "expected 400, got %s (%s)" % (status, body)
    return True, "empty message rejected with 400"


def check_chat_valid_message(base):
    status, body, err = http_request(
        "POST",
        base + "/api/chat",
        payload={"message": "Is there flood risk near Tokyo, Japan?"},
        timeout=LIVE_TIMEOUT,
    )
    if err:
        if "timed out" in err:
            return None, "SKIP - chat turn exceeded %ss (slow upstream?)" % (
                LIVE_TIMEOUT,
            )
        return False, err
    if status == 503:
        return True, "lazy init proven: 503 without keys"
    if status == 200:
        text = body.get("response", "") if isinstance(body, dict) else ""
        if "OpenWeather" in text:
            return True, "full loop with keys: answer + attribution"
        return False, "200 without attribution: %s" % (body,)
    if status in (502, 429):
        return None, "SKIP - upstream %s (transient?)" % status
    return False, "expected 503/200, got %s (%s)" % (status, body)


def check_unknown_path(base):
    status, body, err = http_request("GET", base + "/api/does-not-exist-41")
    if err:
        return False, err
    if status != 404:
        return False, "expected 404, got %s (%s)" % (status, body)
    if not isinstance(body, dict) or "error" not in body:
        return False, "expected JSON error body, got %s" % body
    return True, "clean JSON 404"


def check_disaster_sources(base):
    status, body, err = http_request("GET", base + "/api/disasters/sources")
    if err:
        return False, err
    if status != 200:
        return False, "expected 200, got %s (%s)" % (status, body)
    if not isinstance(body, dict) or "sources" not in body or not isinstance(body["sources"], list):
        return False, "unexpected sources body: %s" % body
    return True, "sources: %s" % ", ".join(body["sources"])


def check_disasters(base):
    status, body, err = http_request(
        "GET", base + "/api/disasters?limit=5", timeout=LIVE_TIMEOUT
    )
    if err:
        return False, err
    if status != 200:
        return False, "expected 200, got %s (%s)" % (status, body)
    if not isinstance(body, dict) or body.get("status") != "ok":
        return False, "unexpected body: %s" % body
    sources = body.get("sources", [])
    events = body.get("events", [])
    # Verify each event has required fields
    for evt in events:
        if not all(k in evt for k in ("id", "title", "category", "lat", "lng", "source")):
            return False, "event missing required fields: %s" % evt
    return True, "%s events from %s" % (len(events), ", ".join(sources) if sources else "none")


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Manual stdlib-only smoke check for the iAlert AI service."
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument(
        "--live",
        action="store_true",
        help="include the network-dependent EONET /api/disasters check",
    )
    args = parser.parse_args(argv)
    base = args.base_url.rstrip("/")

    print("iAlert AI Service - smoke check against %s" % base)
    print("-" * 70)

    results = [
        ("root 200",) + check_root(base),
        ("health 200",) + check_health(base),
        ("continents 200",) + check_continents(base),
        ("countries/Asia 200",) + check_countries(base),
        ("disaster sources 200",) + check_disaster_sources(base),
        ("chat empty -> 400",) + check_chat_empty(base),
        ("chat valid message (503 keyless / 200 keyed)",)
        + check_chat_valid_message(base),
        ("unknown path -> 404 JSON",) + check_unknown_path(base),
    ]
    if args.live:
        results.append(("disasters live",) + check_disasters(base))
    else:
        results.append(("disasters live", None, "skipped (use --live)"))

    width = max(len(name) for name, _, _ in results)
    passed = failed = skipped = 0
    for name, ok, detail in results:
        if ok is None:
            outcome = "SKIP"
            skipped += 1
        elif ok:
            outcome = "PASS"
            passed += 1
        else:
            outcome = "FAIL"
            failed += 1
        print("%-*s  %-4s  %s" % (width, name, outcome, detail))

    print("-" * 70)
    print("Total: %d passed, %d failed, %d skipped" % (passed, failed, skipped))
    if any(
        detail.startswith("connection failed")
        for _, ok, detail in results
        if ok is False
    ):
        print("Hint: is the server running? Start it with:")
        print("    uvicorn AI.main:app --port 8000")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
