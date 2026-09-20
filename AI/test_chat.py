"""
Offline checks for the GenAI chatbot agent (no server, no API keys).

Run:  python AI/test_chat.py   (from the repo root)

Covers the pure-function surface of AI/chat_agent.py:
- Free-endpoint merge normalization shape (current + 3-hourly + daily)
- Tool schema rename (get_weather_free)
- Coordinate validation (bounds + schema)
- Attribution injection rule (appended iff tool data used)
- Session store: new ids, unknown ids fall back to a fresh session
- Cache key grid + 5-minute TTL behavior
- 401 mapping (invalid-key error, key never leaked)
- Per-minute guard trip (stale served vs retry-shortly message)
- Partial-data fallback (one endpoint fails, other succeeds)

Follows the manual-script pattern of AI/test_api.py (plain functions,
printed summary, exit code) but stays non-interactive and offline.
"""

import os
import sys
import time

sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
)

from AI import chat_agent
from AI.chat_agent import (
    ATTRIBUTION_TEXT,
    ERROR_RETRY_SHORTLY,
    ERROR_WEATHER_UNAVAILABLE,
    GET_WEATHER_TOOL_SCHEMA,
    ServiceNotConfiguredError,
    UpstreamUnavailableError,
    append_turn,
    cache_key_for,
    clear_free_cache,
    clear_sessions,
    fetch_free,
    get_cached,
    get_or_create_session,
    inject_attribution,
    normalize_free_merged,
    validate_tool_args,
)


def _weather_fixture():
    """Current Weather payload shape (/data/2.5/weather)."""
    return {
        "main": {"temp": 21.5, "humidity": 60},
        "weather": [{"description": "clear sky"}],
    }


def _forecast_fixture():
    """5-day/3-hour Forecast payload shape (/data/2.5/forecast)."""
    day = 1720000000 // 86400  # arbitrary fixed UTC day bucket
    base = day * 86400 + 3600
    descs = ["few clouds", "clear sky", "clear sky", "light rain"]
    entries = []
    for i in range(20):
        entries.append(
            {
                "dt": base + i * 10800,
                "main": {"temp": 20.0 + (i % 5), "humidity": 55 + (i % 4)},
                "weather": [{"description": descs[i % len(descs)]}],
            }
        )
    return {"list": entries}


