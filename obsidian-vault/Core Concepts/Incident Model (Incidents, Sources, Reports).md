# Incident Model (Incidents, Sources, Reports)

A central architectural decision in iAlert is the separation between **Incidents**, **Sources**, and **Reports**.

---

## Conceptual Model

```
                           ┌─────────────────────────────────┐
                           │            INCIDENT             │
                           │     "Wildfire in Jalisco"       │
                           │  Status: Active • Category: WF  │
                           │     Coords: 20.65°N, 103.35°W   │
                           └───────────────┬─────────────────┘
                                           │
                 ┌─────────────────────────┴─────────────────────────┐
                 │                                                   │
                 ▼ 1:N                                               ▼ 1:N
   ┌───────────────────────────┐                       ┌───────────────────────────┐
   │          SOURCES          │                       │          REPORTS          │
   │   (Official Telemetry)    │                       │     (Citizen Ground)      │
   ├───────────────────────────┤                       ├───────────────────────────┤
   │ • NASA FIRMS: Hotspot 42MW│                       │ • User @carlos: Photo     │
   │ • NASA EONET: Event #5124 │                       │ • User @ana: Smoke alert  │
   │ • GDACS: Forest Fire alert│                       │ • 4 community photos      │
   └───────────────────────────┘                       └───────────────────────────┘
```

---

## The Three Entities

### 1. The Incident (Entity of Record)
The **Incident** is the single truth representing a physical real-world hazard.
- It possesses its own lifecycle: `active` ➔ `contained` ➔ `resolved`.
- It holds aggregated metadata: centroid coordinates, severity level, start timestamp, and resolved timestamp.
- It can be created either automatically from sensor telemetry (e.g. an earthquake M6.0 detected by USGS) or from a citizen report.

### 2. Sources (Telemetry & Satellite)
**Sources** represent external agency observations.
- Each telemetry detection preserves its `source_name` (e.g. `usgs`, `gdacs`, `eonet`, `firms`), `external_event_id`, and exact raw JSON response.
- Multiple sources reporting on the same event attach to the same incident. This eliminates duplicate clutter on the map while preserving provenance.

### 3. Reports (Eyewitness Ground Truth)
**Reports** are human-generated field updates.
- Captured directly by citizens via the mobile app.
- Contain photos, eyewitness descriptions, device GPS coordinates, and verification status.
- Allow responders and affected communities to understand human impact on the ground beyond satellite readings.

---

## Why Separate Them?

| Problem in Naive Models | Solution in iAlert Model |
|---|---|
| A wildfire is reported by NASA EONET and FIRMS as two separate dots on the map. | Sources are grouped under one Incident; map shows one comprehensive marker. |
| User reports get mixed into machine telemetry. | Sources and Reports are distinct tables with different validation rules. |
| Deleting an obsolete source destroys eyewitness citizen history. | Cascade rules preserve citizen reports even if telemetry feeds rotate. |

---

## Related Notes
- [[Architecture/Database Schema & ERD|Database Schema]]
- [[Core Concepts/Proximity Aggregation (Haversine)|Proximity Clustering]]
- [[Decisions (ADRs)/ADR-002 - Incidents and Citizen Reports Separation|ADR-002]]
