"""
Offline checks for the GenAI chatbot agent (no server, no API keys).

Run:  python AI/test_chat.py   (from the repo root)

Covers the pure-function surface of AI/chat_agent.py:
- One Call response normalization shape
- Coordinate validation (bounds + schema)
- Attribution injection rule (appended iff tool data used)
- Session store: new ids, unknown ids fall back to a fresh session
- Cache key grid + TTL behavior

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
    append_turn,
    cache_key_for,
    clear_onecall_cache,
    clear_sessions,
    get_cached,
    get_or_create_session,
    inject_attribution,
    normalize_onecall,
    validate_tool_args,
)


def check_normalization_shape():
    """Normalized current conditions + hourly + daily forecast entries."""
    raw = {
        "current": {
            "temp": 21.5,
            "humidity": 60,
            "weather": [{"description": "clear sky"}],
        },
        "hourly": [
            {"dt": 1700000000, "temp": 21.0, "humidity": 58,
             "weather": [{"description": "few clouds"}]},
        ],
        "daily": [
            {"dt": 1700000000, "temp": {"day": 22.0, "night": 15.0},
             "humidity": 55, "weather": [{"description": "sunny"}]},
        ],
    }
    out = normalize_onecall(raw)
    assert out["current"]["temp"] == 21.5, out
    assert out["current"]["humidity"] == 60, out
    assert out["current"]["description"] == "clear sky", out
    assert len(out["hourly"]) == 1 and out["hourly"][0]["dt"] == 1700000000
    assert len(out["daily"]) == 1 and out["daily"][0]["temp"]["day"] == 22.0
    # Tolerant of missing sections
    empty = normalize_onecall({})
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
    """0.1-degree grid batching; 12-minute TTL expiry."""
    clear_onecall_cache()
    assert cache_key_for(35.71, 139.72, "metric") == cache_key_for(
        35.73, 139.74, "metric")
    assert cache_key_for(35.7, 139.7, "metric") != cache_key_for(
        35.7, 139.7, "imperial")
    assert cache_key_for(35.7, 139.7, "metric") != cache_key_for(
        36.7, 139.7, "metric")
    key = cache_key_for(0.0, 0.0, "metric")
    assert get_cached(key) is None
    chat_agent._onecall_cache[key] = chat_agent._CacheEntry(
        normalized={"current": {}}, timestamp=time.time())
    assert get_cached(key) == {"current": {}}
    chat_agent._onecall_cache[key] = chat_agent._CacheEntry(
        normalized={"current": {}},
        timestamp=time.time() - chat_agent.CACHE_TTL_SECONDS - 1)
    assert get_cached(key) is None
    # Stale fallback still serves expired entries (quota path)
    chat_agent._onecall_cache[key] = chat_agent._CacheEntry(
        normalized={"current": {"temp": 1}},
        timestamp=time.time() - chat_agent.CACHE_TTL_SECONDS - 1)
    assert chat_agent.get_stale(key) == {"current": {"temp": 1}}
    clear_onecall_cache()


def run_all_checks():
    print("=" * 60)
    print("iAlert GenAI Chatbot - Offline Checks (no server, no keys)")
    print("=" * 60)

    checks = [
        ("Normalization shape", check_normalization_shape),
        ("Invalid-coord rejection", check_coord_validation),
        ("Attribution injection", check_attribution_injection),
        ("Fresh-session fallback", check_session_fallback),
        ("Cache key + TTL", check_cache_key_and_ttl),
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
