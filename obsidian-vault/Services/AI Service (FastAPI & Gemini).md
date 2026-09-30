# AI Service (FastAPI & Gemini)

The AI service is a **FastAPI** application running on Python 3.11 that powers real-time multi-source disaster ingestion and the conversational disaster risk chatbot.

---

## Technical Stack

| Component | Library / Framework | Version / Notes |
|---|---|---|
| Web Framework | FastAPI | `0.115.5` |
| ASGI Server | Uvicorn (standard) | `0.32.1` |
| Schema Validation | Pydantic | `2.12.5` |
| GenAI SDK | `google-genai` | `2.23.0` (Official Google Gemini SDK) |
| HTTP Client | `httpx` | `0.28.1` (used for OpenWeather tool fan-out) |
| Ingestion Concurrency | `concurrent.futures.ThreadPoolExecutor` | Python standard library |

---

## Architecture & Subsystems

```
AI/
├── main.py                 # FastAPI application, routes, and error handlers
├── chat_agent.py           # GenAI conversational loop, function calling, rate limits
├── test_api.py             # Stdlib-only smoke check test suite
├── test_disasters.py       # Multi-source disaster unit test suite
├── test_chat.py            # Offline unit test suite for chat logic
├── fixtures/               # Test fixtures (EONET v2/v3, USGS, GDACS, FIRMS)
└── disasters/              # Disaster ingestion package
    ├── base.py             # BaseFetcher ABC, coordinate validator, canonical schema
    ├── eonet.py            # NASA EONET v2.1/v3 fetcher with proxy fallbacks
    ├── usgs.py             # USGS real-time earthquakes GeoJSON fetcher
    ├── gdacs.py            # GDACS multi-hazard alerts fetcher (GeoJSON & GeoRSS)
    ├── firms.py            # NASA FIRMS active fire satellite detection (CSV)
    └── service.py          # DisasterService: parallel fan-out, per-source cache
```

---

## Key Capabilities

### 1. Multi-Source Disaster Ingestion
- Ingests from **USGS**, **GDACS**, **NASA EONET**, and **NASA FIRMS**.
- Executes parallel calls across agencies via `ThreadPoolExecutor`.
- Implements a **5-minute per-source in-memory cache** with stale data fallback.
- Returns clean canonical JSON objects with standard categories and WGS84 coordinates.

### 2. Conversational Assistant (POST `/api/chat`)
- Backed by Google Gemini (`gemini-3.1-flash-lite` by default).
- Implements bounded manual function calling with the `get_weather_free` tool.
- Session memory retains the last 20 turns per user.
- Enforces mandatory attribution: *"Weather data provided by OpenWeather"*.
- Token authentication guard (`X-API-Key`) protecting against unauthorized remote use when `AI_SERVICE_API_KEY` is set.

---

## API Endpoints

- `GET /`: Health status and version.
- `GET /api/health`: Diagnostics with country counts.
- `GET /api/disasters/sources`: Lists integrated telemetry agencies (`eonet`, `gdacs`, `usgs`, `firms`).
- `GET /api/disasters?limit=150&days=30&sources=usgs,gdacs`: Aggregated disaster events.
- `POST /api/chat`: Conversational risk assistant (`{ message, session_id?, lat?, lon? }`).
- `GET /api/continents` & `GET /api/countries/{continent}`: Static country boundaries.

---

## Development Scripts

```bash
# Start server locally
uvicorn AI.main:app --host 0.0.0.0 --port 8000 --reload

# Run disaster ingestion unit tests
python3 AI/test_disasters.py

# Run offline chat unit tests
python3 AI/test_chat.py

# Run live endpoint smoke tests
python3 AI/test_api.py --live
```

---

## Related Notes
- [[Core Concepts/Multi-Source Disaster Telemetry|Multi-Source Telemetry Details]]
- [[External Integrations/Google Gemini & OpenWeather|Gemini & OpenWeather Integration]]
- [[Guides & Operations/Testing & CI Workflow|Testing & CI Workflow]]
