# System Architecture Overview

The **iAlert** platform consists of three primary services operating in tandem with cloud-managed data stores and external telemetry feeds.

---

## High-Level Topology

```
                         ┌────────────────────────────────────────┐
                         │       Mobile App (Expo SDK 57)         │
                         │    • React Native 0.86 / React 19.2    │
                         │    • Three.js Interactive 3D Globe     │
                         │    • Citizen Camera & GPS Reporting    │
                         └─────────────────┬──────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
                    ▼                                             ▼
     ┌─────────────────────────────┐               ┌─────────────────────────────┐
     │      Backend API (Node)     │               │      AI Service (Python)    │
     │      Port: 5001 / Express 5 │               │      Port: 8000 / FastAPI   │
     └──────────────┬──────────────┘               └──────────────┬──────────────┘
                    │                                             │
      ┌─────────────┴─────────────┐                 ┌─────────────┴─────────────┐
      ▼                           ▼                 ▼                           ▼
┌───────────┐               ┌───────────┐     ┌───────────┐               ┌───────────┐
│   Neon    │               │   Clerk   │     │  Google   │               │ Global    │
│ Postgres  │               │   Auth    │     │  Gemini   │               │ Telemetry │
│ (Drizzle) │               │ Webhooks  │     │ 3.1 Flash │               │ USGS/GDACS│
└───────────┘               └───────────┘     └───────────┘               │ EONET/FIRMS
                                                                          └───────────┘
```

---

## Service Inventory

| Service | Technology Stack | Canonical Port / URL | Primary Responsibility |
|---|---|---|---|
| [[Services/Mobile App (Expo SDK 57)\|Mobile App]] | Expo SDK 57, React Native 0.86, expo-router, Three.js | Port `8081` (Metro) | Citizen mobile client, interactive 3D Globe, hazard reporting, emergency settings. |
| [[Services/Backend API (Express & Drizzle)\|Backend API]] | Node.js 20 ESM, Express 5, Drizzle ORM | Port `5001` (`/api`) | Relational incident management, citizen report ingestion, user interest zones, NASA photo cache. |
| [[Services/AI Service (FastAPI & Gemini)\|AI Service]] | Python 3.11, FastAPI, `google-genai` | Port `8000` (`/api`) | Real-time multi-source telemetry ingestion, concurrent API fan-out, conversational weather/disaster AI chat. |
| **Neon PostgreSQL** | Cloud Serverless PostgreSQL | SSL pooled connection | Relational data persistence, spatial indexing, cascade integrity. |
| **Clerk Auth** | Clerk OAuth & JWT SDK | Cloud | User authentication, identity tokens, account management. |

---

## Core Principles

1. **Independent Microservices**: The AI service and Backend API run decoupled. If the AI service is unavailable, users can still access saved zones and submit reports. If the backend is updating, the Globe can still fetch real-time telemetry from the AI service.
2. **Resilience Through Graceful Degradation**: External telemetry feeds (NASA, USGS, GDACS) can experience rate limits or downtime. The AI service uses per-source timeouts, circuit-breaking, and stale cache fallbacks to ensure the Globe never renders an empty screen.
3. **Citizen + Sensor Ground Truth**: A natural disaster event is validated both from space/sismographs (API telemetry) and from the ground (eyewitness citizen photos and geolocation).

---

## Related Notes
- [[Architecture/Data Flow|Data Flow and Lifecycle]]
- [[Architecture/Database Schema & ERD|Database Schema and ERD]]
- [[Core Concepts/Incident Model (Incidents, Sources, Reports)|Incident Model]]
