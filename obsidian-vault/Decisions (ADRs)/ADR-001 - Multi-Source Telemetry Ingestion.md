# ADR-001: Multi-Source Telemetry Ingestion

- **Status**: Accepted
- **Deciders**: Core Engineering Team
- **Date**: 2026-09-28

---

## Context & Problem Statement
Previously, the 3D disaster globe depended solely on NASA EONET. EONET often has low event volume (~20-30 events globally), can experience multi-day latency for earthquakes, and its occasional downtime caused the globe to render completely blank.

## Decision Drivers
- High availability (never render an empty globe).
- Rich global coverage across earthquakes, floods, fires, cyclones, and volcanoes.
- Zero API cost (must run on free / public domain endpoints).
- Sub-second latency for seismic alerts.

## Considered Options
1. *Poll NASA EONET only with client retry*: Inadequate coverage and single point of failure.
2. *Direct client-side multi-API polling from mobile*: Heavy network traffic on device, high battery drain, CORS issues on web.
3. *Microservice aggregation with parallel fan-out and per-source caching*: Chosen.

## Decision Outcome
Implemented `AI/disasters/` in the FastAPI service with:
- Dedicated fetchers: `USGSFetcher` (Earthquakes), `GDACSFetcher` (Multi-hazard), `EONETFetcher` (NASA events), `FIRMSFetcher` (Active thermal anomalies).
- Canonical WGS84 normalization schema.
- Concurrent execution via Python `ThreadPoolExecutor`.
- 5-minute per-source in-memory caching with stale fallback on failure.

### Consequences
- **Positive**: 150+ live events rendered on the globe with source badges; zero downtime even if one agency fails.
- **Negative**: Server requires outbound internet access to USGS, GDACS, and NASA domains.

---

## Related Notes
- [[Core Concepts/Multi-Source Disaster Telemetry|Multi-Source Telemetry Ingestion]]
- [[Services/AI Service (FastAPI & Gemini)|AI Service]]
