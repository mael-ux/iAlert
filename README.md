# 🌋 iAlert — Real-Time Natural Disaster Monitoring & Community Response

[![CI](https://github.com/mael-ux/iAlert/actions/workflows/ci.yml/badge.svg)](https://github.com/mael-ux/iAlert/actions/workflows/ci.yml)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000.svg?logo=expo)](https://expo.dev)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?logo=react)](https://reactnative.dev)
[![Express 5](https://img.shields.io/badge/Express-5.1-black.svg?logo=express)](https://expressjs.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Neon Postgres](https://img.shields.io/badge/Neon-PostgreSQL-00E599.svg?logo=postgresql)](https://neon.tech)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini%203.1-4285F4.svg?logo=google)](https://ai.google.dev)

**iAlert** is an open-source, full-stack disaster monitoring platform that unifies real-time satellite telemetry with citizen field reports. It visualizes global natural hazards (earthquakes, cyclones, floods, wildfires, volcanoes) on an interactive 3D Globe, aggregates eyewitness observations via GPS and camera, and provides conversational risk assessment powered by Google Gemini.

---

## 🏗️ System Architecture

```
                          ┌────────────────────────────────────────┐
                          │       Mobile App (Expo SDK 57)         │
                          │   • React Native 0.86 / React 19.2     │
                          │   • Interactive Three.js 3D Globe      │
                          │   • Citizen Camera & GPS Reporting     │
                          └───────────────────┬────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     │                                                 │
                     ▼                                                 ▼
      ┌─────────────────────────────┐                   ┌─────────────────────────────┐
      │      Backend API (Node)     │                   │      AI Service (Python)    │
      │      Port: 5001 / Express 5 │                   │      Port: 8000 / FastAPI   │
      └──────────────┬──────────────┘                   └──────────────┬──────────────┘
                     │                                                 │
       ┌─────────────┴─────────────┐                     ┌─────────────┴─────────────┐
       ▼                           ▼                     ▼                           ▼
 ┌───────────┐               ┌───────────┐         ┌───────────┐               ┌───────────┐
 │   Neon    │               │   Clerk   │         │  Google   │               │ Global    │
 │ Postgres  │               │   Auth    │         │  Gemini   │               │ Telemetry │
 │ (Drizzle) │               │ Webhooks  │         │ 3.1 Flash │               │ USGS/GDACS│
 └───────────┘               └───────────┘         └───────────┘               │ EONET/FIRMS
                                                                               └───────────┘
```

| Service | Technology | Port | Responsibilities |
|---|---|---|---|
| **Mobile Client** | Expo SDK 57, React Native 0.86, Three.js, Clerk | `8081` | 3D Globe visualization, citizen reporting, weather forecast, conversational AI chat, user preferences. |
| **Backend API** | Node.js 20 ESM, Express 5, Drizzle ORM, Svix | `5001` | Relational incidents, citizen reports, Haversine proximity clustering, alert pipeline, Clerk sync. |
| **AI Service** | Python 3.11, FastAPI, Uvicorn, Google Gemini | `8000` | Real-time multi-source disaster ingestion (USGS, GDACS, EONET, FIRMS), function-calling conversational assistant. |
| **Neon PostgreSQL** | Serverless Cloud PostgreSQL | — | Spatial indexing, cascade deletion rules, audit history, APOD gallery cache. |

---

## ✨ Key Features

- 🌍 **Interactive 3D Disaster Globe**: Visualizes 150+ live natural hazards globally with distinct category colors, severity badges, agency tags, and desktop browser support via Three.js.
- 📡 **Multi-Source Real-Time Telemetry**: Concurrent parallel ingestion across authoritative agencies with automatic 5-minute caching:
  - **USGS**: Sub-second global earthquakes (M2.5+) with depth and tsunami warnings.
  - **GDACS**: Tropical cyclones, hurricanes, floods, droughts, and volcanic eruptions.
  - **NASA EONET**: Satellite-observed natural events, severe storms, landslides, and ice changes.
  - **NASA FIRMS**: Satellite thermal anomaly detection and active wildfire hotspots (VIIRS/MODIS).
- 📢 **Citizen Hazard Reporting**: Community members submit eyewitness observations with high-accuracy GPS coordinates, camera/gallery photos (`expo-image-picker`), and urgency notes.
- 📍 **Proximity Clustering (Haversine)**: Automatically links incoming citizen reports to active incidents within ~35 km of the same category, or creates a new incident.
- 💬 **Conversational Disaster AI Assistant**: Google Gemini assistant with bounded function calling to real-time OpenWeather data, session memory, and bilingual support.
- 🔔 **Geofenced Emergency Notifications**: Polling pipeline checking for active disasters within user-configured interest zones and proximity thresholds.

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v20+ and npm
- **Python**: 3.11+ and pip
- **Expo Go App** (SDK 57) on your mobile device (or open in desktop browser)

### 2. Environment Configuration

```bash
# 1. AI Service secrets
cat << 'EOF' > AI/.env
GEMINI_API_KEY=AIzaSy...           # Free from https://aistudio.google.com/
GEMINI_MODEL=gemini-3.1-flash-lite
EOF

# 2. Backend API secrets
cat << 'EOF' > backend/.env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require
EOF

# 3. Mobile secrets
cat << 'EOF' > mobile/.env.local
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...$
EXPO_PUBLIC_AI_API_URL=http://<YOUR_LOCAL_IP>:8000
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5001/api
EOF
```

### 3. Run the Ecosystem

Open three terminal windows:

```bash
# Terminal 1: AI Service
uvicorn AI.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Backend API
cd backend && npm run dev

# Terminal 3: Mobile App
cd mobile && npx expo start -c
```

Press **`w`** in Terminal 3 to open in your desktop browser at `http://localhost:8081`, or scan the QR code with **Expo Go** on your smartphone.

---

## 🧪 Testing & CI

Run the complete test suite across all three services with a single command from the root directory:

```bash
npm test
```

This sequentially executes:
1. `npm run test:ai`: Unit test suite (9/9 passing) and offline chat contract checks (9/9 passing).
2. `npm run test:backend`: Haversine geographic calculation and proximity clustering tests.
3. `npm run test:mobile`: TypeScript verification under strict mode with zero type errors.

Continuous Integration runs automatically on GitHub Actions (`.github/workflows/ci.yml`) on every pull request against `main`.

---

## 📡 API Reference Summary

### AI Service (`http://localhost:8000`)
- `GET /api/disasters`: Aggregated multi-source disaster events (`?limit=150&days=30&sources=usgs,gdacs`).
- `GET /api/disasters/sources`: List active telemetry agencies.
- `POST /api/chat`: Conversational disaster-risk assistant with Gemini function calling.
- `GET /api/health`: AI service health diagnostics.

### Backend API (`http://localhost:5001/api`)
- `GET /api/incidents`: List active incidents with joined sources and citizen report counts.
- `GET /api/incidents/:id`: Detailed view of an incident with all linked telemetry and citizen reports.
- `POST /api/reports`: Submit an eyewitness disaster report with photo and coordinates.
- `GET /api/alerts/check-new/:userId`: Geofenced active hazard polling endpoint.
- `GET /api/photoOfTheDay`: Random APOD space image from database cache.

---

## 📚 Deep-Dive Documentation: Obsidian Vault

For complete internal documentation, architectural decision records (ADRs), ERDs, and integration details, open the **`obsidian-vault/`** directory in [Obsidian](https://obsidian.md):

- 📖 **Start Here**: [`obsidian-vault/00 - Start Here.md`](obsidian-vault/00%20-%20Start%20Here.md)
- 🏗️ **Architecture**: [`obsidian-vault/Architecture/`](obsidian-vault/Architecture/)
- 📜 **ADRs**: [`obsidian-vault/Decisions (ADRs)/`](obsidian-vault/Decisions%20(ADRs)/)
- 🛠️ **Troubleshooting & FAQs**: [`obsidian-vault/Guides & Operations/Troubleshooting & FAQs.md`](obsidian-vault/Guides%20&%20Operations/Troubleshooting%20&%20FAQs.md)

---

## 📄 License

This project is licensed under the terms of the MIT License.
