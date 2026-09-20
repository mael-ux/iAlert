"""
iAlert — GenAI conversational agent module.

Server-side bounded manual function-calling loop against Gemini with a single
`get_weather_onecall` tool backed by the OpenWeather One Call API 3.0.

Design notes (see openspec/changes/genai-chatbot/design.md):
- Sessions are an in-memory dict, capped at the last 20 turns, lazy expiry.
- SDK automatic function calling is DISABLED; at most 2 tool iterations/turn.
- Gemini client init is lazy: a missing GEMINI_API_KEY surfaces as a
  chat-only 503, never a boot failure (existing routes stay live).
- Attribution ("Weather data provided by OpenWeather") is server-enforced:
  appended iff tool data was used in the turn.
"""

from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ATTRIBUTION_TEXT = "Weather data provided by OpenWeather"

ONECALL_ENDPOINT = "https://api.openweathermap.org/data/3.0/onecall"
ONECALL_EXCLUDE = "minutely,alerts"

CACHE_TTL_SECONDS = 12 * 60  # 12 minutes, inside the spec's 10-15 min window
MAX_TURNS_PER_SESSION = 20
MAX_TOOL_ITERATIONS = 2
SESSION_TTL_SECONDS = 24 * 60 * 60  # lazy expiry after 24h of inactivity
ONECALL_DAILY_QUOTA = 1000

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
ERROR_QUOTA_EXHAUSTED = (
    "Weather data is temporarily unavailable due to quota limits. "
    "Please try again later."
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
    "name": "get_weather_onecall",
    "description": (
        "Current weather plus hourly and daily forecast for a coordinate."
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
    """Validate get_weather_onecall args against bounds and schema.

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
# One Call cache + daily quota counter
# ---------------------------------------------------------------------------


@dataclass
class _CacheEntry:
    normalized: Dict[str, Any]
    timestamp: float


_onecall_cache: Dict[str, _CacheEntry] = {}
_onecall_calls_today: int = 0
_onecall_counter_day: Optional[str] = None


def cache_key_for(lat: float, lon: float, units: str) -> str:
    """0.1-degree grid key (same convention as backend /api/get-weather)."""
    return f"{round(lat * 10) / 10:.1f}:{round(lon * 10) / 10:.1f}:{units}"


def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _reset_daily_counter_if_new_day() -> None:
    global _onecall_calls_today, _onecall_counter_day
    today = _today_utc()
    if _onecall_counter_day != today:
        _onecall_counter_day = today
        _onecall_calls_today = 0


def get_cached(key: str, now: Optional[float] = None) -> Optional[Dict[str, Any]]:
    entry = _onecall_cache.get(key)
    if entry is None:
        return None
    now = time.time() if now is None else now
    if (now - entry.timestamp) > CACHE_TTL_SECONDS:
        _onecall_cache.pop(key, None)
        return None
    return entry.normalized


def get_stale(key: str) -> Optional[Dict[str, Any]]:
    """Return cached data regardless of TTL (quota-exhaustion fallback)."""
    entry = _onecall_cache.get(key)
    return entry.normalized if entry else None


def clear_onecall_cache() -> None:
    """Test helper: drop cache and reset the daily counter."""
    global _onecall_calls_today, _onecall_counter_day
    _onecall_cache.clear()
    _onecall_calls_today = 0
    _onecall_counter_day = None


# ---------------------------------------------------------------------------
# Response normalization
# ---------------------------------------------------------------------------


def _describe(weather_list: Any) -> str:
    if isinstance(weather_list, list) and weather_list:
        first = weather_list[0]
        if isinstance(first, dict):
            return str(first.get("description", ""))
    return ""


def normalize_onecall(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a raw One Call payload to the internal format.

    Output: {current: {temp, humidity, description}, hourly, daily}.
    Tolerant of missing sections (defaults to empty lists / None metrics).
    """
    current_raw = raw.get("current", {}) if isinstance(raw, dict) else {}
    current = {
        "temp": current_raw.get("temp"),
        "humidity": current_raw.get("humidity"),
        "description": _describe(current_raw.get("weather", [])),
    }

    hourly: List[Dict[str, Any]] = []
    for item in raw.get("hourly", []) or []:
        if not isinstance(item, dict):
            continue
        hourly.append(
            {
                "dt": item.get("dt"),
                "temp": item.get("temp"),
                "humidity": item.get("humidity"),
                "description": _describe(item.get("weather", [])),
            }
        )

    daily: List[Dict[str, Any]] = []
    for item in raw.get("daily", []) or []:
        if not isinstance(item, dict):
            continue
        temp_block = item.get("temp", {})
        daily.append(
            {
                "dt": item.get("dt"),
                "temp": temp_block if isinstance(temp_block, dict) else {},
                "humidity": item.get("humidity"),
                "description": _describe(item.get("weather", [])),
            }
        )

    return {"current": current, "hourly": hourly, "daily": daily}


def inject_attribution(response_text: str, tool_used: bool) -> str:
    """Append attribution iff tool data was used and it is not already there."""
    if not tool_used or ATTRIBUTION_TEXT in response_text:
        return response_text
    return f"{response_text}\n\n{ATTRIBUTION_TEXT}"


# ---------------------------------------------------------------------------
# One Call fetch (httpx, explicit timeouts)
# ---------------------------------------------------------------------------


def fetch_onecall(
    lat: float, lon: float, units: str = "metric"
) -> Tuple[Dict[str, Any], bool]:
    """Fetch normalized One Call data. Returns (normalized, cached).

    Raises UpstreamUnavailableError on transport/API failure, and
    ServiceNotConfiguredError when the One Call key is missing.
    On daily quota exhaustion, serves stale cache when available.
    """
    import httpx

    global _onecall_calls_today
    _reset_daily_counter_if_new_day()
    key = cache_key_for(lat, lon, units)

    hit = get_cached(key)
    if hit is not None:
        return hit, True

    api_key = os.environ.get("OPENWEATHER_ONE_CALL_API_KEY")
    if not api_key:
        raise ServiceNotConfiguredError(
            "Weather service not configured (missing One Call API key)"
        )

    if _onecall_calls_today >= ONECALL_DAILY_QUOTA:
        stale = get_stale(key)
        if stale is not None:
            return stale, True
        raise UpstreamUnavailableError(ERROR_QUOTA_EXHAUSTED)

    try:
        resp = httpx.get(
            ONECALL_ENDPOINT,
            params={
                "lat": lat,
                "lon": lon,
                "units": units,
                "exclude": ONECALL_EXCLUDE,
                "appid": api_key,
            },
            timeout=httpx.Timeout(10.0, connect=5.0),
        )
        resp.raise_for_status()
        raw = resp.json()
    except Exception as exc:
        stale = get_stale(key)
        if stale is not None:
            return stale, True
        raise UpstreamUnavailableError(ERROR_WEATHER_UNAVAILABLE) from exc

    _onecall_calls_today += 1
    normalized = normalize_onecall(raw if isinstance(raw, dict) else {})
    _onecall_cache[key] = _CacheEntry(
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
    "get_weather_onecall with that place's latitude and longitude. "
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
    UpstreamUnavailableError (One Call failure).
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
            (c for c in calls if c["name"] == "get_weather_onecall"), None
        )
        if valid_call is None:
            # Model asked for an unknown tool: one correction retry, then error.
            unknown = [c for c in calls if c["name"] != "get_weather_onecall"]
            if unknown and len(tool_calls) == 0:
                prompt += (
                    "\n[Only the get_weather_onecall tool is available. "
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
        normalized, cached = fetch_onecall(tool_lat, tool_lon, tool_units)
        tool_used = True
        tool_calls.append(
            {
                "name": "get_weather_onecall",
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
            f"\n[Tool get_weather_onecall result (cached={cached}): "
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
