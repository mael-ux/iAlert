"""
iAlert — GenAI conversational agent module.

Server-side bounded manual function-calling loop against Gemini with a single
`get_weather_free` tool backed by OpenWeather's free endpoints (Current
Weather + 5-day/3-hour Forecast).

Design notes (see openspec/changes/free-weather-tool/design.md):
- Sessions are an in-memory dict, capped at the last 20 turns, lazy expiry.
- SDK automatic function calling is DISABLED; at most 2 tool iterations/turn.
- Gemini client init is lazy: a missing GEMINI_API_KEY surfaces as a
  chat-only 503, never a boot failure (existing routes stay live).
- Attribution ("Weather data provided by OpenWeather") is server-enforced:
  appended iff tool data was used in the turn.
"""

from __future__ import annotations

import os
import threading
import time
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ATTRIBUTION_TEXT = "Weather data provided by OpenWeather"

FREE_CURRENT_ENDPOINT = "https://api.openweathermap.org/data/2.5/weather"
FREE_FORECAST_ENDPOINT = "https://api.openweathermap.org/data/2.5/forecast"

CACHE_TTL_SECONDS = 5 * 60  # 5 minutes per the free-weather-tool spec
MAX_TURNS_PER_SESSION = 20
MAX_TOOL_ITERATIONS = 2
SESSION_TTL_SECONDS = 24 * 60 * 60  # lazy expiry after 24h of inactivity
FREE_MAX_RPM = 50  # per-minute guard, headroom under the 60/min free tier

DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"

ERROR_EMPTY_MESSAGE = "message must be a non-empty string"
ERROR_NOT_CONFIGURED = "Chat service not configured"
ERROR_LOCATION_RETRY = (
    "I couldn't pin that location — could you share a place name "
    "or coordinates (lat, lon) so I can look up the weather?"
)
ERROR_WEATHER_UNAVAILABLE = (
    "Weather data is unavailable right now, please try again later."
)
ERROR_SERVICE_BUSY = "Service is busy, please try again shortly."
ERROR_RETRY_SHORTLY = (
    "weather data temporarily unavailable, please retry shortly"
)
ERROR_INVALID_KEY = (
    "Weather service API key is invalid or missing."
)


# ---------------------------------------------------------------------------
# Error taxonomy
# ---------------------------------------------------------------------------


class ChatError(Exception):
    """Base chat error carrying an HTTP status and optional Retry-After."""

    status_code: int = 500
    retry_after: Optional[int] = None

    def __init__(self, detail: str, retry_after: Optional[int] = None):
        super().__init__(detail)
        self.detail = detail
        if retry_after is not None:
            self.retry_after = retry_after


class BadRequestError(ChatError):
    status_code = 400


class ServiceNotConfiguredError(ChatError):
    status_code = 503


class RateLimitedError(ChatError):
    status_code = 429


class UpstreamUnavailableError(ChatError):
    status_code = 502


# ---------------------------------------------------------------------------
# Session store
# ---------------------------------------------------------------------------


@dataclass
class ChatSession:
    session_id: str
    history: List[Dict[str, str]] = field(default_factory=list)
    last_coords: Optional[Dict[str, float]] = None
    updated: float = field(default_factory=time.time)


_sessions: Dict[str, ChatSession] = {}


def _is_expired(session: ChatSession, now: Optional[float] = None) -> bool:
    now = time.time() if now is None else now
    return (now - session.updated) > SESSION_TTL_SECONDS


def get_or_create_session(session_id: Optional[str]) -> ChatSession:
    """Return the live session for id, or a fresh session.

    Unknown or expired ids start a fresh session without error.
    """
    if session_id:
        existing = _sessions.get(session_id)
        if existing is not None and not _is_expired(existing):
            return existing
        _sessions.pop(session_id, None)
    fresh = ChatSession(session_id=str(uuid.uuid4()))
    _sessions[fresh.session_id] = fresh
    return fresh


