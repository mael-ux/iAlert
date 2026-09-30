# Google Gemini & OpenWeather Integration

The conversational disaster risk assistant (`AI/chat_agent.py`) combines Google Gemini's reasoning capabilities with OpenWeather's free real-time weather and forecast endpoints.

---

## 1. Google Gemini SDK (`google-genai`)
- **SDK**: `google-genai` `^2.23.0` (Official Google GenAI SDK).
- **Default Model**: `gemini-3.1-flash-lite` (supports high free-tier rate limits, low latency).
- **Environment Variable**: `GEMINI_API_KEY`.
- **Lazy Initialization**: If `GEMINI_API_KEY` is missing, only `/api/chat` returns 503; all other endpoints remain fully functional.

---

## 2. Tool Definition: `get_weather_free`

The Gemini model is provided a single bounded function tool:

```python
GET_WEATHER_TOOL_SCHEMA = {
    "name": "get_weather_free",
    "description": "Current weather plus 3-hourly forecast (next ~48h) and derived daily aggregates for a coordinate.",
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
```

---

## 3. Parallel Fan-Out to OpenWeather Endpoints

When the model calls `get_weather_free(lat, lon)`:
1. `fetch_free()` spawns two parallel worker threads via `ThreadPoolExecutor`:
   - `https://api.openweathermap.org/data/2.5/weather` (Current conditions).
   - `https://api.openweathermap.org/data/2.5/forecast` (5-day / 3-hour forecast).
2. Payloads are normalized and merged into `{ current, hourly, daily }`.
3. Output is cached in a 0.1-degree grid key for 5 minutes (`CACHE_TTL_SECONDS = 300`).
4. **Mandatory Attribution**: The system strictly injects `"Weather data provided by OpenWeather"` into any turn where tool data was used.

---

## Related Notes
- [[Services/AI Service (FastAPI & Gemini)|AI Service Overview]]
- [[Guides & Operations/Environment Variables Guide|Environment Variables]]
