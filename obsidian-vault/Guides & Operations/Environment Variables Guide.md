# Environment Variables Reference Guide

All environment secrets are ignored by Git in `.gitignore` (`.env`, `.env.local`, `backend/.env`).

---

## 1. AI Service (`AI/.env`)

| Variable | Required | Description | Default |
|---|---|---|---|
| `GEMINI_API_KEY` | Optional | Google Gemini API key for conversational agent. | None (surfaces as 503 on `/api/chat` only) |
| `GEMINI_MODEL` | Optional | Google Gemini model ID. | `gemini-3.1-flash-lite` |
| `OPENWEATHER_API_KEY` | Optional | Real-time weather data for Gemini tools. | None |
| `FIRMS_MAP_KEY` | Optional | NASA FIRMS API key for active fire CSV feed. | None (gracefully returns empty list) |
| `AI_SERVICE_API_KEY` | Optional | Token authorization guard (`X-API-Key`). | None (open for local dev) |

---

## 2. Backend API (`backend/.env`)

| Variable | Required | Description | Default |
|---|---|---|---|
| `PORT` | Optional | HTTP port for Express server. | `5001` |
| `NODE_ENV` | Optional | Environment mode (`development`, `production`). | `development` |
| `DATABASE_URL` | **Required** | PostgreSQL connection URI for Neon with SSL. | None |
| `OPENWEATHER_API_KEY` | Optional | OpenWeather key for `/api/get-weather` grid cache. | None |
| `CLERK_WEBHOOK_SECRET` | Optional | Svix signing secret for Clerk webhooks. | None |
| `KEEP_ALIVE` | Optional | Activates self health-ping and photo cron jobs. | `true` in prod, `false` otherwise |

---

## 3. Mobile App (`mobile/.env.local`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Required** | Clerk public key for auth provider. | `pk_test_...$` |
| `EXPO_PUBLIC_AI_API_URL` | Optional | Target URL for AI & telemetry service. | `http://192.168.1.231:8000` |
| `EXPO_PUBLIC_API_URL` | Optional | Target URL for Backend Express service. | `http://192.168.1.231:5001/api` |
| `EXPO_PUBLIC_AI_SERVICE_KEY` | Optional | Sent as `X-API-Key` to AI service. | None |

---

## Related Notes
- [[Guides & Operations/Local Development Setup|Local Development Setup]]
- [[Architecture/Overview|System Architecture Overview]]
