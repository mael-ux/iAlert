# 🌋 iAlert Knowledge Vault

Welcome to the internal documentation vault for **iAlert** — a comprehensive real-time natural disaster monitoring, citizen reporting, and community response platform.

This vault contains technical documentation, system architecture notes, integration guides, database schemas, and architectural decision records (ADRs).

---

## 🗺️ Map of Content (MOC)

### 1. 🏗️ Architecture & Data Layer
- [[Architecture/Overview|System Architecture Overview]]: High-level microservices topology.
- [[Architecture/Data Flow|Data Flow & Lifecycle]]: How telemetry and citizen reports become consolidated incidents.
- [[Architecture/Database Schema & ERD|Database Schema & ERD]]: Neon PostgreSQL relational model with Drizzle ORM.

### 2. 🧩 Services Breakdown
- [[Services/Mobile App (Expo SDK 57)|Mobile App]]: Expo SDK 57, React Native 0.86, Three.js 3D Globe, Clerk Auth.
- [[Services/Backend API (Express & Drizzle)|Backend API]]: Node.js ESM Express 5 server, Drizzle ORM, CORS, alert pipelines.
- [[Services/AI Service (FastAPI & Gemini)|AI & Disaster Telemetry Service]]: Python 3.11, FastAPI, Google Gemini, multi-source ingestion.

### 3. 🎯 Core Concepts & Algorithms
- [[Core Concepts/Incident Model (Incidents, Sources, Reports)|Incident Model]]: Tripartite architecture (Incidents, Sources, Reports).
- [[Core Concepts/Multi-Source Disaster Telemetry|Multi-Source Telemetry Ingestion]]: Normalization strategy across global disaster agencies.
- [[Core Concepts/Proximity Aggregation (Haversine)|Proximity Matching & Clustering]]: How nearby reports and telemetry are clustered into single incidents.

### 4. 🌐 External Integrations
- [[External Integrations/USGS Earthquakes|USGS Earthquake Hazards Program]]: Sub-second M2.5+ earthquake feeds.
- [[External Integrations/GDACS|GDACS]]: Global Disaster Alert and Coordination System (cyclones, floods, droughts, volcanoes).
- [[External Integrations/NASA EONET|NASA EONET]]: Earth Observatory Natural Event Tracker (fires, storms, volcanoes).
- [[External Integrations/NASA FIRMS|NASA FIRMS]]: Satellite thermal anomaly and active wildfire detection (VIIRS/MODIS).
- [[External Integrations/Google Gemini & OpenWeather|Google Gemini & OpenWeather]]: Conversational natural disaster risk assessment assistant.
- [[External Integrations/Clerk Authentication|Clerk Authentication]]: Identity provider, secure tokens, user profiles.

### 5. 🛠️ Guides & Operations
- [[Guides & Operations/Local Development Setup|Local Development Setup]]: Step-by-step setup for running the complete ecosystem locally.
- [[Guides & Operations/Environment Variables Guide|Environment Variables Reference]]: Required and optional environment secrets.
- [[Guides & Operations/Testing & CI Workflow|Testing & CI Pipeline]]: Unit tests, smoke tests, and GitHub Actions CI.
- [[Guides & Operations/Troubleshooting & FAQs|Troubleshooting & FAQs]]: Solutions to common local issues (Expo Go SDK mismatches, CORS, DB connections).

### 6. 📜 Decisions (ADRs)
- [[Decisions (ADRs)/ADR-001 - Multi-Source Telemetry Ingestion|ADR-001]]: Multi-Source Telemetry Ingestion.
- [[Decisions (ADRs)/ADR-002 - Incidents and Citizen Reports Separation|ADR-002]]: Incident, Source, and Citizen Report Separation.
- [[Decisions (ADRs)/ADR-003 - Expo SDK 57 Upgrade|ADR-003]]: Expo SDK 57 & React 19 Upgrade.

---

## 🏷️ System Tags
- `#architecture` `#backend` `#mobile` `#ai` `#database` `#disaster-data` `#clerk` `#drizzle`
