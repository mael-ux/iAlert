# Multi-Source Disaster Telemetry

This document details the multi-source ingestion pipeline implemented in `AI/disasters/`.

---

## Supported Disaster Agencies

| Agency | Protocol | Categories Covered | Update Frequency |
|---|---|---|---|
| **USGS** | GeoJSON REST | Earthquakes, Tsunamis | Real-time (sub-second) |
| **GDACS** | GeoJSON & GeoRSS | Cyclones, Floods, Droughts, Volcanoes, Earthquakes | ~15-30 minutes |
| **NASA EONET** | JSON REST (v2/v3) | Wildfires, Severe Storms, Sea Ice, Landslides | Several times daily |
| **NASA FIRMS** | CSV REST (VIIRS/MODIS) | Active Wildfires (thermal hotspots) | ~3-6 hours (satellite passes) |

---

## Normalization Contract (`AI/disasters/base.py`)

Every raw event from any agency is converted into a standard dictionary:

```python
{
    "id": str,                  # Unique namespaced ID, e.g. "usgs-us6000ty8z"
    "title": str,               # Human-readable title
    "description": str,         # Incident summary
    "category": str,            # Standard category slug (see below)
    "lat": float,               # WGS84 Latitude [-90.0 .. 90.0]
    "lng": float,               # WGS84 Longitude [-180.0 .. 180.0]
    "date": str,                # ISO 8601 UTC timestamp
    "link": str,                # Official bulletin / agency link
    "source": str,              # Agency identifier ("usgs", "gdacs", "eonet", "firms")
    "severity": str,            # "critical", "high", "medium", "low"
    "magnitude": float | None   # Physical reading (Richter scale, FRP MW, wind km/h)
}
```

### Canonical Categories
- `wildfires`
- `volcanoes`
- `severeStorms`
- `floods`
- `earthquakes`
- `landslides`
- `drought`
- `cyclone`
- `tsunami`
- `tempExtremes`
- `seaLakeIce`
- `dustHaze`
- `manmade` (fallback category)

---

## Resilience & Caching Strategy

```
User Request
     │
     ▼
[ DisasterService.fetch_all ]
     │
     ├─► Check In-Memory Cache (TTL: 300 seconds)
     │       └── If fresh ──► Return cached result immediately (< 5ms)
     │
     └─► If stale/expired ──► Launch ThreadPoolExecutor
             │
             ├── Thread 1: EONETFetcher.fetch() (Timeout: 15s)
             ├── Thread 2: GDACSFetcher.fetch() (Timeout: 15s)
             ├── Thread 3: USGSFetcher.fetch()  (Timeout: 10s)
             └── Thread 4: FIRMSFetcher.fetch() (Timeout: 12s)
                     │
                     ▼
             Merge successful results, record counts, and update cache
```

- **Partial Failure Immunity**: If one agency experiences downtime (e.g. NASA server maintenance), the service catches the error, logs a warning, and delivers events from the surviving sources.
- **Stale Fallback**: If an agency fails, the service can serve the last known good cached entries.

---

## Related Notes
- [[Services/AI Service (FastAPI & Gemini)|AI Service Architecture]]
- [[Decisions (ADRs)/ADR-001 - Multi-Source Telemetry Ingestion|ADR-001]]
