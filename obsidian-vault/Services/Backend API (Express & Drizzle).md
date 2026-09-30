# Backend API (Express & Drizzle)

The backend is an **Express 5** application written in native ECMAScript Modules (ESM) that manages relational disaster data, user interest zones, alert configurations, and webhook synchronization.

---

## Technical Stack

| Component | Technology | Version / Notes |
|---|---|---|
| Server Runtime | Node.js | v20+ / ESM modules (`type: "module"`) |
| Web Framework | Express | `^5.1.0` |
| ORM | Drizzle ORM | `^0.44.7` |
| Database Engine | PostgreSQL via Neon serverless | `@neondatabase/serverless` `^1.0.0` |
| Migration Tooling | Drizzle Kit | `^0.31.1` |
| Webhook Verification | Svix | `^1.81.0` (for Clerk webhooks) |
| CORS | `cors` | `^2.8.5` (enabled for Web & Mobile clients) |

---

## Canonical Configuration

- **Default Port**: `5001` (configured via `ENV.PORT`).
- **Environment config**: Loaded via `backend/src/config/env.js`.
- **Database client**: Initialized via `@neondatabase/serverless` in `backend/src/config/db.js`.
- **CORS enabled**: Supports cross-origin requests from `http://localhost:8081` (Expo Web) and mobile IP origins.

---

## API Routes & Endpoints

### 1. Health & Diagnostics
- `GET /api/health`: Returns server status and current ISO timestamp.

### 2. Incidents & Citizen Reports (`routes/incidents.routes.js`)
- `GET /api/incidents`: List incidents filtered by `status` (default: `active`), `category`, and `limit`. Includes joined `sources` and aggregated `reportCount`.
- `GET /api/incidents/:id`: Returns full incident detail with all telemetry sources and chronological citizen reports.
- `POST /api/reports`: Submits an eyewitness citizen report. Uses the Haversine formula (~35 km radius) to associate the report with an existing active incident or create a new one.

### 3. Disaster Alerts & Preferences (`routes/alerts.routes.js`)
- `GET /api/alerts/config/:userId`: Retrieves user notification preferences (volume, vibration, types).
- `POST /api/alerts/config/:userId`: Upserts user alert preferences.
- `GET /api/alerts/check-new/:userId`: Real-time polling endpoint to check for active hazards within user geofenced radius.

### 4. Photos of the Day & Weather Cache
- `GET /api/photoOfTheDay`: Random APOD space image from database.
- `GET /api/photos`: Full gallery list.
- `POST /api/get-weather`: Queries OpenWeatherMap with 0.1-degree grid caching in PostgreSQL.
- `GET /api/search-city`: Proxies OpenWeatherMap direct geocoding.

### 5. Webhooks (`routes/webhooks.js`)
- `POST /api/webhooks`: Verified via Svix to synchronize Clerk user creations, updates, and deletions into the `users` table.

---

## Development Scripts

```bash
cd backend
npm install               # Install dependencies
npm run dev               # Start server with nodemon on port 5001
npm test                  # Run proximity calculations test
npx drizzle-kit push      # Push schema changes to Neon
```

---

## Related Notes
- [[Architecture/Database Schema & ERD|Database Schema and ERD]]
- [[Core Concepts/Proximity Aggregation (Haversine)|Proximity Clustering Algorithm]]
- [[Guides & Operations/Environment Variables Guide|Environment Variables Guide]]