def append_turn(session: ChatSession, role: str, text: str) -> None:
    """Append a turn, keeping only the last MAX_TURNS_PER_SESSION turns."""
    session.history.append({"role": role, "text": text})
    if len(session.history) > MAX_TURNS_PER_SESSION:
        session.history = session.history[-MAX_TURNS_PER_SESSION:]
    session.updated = time.time()


def clear_sessions() -> None:
    """Test helper: drop all sessions."""
    _sessions.clear()


# ---------------------------------------------------------------------------
# Tool declaration
# ---------------------------------------------------------------------------

GET_WEATHER_TOOL_SCHEMA: Dict[str, Any] = {
    "name": "get_weather_free",
    "description": (
        "Current weather plus 3-hourly forecast (next ~48h) and derived "
        "daily aggregates for a coordinate. Forecast steps are 3-hour "
        "intervals."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "lat": {"type": "number", "minimum": -90, "maximum": 90},
            "lon": {"type": "number", "minimum": -180, "maximum": 180},
            "units": {"type": "string", "enum": ["metric", "imperial"]},
        },
        "required": ["lat", "lon"],
    },
}


def validate_tool_args(args: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate get_weather_free args against bounds and schema.

    Returns (ok, error_message). Never raises on bad input.
    """
    try:
        lat = args.get("lat")
        lon = args.get("lon")
        if isinstance(lat, bool) or isinstance(lon, bool):
            return False, "lat/lon must be numbers"
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return False, "lat/lon must be numbers"
    if not (-90 <= lat_f <= 90):
        return False, f"lat {lat_f} out of bounds (-90..90)"
    if not (-180 <= lon_f <= 180):
        return False, f"lon {lon_f} out of bounds (-180..180)"
    units = args.get("units", "metric")
    if units not in ("metric", "imperial"):
        return False, 'units must be "metric" or "imperial"'
    return True, ""


def resolve_coords(
    lat: Optional[float],
    lon: Optional[float],
    session: ChatSession,
) -> Optional[Dict[str, float]]:
    """Coordinate resolution priority: explicit body > session last_coords.

    Place-name resolution (priority 3) happens inside the Gemini loop, which
    returns tool args that are validated before execution.
    """
    if lat is not None and lon is not None:
        ok, _ = validate_tool_args({"lat": lat, "lon": lon})
        if ok:
            coords = {"lat": float(lat), "lon": float(lon)}
            session.last_coords = coords
            return coords
        return None
    if session.last_coords is not None:
        return dict(session.last_coords)
    return None


# ---------------------------------------------------------------------------
# Free-endpoint cache (5-min TTL) + per-minute guard
# ---------------------------------------------------------------------------


@dataclass
class _CacheEntry:
    normalized: Dict[str, Any]
    timestamp: float


_free_cache: Dict[str, _CacheEntry] = {}

# Guard + cache writes share one lock (cheap, uncontended; safe under
# uvicorn's threadpool plus our fan-out threads).
_free_lock = threading.Lock()
_free_window_start: float = 0.0
_free_window_count: int = 0


def cache_key_for(lat: float, lon: float, units: str) -> str:
    """0.1-degree grid key (same convention as backend /api/get-weather)."""
    return f"{round(lat * 10) / 10:.1f}:{round(lon * 10) / 10:.1f}:{units}"


def get_cached(key: str, now: Optional[float] = None) -> Optional[Dict[str, Any]]:
    # Expired entries are deliberately RETAINED (not evicted) so that
    # get_stale can serve them on the guard/failure fallback paths; a
    # fresh fetch overwrites the entry. Chat traffic keeps key growth
    # negligible.
    with _free_lock:
        entry = _free_cache.get(key)
    if entry is None:
        return None
    now = time.time() if now is None else now
    if (now - entry.timestamp) > CACHE_TTL_SECONDS:
        return None
    return entry.normalized


def get_stale(key: str) -> Optional[Dict[str, Any]]:
    """Return cached data regardless of TTL (guard/failure fallback)."""
    with _free_lock:
        entry = _free_cache.get(key)
    return entry.normalized if entry else None


def _check_free_rpm() -> None:
    """Fixed-window per-minute guard, mirroring `_check_gemini_rpm`.

    Raises UpstreamUnavailableError with the spec's retry-shortly message
    when the FREE_MAX_RPM budget for the current 60s window is exhausted.
    """
    global _free_window_start, _free_window_count
    now = time.time()
    with _free_lock:
        if (now - _free_window_start) >= 60:
            _free_window_start = now
            _free_window_count = 0
        if _free_window_count >= FREE_MAX_RPM:
            raise UpstreamUnavailableError(ERROR_RETRY_SHORTLY)
        _free_window_count += 1


def clear_free_cache() -> None:
    """Test helper: drop cache and reset the per-minute guard window."""
    global _free_window_start, _free_window_count
    with _free_lock:
        _free_cache.clear()
        _free_window_start = 0.0
        _free_window_count = 0


# ---------------------------------------------------------------------------
# Response normalization
# ---------------------------------------------------------------------------


def _describe(weather_list: Any) -> str:
    if isinstance(weather_list, list) and weather_list:
        first = weather_list[0]
        if isinstance(first, dict):
            return str(first.get("description", ""))
    return ""


def normalize_free_merged(
    weather_raw: Dict[str, Any], forecast_raw: Dict[str, Any]
) -> Dict[str, Any]:
    """Normalize merged Current + Forecast payloads to the internal format.

    Output: {current: {temp, humidity, description}, hourly, daily}.
    Each payload normalizes independently (missing side defaults to
    empty/None), so a single-endpoint failure still yields servable
    partial data.

    - current from `/weather`: main.temp/main.humidity + weather[0].
    - hourly from `/forecast` list, truncated to the first 16 entries
      (~48h at 3-hour steps).
    - daily derived per UTC day from the forecast list: temp {min,max},
      humidity as the day-mean (rounded), description as the dominant
      (modal) 3-hour description.
    """
    weather_raw = weather_raw if isinstance(weather_raw, dict) else {}
    forecast_raw = forecast_raw if isinstance(forecast_raw, dict) else {}

    main = weather_raw.get("main", {})
    if not isinstance(main, dict):
        main = {}
    current = {
        "temp": main.get("temp"),
        "humidity": main.get("humidity"),
        "description": _describe(weather_raw.get("weather", [])),
    }

    entries: List[Dict[str, Any]] = []
    for item in forecast_raw.get("list", []) or []:
        if not isinstance(item, dict):
            continue
        item_main = item.get("main", {})
        if not isinstance(item_main, dict):
            item_main = {}
        entries.append(
            {
                "dt": item.get("dt"),
                "temp": item_main.get("temp"),
                "humidity": item_main.get("humidity"),
                "description": _describe(item.get("weather", [])),
            }
        )

    hourly = entries[:16]

    daily = _daily_aggregates(entries)

    return {"current": current, "hourly": hourly, "daily": daily}


def _daily_aggregates(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Group 3-hourly entries per UTC day into {min,max} aggregates.

    Day buckets use integer arithmetic (dt // 86400); the daily dt is
    the bucket's UTC midnight. Non-numeric temps/humidities are ignored.
    """
    buckets: Dict[int, List[Dict[str, Any]]] = {}
    for item in entries:
        dt = item.get("dt")
        if isinstance(dt, bool) or not isinstance(dt, (int, float)):
            continue
        buckets.setdefault(int(dt) // 86400, []).append(item)

    daily: List[Dict[str, Any]] = []
    for day_key in sorted(buckets):
        items = buckets[day_key]
        temps = [
            i["temp"]
            for i in items
            if isinstance(i.get("temp"), (int, float))
            and not isinstance(i.get("temp"), bool)
        ]
        humidities = [
            i["humidity"]
            for i in items
            if isinstance(i.get("humidity"), (int, float))
            and not isinstance(i.get("humidity"), bool)
        ]
        descriptions = [i["description"] for i in items if i.get("description")]
        dominant = (
            Counter(descriptions).most_common(1)[0][0] if descriptions else ""
        )
        daily.append(
            {
                "dt": day_key * 86400,
                "temp": {
                    "min": min(temps) if temps else None,
                    "max": max(temps) if temps else None,
                },
                "humidity": (
                    round(sum(humidities) / len(humidities))
                    if humidities
                    else None
                ),
                "description": dominant,
            }
        )
    return daily


def inject_attribution(response_text: str, tool_used: bool) -> str:
    """Append attribution iff tool data was used and it is not already there."""
    if not tool_used or ATTRIBUTION_TEXT in response_text:
        return response_text
    return f"{response_text}\n\n{ATTRIBUTION_TEXT}"


# ---------------------------------------------------------------------------
# Free-endpoint fetch (httpx, explicit timeouts, parallel fan-out)
# ---------------------------------------------------------------------------


def _fetch_one(url: str, params: Dict[str, Any]) -> Tuple[Any, str]:
    """GET one free endpoint. Returns (payload_or_None, status).

    Status is "ok", "unauthorized" (HTTP 401), or "failed" (any other
    transport/API/parse problem). Never includes the API key in anything
    raised or returned.
    """
    import httpx

    try:
        resp = httpx.get(
            url, params=params, timeout=httpx.Timeout(10.0, connect=5.0)
        )
    except Exception:
        return None, "failed"
    if resp.status_code == 401:
        return None, "unauthorized"
    try:
        resp.raise_for_status()
    except Exception:
        return None, "failed"
    try:
        data = resp.json()
    except Exception:
        return None, "failed"
    return data if isinstance(data, dict) else {}, "ok"


def fetch_free(
    lat: float, lon: float, units: str = "metric"
) -> Tuple[Dict[str, Any], bool]:
    """Fetch normalized free-endpoint data. Returns (normalized, cached).

    Calls Current Weather + 5-day/3-hour Forecast in parallel and merges
    them. Guard counting unit: one increment per fetch_free cache miss
    (the upstream fan-out counts as a single unit against the budget).

    Raises ServiceNotConfiguredError when OPENWEATHER_API_KEY is missing
    (at tool-call time, never at import/startup), and
    UpstreamUnavailableError on transport/API failure. A 401 from either
    endpoint maps to an invalid-key error (takes precedence over partial
    data); any other single-endpoint failure serves partial normalized
    data WITH attribution downstream. Both failing serves stale cache
    when present, else UpstreamUnavailableError. A tripped per-minute
    guard serves stale cache when present, else the retry-shortly error.
    """
    key = cache_key_for(lat, lon, units)

    hit = get_cached(key)
    if hit is not None:
        return hit, True

    api_key = os.environ.get("OPENWEATHER_API_KEY")
    if not api_key:
        raise ServiceNotConfiguredError(
            "Weather service not configured (missing API key)"
        )

    try:
        _check_free_rpm()
    except UpstreamUnavailableError:
        stale = get_stale(key)
        if stale is not None:
            return stale, True
        raise

    base_params = {"lat": lat, "lon": lon, "units": units, "appid": api_key}
    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_current = pool.submit(
            _fetch_one, FREE_CURRENT_ENDPOINT, dict(base_params)
        )
        fut_forecast = pool.submit(
            _fetch_one, FREE_FORECAST_ENDPOINT, dict(base_params)
        )
        weather_raw, current_status = fut_current.result()
        forecast_raw, forecast_status = fut_forecast.result()

    if current_status == "unauthorized" or forecast_status == "unauthorized":
        raise UpstreamUnavailableError(ERROR_INVALID_KEY)

    if current_status != "ok" and forecast_status != "ok":
        stale = get_stale(key)
        if stale is not None:
            return stale, True
        raise UpstreamUnavailableError(ERROR_WEATHER_UNAVAILABLE)

    normalized = normalize_free_merged(
        weather_raw if isinstance(weather_raw, dict) else {},
        forecast_raw if isinstance(forecast_raw, dict) else {},
    )
    with _free_lock:
        _free_cache[key] = _CacheEntry(
            normalized=normalized, timestamp=time.time()
        )
    return normalized, False


# ---------------------------------------------------------------------------
# Gemini client (lazy) + bounded manual agent loop
# ---------------------------------------------------------------------------

_gemini_client: Any = None


def gemini_model_id() -> str:
    return os.environ.get("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)


def get_gemini_client() -> Any:
    """Lazy Gemini client. Raises ServiceNotConfiguredError if no key."""
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ServiceNotConfiguredError(ERROR_NOT_CONFIGURED)
    try:
        from google import genai
    except ImportError as exc:
        raise ServiceNotConfiguredError(ERROR_NOT_CONFIGURED) from exc
    _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def _build_tool_config() -> Any:
    from google.genai import types

    return types.Tool(function_declarations=[GET_WEATHER_TOOL_SCHEMA])


def _extract_function_calls(response: Any) -> List[Dict[str, Any]]:
    calls: List[Dict[str, Any]] = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            fc = getattr(part, "function_call", None)
            if fc is None:
                continue
            args = getattr(fc, "args", {}) or {}
            calls.append({"name": getattr(fc, "name", ""), "args": dict(args)})
    fn_calls = getattr(response, "function_calls", None)
    if not calls and fn_calls:
        for fc in fn_calls:
            args = getattr(fc, "args", {}) or {}
            calls.append({"name": getattr(fc, "name", ""), "args": dict(args)})
    return calls


def _response_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text
    chunks: List[str] = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if part_text:
                chunks.append(part_text)
    return "".join(chunks)


def _is_quota_error(exc: Exception) -> bool:
    message = f"{type(exc).__name__}: {exc}".lower()
    return (
        "429" in message
        or "quota" in message
        or "rate limit" in message
        or "resource_exhausted" in message
    )


def _gemini_retry_after(exc: Exception, default: int = 60) -> int:
    for attr in ("retry_after", "retry_delay"):
        value = getattr(exc, attr, None)
        if isinstance(value, (int, float)) and value > 0:
            return int(value)
    return default


MAX_RPM_DEFAULT = 15
_rpm_window_start: float = 0.0
_rpm_window_count: int = 0


def _check_gemini_rpm() -> None:
    """Global token-bucket (per-minute window) driven by GEMINI_MAX_RPM."""
    global _rpm_window_start, _rpm_window_count
    try:
        max_rpm = int(os.environ.get("GEMINI_MAX_RPM", str(MAX_RPM_DEFAULT)))
    except ValueError:
        max_rpm = MAX_RPM_DEFAULT
    now = time.time()
    if (now - _rpm_window_start) >= 60:
        _rpm_window_start = now
        _rpm_window_count = 0
    if _rpm_window_count >= max_rpm:
        retry_after = max(1, int(60 - (now - _rpm_window_start)))
        raise RateLimitedError(ERROR_SERVICE_BUSY, retry_after=retry_after)
    _rpm_window_count += 1


SYSTEM_PROMPT = (
    "You are iAlert, a helpful assistant for weather and disaster-risk "
    "questions. Answer concisely in the user's language. When a location is "
    "mentioned and current weather or forecast data would help, call "
    "get_weather_free with that place's latitude and longitude. "
    "Forecast steps are 3-hour intervals; state the time resolution when "
    "giving time-sensitive risk answers. "
    "If the user refers to a previous place, reuse the conversation context."
)


def run_chat_turn(
    message: str,
    session: ChatSession,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    units: str = "metric",
) -> Tuple[str, List[Dict[str, Any]]]:
    """Run one bounded chat turn. Returns (final_text, tool_calls).

    Raises BadRequestError (empty message / failed coord retry),
    ServiceNotConfiguredError (missing key), RateLimitedError (429),
    UpstreamUnavailableError (free-endpoint failure).
    """
    if not message or not message.strip():
        raise BadRequestError(ERROR_EMPTY_MESSAGE)

    explicit = resolve_coords(lat, lon, session)
    if lat is not None and lon is not None and explicit is None:
        raise BadRequestError(
            "Invalid coordinates: lat must be -90..90, lon -180..180"
        )

    client = get_gemini_client()
    _check_gemini_rpm()

    from google.genai import types

    history_text = "\n".join(
        f"{t['role']}: {t['text']}" for t in session.history
    )
    context_hint = ""
    if session.last_coords is not None:
        context_hint = (
            f"\n[Last known coordinates: lat={session.last_coords['lat']}, "
            f"lon={session.last_coords['lon']}]"
        )
    if explicit is not None:
        context_hint += (
            f"\n[User-provided coordinates for this turn: lat={explicit['lat']}, "
            f"lon={explicit['lon']}, units={units}]"
        )
    prompt = (
        f"{SYSTEM_PROMPT}\n\nConversation so far:\n{history_text}"
        f"{context_hint}\n\nuser: {message.strip()}"
    )

    tool_config = _build_tool_config()
    tool_calls: List[Dict[str, Any]] = []
    tool_used = False
    final_text = ""

    for _ in range(MAX_TOOL_ITERATIONS + 1):
        try:
            response = client.models.generate_content(
                model=gemini_model_id(),
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[tool_config],
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(
                        disable=True
                    ),
                ),
            )
        except Exception as exc:
            if _is_quota_error(exc):
                raise RateLimitedError(
                    ERROR_SERVICE_BUSY,
                    retry_after=_gemini_retry_after(exc),
                ) from exc
            raise UpstreamUnavailableError(
                "Assistant is unavailable right now, please try again later."
            ) from exc

        calls = _extract_function_calls(response)
        valid_call = next(
            (c for c in calls if c["name"] == "get_weather_free"), None
        )
        if valid_call is None:
            # Model asked for an unknown tool: one correction retry, then error.
            unknown = [c for c in calls if c["name"] != "get_weather_free"]
            if unknown and len(tool_calls) == 0:
                prompt += (
                    "\n[Only the get_weather_free tool is available. "
                    "Answer directly or call it with valid lat/lon.]"
                )
                continue
            final_text = _response_text(response) or ""
            break

        args = dict(valid_call["args"] or {})
        # Fill from resolution priority when the model omits coords.
        fallback = explicit or session.last_coords
        if ("lat" not in args or "lon" not in args) and fallback:
            args.setdefault("lat", fallback["lat"])
            args.setdefault("lon", fallback["lon"])
        args.setdefault("units", units)

        ok, err = validate_tool_args(args)
        if not ok:
            if len(tool_calls) == 0:
                prompt += (
                    f"\n[Tool call rejected: {err}. Retry once with valid "
                    "lat (-90..90), lon (-180..180), units metric/imperial, "
                    "or answer without tools.]"
                )
                continue
            raise BadRequestError(ERROR_LOCATION_RETRY)

        tool_lat = float(args["lat"])
        tool_lon = float(args["lon"])
        tool_units = str(args.get("units", units))
        normalized, cached = fetch_free(tool_lat, tool_lon, tool_units)
        tool_used = True
        tool_calls.append(
            {
                "name": "get_weather_free",
                "args": {
                    "lat": tool_lat,
                    "lon": tool_lon,
                    "units": tool_units,
                },
                "cached": cached,
            }
        )
        session.last_coords = {"lat": tool_lat, "lon": tool_lon}
        prompt += (
            f"\n[Tool get_weather_free result (cached={cached}): "
            f"{normalized}. Now answer the user concisely.]"
        )
        # Next loop iteration produces the final text; bound the loop.
        if len(tool_calls) >= MAX_TOOL_ITERATIONS:
            try:
                response = client.models.generate_content(
                    model=gemini_model_id(),
                    contents=prompt,
                )
            except Exception as exc:
                if _is_quota_error(exc):
                    raise RateLimitedError(
                        ERROR_SERVICE_BUSY,
                        retry_after=_gemini_retry_after(exc),
                    ) from exc
                raise UpstreamUnavailableError(
                    "Assistant is unavailable right now, please try again later."
                ) from exc
            final_text = _response_text(response) or ""
            break
    else:
        final_text = final_text or ERROR_LOCATION_RETRY

    if not final_text:
        final_text = ERROR_LOCATION_RETRY

    final_text = inject_attribution(final_text, tool_used)
    append_turn(session, "user", message.strip())
    append_turn(session, "assistant", final_text)
    return final_text, tool_calls