class _FakeResp:
    def __init__(self, status, payload=None):
        self.status_code = status
        self._payload = payload if payload is not None else {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


def check_tool_schema_rename():
    """Tool is registered as get_weather_free with a 3-hourly description."""
    assert GET_WEATHER_TOOL_SCHEMA["name"] == "get_weather_free", (
        GET_WEATHER_TOOL_SCHEMA["name"]
    )
    assert "3-hour" in GET_WEATHER_TOOL_SCHEMA["description"], (
        GET_WEATHER_TOOL_SCHEMA["description"]
    )
    props = GET_WEATHER_TOOL_SCHEMA["parameters"]["properties"]
    assert props["lat"] == {"type": "number", "minimum": -90, "maximum": 90}
    assert props["lon"] == {"type": "number", "minimum": -180, "maximum": 180}
    assert props["units"] == {"type": "string", "enum": ["metric", "imperial"]}
    assert GET_WEATHER_TOOL_SCHEMA["parameters"]["required"] == ["lat", "lon"]


def check_normalization_shape():
    """Merged current (from /weather) + 3-hourly (<=16) + daily {min,max}."""
    weather = _weather_fixture()
    forecast = _forecast_fixture()
    entries = forecast["list"]
    out = normalize_free_merged(weather, forecast)

    # Current comes from the /weather payload
    assert out["current"]["temp"] == 21.5, out
    assert out["current"]["humidity"] == 60, out
    assert out["current"]["description"] == "clear sky", out

    # Hourly truncated to the first 16 entries (~48h at 3-hour steps)
    assert len(out["hourly"]) == 16, len(out["hourly"])
    assert out["hourly"][0]["dt"] == entries[0]["dt"], out["hourly"][0]
    assert out["hourly"][0]["temp"] == 20.0, out["hourly"][0]
    assert out["hourly"][0]["description"] == "few clouds", out["hourly"][0]

    # Daily aggregates cover the full forecast list per UTC day
    expected_days = sorted({e["dt"] // 86400 for e in entries})
    assert [d["dt"] for d in out["daily"]] == [
        k * 86400 for k in expected_days
    ], out["daily"]
    first_day = [e for e in entries if e["dt"] // 86400 == expected_days[0]]
    first = next(
        d for d in out["daily"] if d["dt"] == expected_days[0] * 86400
    )
    temps = [e["main"]["temp"] for e in first_day]
    assert first["temp"] == {"min": min(temps), "max": max(temps)}, first
    hums = [e["main"]["humidity"] for e in first_day]
    assert first["humidity"] == round(sum(hums) / len(hums)), first
    assert isinstance(first["description"], str) and first["description"], first

    # Tolerant of a missing side: each payload normalizes independently
    only_weather = normalize_free_merged(weather, {})
    assert only_weather["current"]["temp"] == 21.5, only_weather
    assert only_weather["hourly"] == [] and only_weather["daily"] == []
    only_forecast = normalize_free_merged({}, forecast)
    assert only_forecast["current"] == {
        "temp": None,
        "humidity": None,
        "description": "",
    }, only_forecast
    assert len(only_forecast["hourly"]) == 16, only_forecast
    empty = normalize_free_merged({}, {})
    assert empty["hourly"] == [] and empty["daily"] == []
    assert empty["current"]["description"] == ""


def check_coord_validation():
    """Invalid coords are rejected; valid coords (incl. edges) pass."""
    ok, _ = validate_tool_args({"lat": 35.7, "lon": 139.7})
    assert ok
    ok, _ = validate_tool_args(
        {"lat": -90, "lon": -180, "units": "imperial"})
    assert ok
    ok, _ = validate_tool_args({"lat": 90, "lon": 180})
    assert ok
    ok, err = validate_tool_args({"lat": 91, "lon": 0})
    assert not ok and "lat" in err, err
    ok, err = validate_tool_args({"lat": 0, "lon": 181})
    assert not ok and "lon" in err, err
    ok, err = validate_tool_args({"lat": "north", "lon": 0})
    assert not ok, err
    ok, err = validate_tool_args({"lat": 0, "lon": 0, "units": "kelvin"})
    assert not ok and "units" in err, err
    ok, err = validate_tool_args({"lon": 0})
    assert not ok, err


def check_attribution_injection():
    """Attribution appended iff tool data used; never duplicated."""
    with_tool = inject_attribution("Sunny, 22C.", tool_used=True)
    assert ATTRIBUTION_TEXT in with_tool, with_tool
    assert with_tool.startswith("Sunny, 22C."), with_tool
    pure = inject_attribution("Hello! How can I help?", tool_used=False)
    assert ATTRIBUTION_TEXT not in pure, pure
    once = inject_attribution(with_tool, tool_used=True)
    assert once.count(ATTRIBUTION_TEXT) == 1, once


def check_session_fallback():
    """Unknown ids start a fresh session without error; history is kept."""
    clear_sessions()
    first = get_or_create_session(None)
    assert first.session_id, "new session must have an id"
    append_turn(first, "user", "Weather in Tokyo?")
    append_turn(first, "assistant", "Sunny.")
    same = get_or_create_session(first.session_id)
    assert same.session_id == first.session_id
    assert len(same.history) == 2
    # Unknown id -> fresh session with a different id, no error
    fresh = get_or_create_session("does-not-exist")
    assert fresh.session_id != "does-not-exist"
    assert fresh.history == []
    # History capped at last 20 turns
    for i in range(30):
        append_turn(fresh, "user", f"msg {i}")
    assert len(fresh.history) == chat_agent.MAX_TURNS_PER_SESSION
    clear_sessions()


def check_cache_key_and_ttl():
    """0.1-degree grid batching; 5-minute TTL expiry; stale fallback."""
    assert chat_agent.CACHE_TTL_SECONDS == 5 * 60, (
        chat_agent.CACHE_TTL_SECONDS
    )
    clear_free_cache()
    assert cache_key_for(35.71, 139.72, "metric") == cache_key_for(
        35.73, 139.74, "metric")
    assert cache_key_for(35.7, 139.7, "metric") != cache_key_for(
        35.7, 139.7, "imperial")
    assert cache_key_for(35.7, 139.7, "metric") != cache_key_for(
        36.7, 139.7, "metric")
    key = cache_key_for(0.0, 0.0, "metric")
    assert get_cached(key) is None
    chat_agent._free_cache[key] = chat_agent._CacheEntry(
        normalized={"current": {}}, timestamp=time.time())
    assert get_cached(key) == {"current": {}}
    chat_agent._free_cache[key] = chat_agent._CacheEntry(
        normalized={"current": {}},
        timestamp=time.time() - chat_agent.CACHE_TTL_SECONDS - 1)
    assert get_cached(key) is None
    # Stale fallback still serves expired entries (guard/failure path)
    chat_agent._free_cache[key] = chat_agent._CacheEntry(
        normalized={"current": {"temp": 1}},
        timestamp=time.time() - chat_agent.CACHE_TTL_SECONDS - 1)
    assert chat_agent.get_stale(key) == {"current": {"temp": 1}}
    clear_free_cache()


def _with_patched_http(fake_get, old_key_sentinel=object()):
    """Swap httpx.get + set a dummy API key; returns restore closure."""
    import httpx

    orig_get = httpx.get
    old_key = os.environ.get("OPENWEATHER_API_KEY")
    httpx.get = fake_get
    os.environ["OPENWEATHER_API_KEY"] = "test-key-abc"

    def restore():
        httpx.get = orig_get
        if old_key is None:
            os.environ.pop("OPENWEATHER_API_KEY", None)
        else:
            os.environ["OPENWEATHER_API_KEY"] = old_key
        clear_free_cache()

    return restore


def check_401_mapping():
    """401 from either endpoint -> invalid-key error; key never leaked."""
    clear_free_cache()

    def fake_401_current(url, params=None, timeout=None):
        if "forecast" in url:
            return _FakeResp(200, _forecast_fixture())
        return _FakeResp(401)

    restore = _with_patched_http(fake_401_current)
    try:
        try:
            fetch_free(35.7, 139.7, "metric")
            raise AssertionError("expected UpstreamUnavailableError")
        except UpstreamUnavailableError as exc:
            assert "invalid" in exc.detail.lower(), exc.detail
            assert "test-key-abc" not in exc.detail, exc.detail
    finally:
        restore()

    def fake_401_forecast(url, params=None, timeout=None):
        if "forecast" in url:
            return _FakeResp(401)
        return _FakeResp(200, _weather_fixture())

    restore = _with_patched_http(fake_401_forecast)
    try:
        try:
            fetch_free(35.7, 139.7, "metric")
            raise AssertionError("expected UpstreamUnavailableError")
        except UpstreamUnavailableError as exc:
            assert "invalid" in exc.detail.lower(), exc.detail
            assert "test-key-abc" not in exc.detail, exc.detail
    finally:
        restore()


def check_partial_fallback():
    """One endpoint failing serves partial data; both failing raises."""
    clear_free_cache()

    def fake_forecast_down(url, params=None, timeout=None):
        if "forecast" in url:
            return _FakeResp(500)
        return _FakeResp(200, _weather_fixture())

    restore = _with_patched_http(fake_forecast_down)
    try:
        out, cached = fetch_free(35.7, 139.7, "metric")
        assert cached is False, (out, cached)
        assert out["current"]["temp"] == 21.5, out
        assert out["hourly"] == [] and out["daily"] == [], out
    finally:
        restore()

    def fake_both_down(url, params=None, timeout=None):
        return _FakeResp(500)

    restore = _with_patched_http(fake_both_down)
    try:
        try:
            fetch_free(35.7, 139.7, "metric")
            raise AssertionError("expected UpstreamUnavailableError")
        except UpstreamUnavailableError as exc:
            assert exc.detail == ERROR_WEATHER_UNAVAILABLE, exc.detail
    finally:
        restore()


def check_guard_trip():
    """Tripped 50/min guard: stale served when present, retry msg when not."""
    clear_free_cache()

    def fake_ok(url, params=None, timeout=None):
        if "forecast" in url:
            return _FakeResp(200, _forecast_fixture())
        return _FakeResp(200, _weather_fixture())

    restore = _with_patched_http(fake_ok)
    try:
        # Trip with stale present -> stale served, no upstream call
        key = cache_key_for(1.0, 2.0, "metric")
        chat_agent._free_cache[key] = chat_agent._CacheEntry(
            normalized={"current": {"temp": 9}},
            timestamp=time.time() - chat_agent.CACHE_TTL_SECONDS - 1,
        )
        chat_agent._free_window_start = time.time()
        chat_agent._free_window_count = chat_agent.FREE_MAX_RPM
        out, cached = fetch_free(1.0, 2.0, "metric")
        assert cached is True and out["current"]["temp"] == 9, (out, cached)

        # Trip without stale -> exact retry-shortly message
        clear_free_cache()
        chat_agent._free_window_start = time.time()
        chat_agent._free_window_count = chat_agent.FREE_MAX_RPM
        try:
            fetch_free(3.0, 4.0, "metric")
            raise AssertionError("expected UpstreamUnavailableError")
        except UpstreamUnavailableError as exc:
            assert exc.detail == ERROR_RETRY_SHORTLY, exc.detail

        # Window reset after 60s lets a fresh fetch through
        clear_free_cache()
        chat_agent._free_window_start = time.time() - 61
        chat_agent._free_window_count = chat_agent.FREE_MAX_RPM
        out, cached = fetch_free(3.0, 4.0, "metric")
        assert cached is False and out["current"]["temp"] == 21.5, (
            out,
            cached,
        )

        # Counting unit: one cache miss increments the guard by exactly one
        before = chat_agent._free_window_count
        fetch_free(5.0, 6.0, "metric")
        assert chat_agent._free_window_count == before + 1, (
            before,
            chat_agent._free_window_count,
        )

        # Missing API key surfaces as 503 at tool-call time
        clear_free_cache()
        os.environ.pop("OPENWEATHER_API_KEY", None)
        try:
            fetch_free(7.0, 8.0, "metric")
            raise AssertionError("expected ServiceNotConfiguredError")
        except ServiceNotConfiguredError:
            pass
    finally:
        restore()


def run_all_checks():
    print("=" * 60)
    print("iAlert GenAI Chatbot - Offline Checks (no server, no keys)")
    print("=" * 60)

    checks = [
        ("Tool schema rename", check_tool_schema_rename),
        ("Free merge normalization shape", check_normalization_shape),
        ("Invalid-coord rejection", check_coord_validation),
        ("Attribution injection", check_attribution_injection),
        ("Fresh-session fallback", check_session_fallback),
        ("Cache key + TTL", check_cache_key_and_ttl),
        ("401 invalid-key mapping", check_401_mapping),
        ("Partial-data fallback", check_partial_fallback),
        ("Per-minute guard trip", check_guard_trip),
    ]

    results = []
    for name, fn in checks:
        try:
            fn()
            print(f"PASS - {name}")
            results.append((name, True))
        except AssertionError as exc:
            print(f"FAIL - {name}: {exc}")
            results.append((name, False))
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR - {name}: {type(exc).__name__}: {exc}")
            results.append((name, False))

    passed = sum(1 for _, ok in results if ok)
    print(f"\nTotal: {passed}/{len(results)} checks passed")
    if passed == len(results):
        print("All offline checks passed.")
    else:
        print("Some checks failed.")
    return passed == len(results)


if __name__ == "__main__":
    sys.exit(0 if run_all_checks() else 1)
