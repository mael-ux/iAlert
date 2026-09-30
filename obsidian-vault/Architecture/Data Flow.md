# Data Flow & Lifecycle

This document describes how telemetry and citizen reports travel through iAlert, how incidents are born, and how data is delivered to the user.

---

## 1. Multi-Source Disaster Telemetry Flow

```
[ USGS Feed ]  ──┐
[ GDACS Feed ] ──┼──► [ DisasterService (AI Service) ] ──► [ 5-Minute In-Memory Cache ]
[ EONET Feed ] ──┤        • Parallel ThreadPoolExecutor
[ FIRMS Feed ] ──┘        • Standard WGS84 Normalization
                                   │
                                   ▼
                         [ GET /api/disasters ]
                                   │
                                   ▼
                       [ 3D Globe Visualization ]
                         • Markers rendered by category
                         • Telemetry badges (USGS, GDACS, etc.)
```

1. **Scheduled or On-Demand Fetch**: When a user opens the Globe, the client requests `GET /api/disasters`.
2. **Concurrent Ingestion**: `DisasterService` polls external agencies in parallel worker threads with bounded timeouts.
3. **Canonical Normalization**: All raw payloads are converted to uniform WGS84 coordinate pairs, standard category slugs, severity levels, and magnitude readings.
4. **Caching Layer**: Results are cached in memory for 300 seconds (5 minutes) to avoid exhausting third-party rate limits.

---

## 2. Citizen Field Reporting Flow

```
[ Citizen on Scene ]
       │
       ▼
[ Mobile App: Report Screen ]
       │ • Camera photo capture (expo-image-picker)
       │ • High-accuracy GPS capture (expo-location)
       │ • Hazard category & descriptive notes
       │
       ▼
[ POST /api/reports (Backend API) ]
       │
       ├─► [ Haversine Proximity Check (~35km radius) ]
       │         │
       │         ├─► MATCH FOUND ──► [ Link report to existing Incident ID ]
       │         │
       │         └─► NO MATCH ──► [ Create new Incident in 'active' status ]
       │
       ▼
[ Stored in Neon PostgreSQL ]
       • incidentsTable
       • incidentReportsTable
```

1. **Capture**: The citizen snaps a photo, the app reads their latitude/longitude, and selects a category (e.g. `floods`, `wildfires`).
2. **Submission**: Payload is sent via authenticated `POST /api/reports`.
3. **Clustering & Incident Association**:
   - The backend checks for any active incident in the database sharing the same category within a 35 km radius.
   - If found, the report is attached to the existing incident and increments its `reportCount`.
   - If no active incident exists nearby, a new incident is created automatically.

---

## 3. Unified Incident Detail Flow (Globe Inspection)

```
[ User clicks marker on 3D Globe ]
       │
       ▼
[ GlobeMap Inspection Modal ]
       │
       ├─► 1. Display Selected Telemetry (Magnitude, Source, Severity)
       ├─► 2. Compute Nearby Corroborating Telemetry (~200km radius)
       └─► 3. Call-to-Action: "Report Observations for this Zone"
                 │
                 ▼
       [ Navigates to /report with pre-pinned zone ]
```

---

## Related Notes
- [[Architecture/Overview|System Architecture Overview]]
- [[Core Concepts/Proximity Aggregation (Haversine)|Haversine Proximity Algorithm]]
- [[Core Concepts/Incident Model (Incidents, Sources, Reports)|Incident Model]]
