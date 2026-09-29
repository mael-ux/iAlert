# Feature: Multi-Source Real-Time Disaster Ingestion for Globe

**Branch**: `feat/multi-source-disasters`
**Status**: in_progress
**Created**: 2026-09-28

## Overview
Ingest real-time natural disaster data from multiple authoritative global APIs (NASA EONET, USGS Earthquakes, GDACS, NASA FIRMS) in the AI service, normalize into a canonical shape, and render on the 3D mobile Globe with source identification and badges.

## Tasks

- [ ] Task 1: Update GlobeMap component to consume multi-source disaster data and render source badges
  - Evidence: Commit on `feat/multi-source-disasters`
- [ ] Task 2: Create `AI/disasters/` module architecture with `BaseFetcher` and canonical normalization schema
  - Evidence: Commit on `feat/multi-source-disasters`
- [ ] Task 3: Implement `USGSFetcher` (`AI/disasters/usgs.py`) for global real-time earthquakes (GeoJSON)
  - Evidence: Commit on `feat/multi-source-disasters`
- [ ] Task 4: Implement `GDACSFetcher` (`AI/disasters/gdacs.py`) for multi-hazard alerts (floods, cyclones, volcanoes, droughts)
  - Evidence: Commit on `feat/multi-source-disasters`
- [ ] Task 5: Implement `FIRMSFetcher` (`AI/disasters/firms.py`) for active wildfires with keyless graceful degradation
  - Evidence: Commit on `feat/multi-source-disasters`
- [ ] Task 6: Integrate unified multi-source ingestion into `AI/main.py` with parallel fan-out, per-source TTL cache, and partial failure tolerance
  - Evidence: Commit on `feat/multi-source-disasters`
- [ ] Task 7: Smoke testing and contract verification of `/api/disasters` across all sources
  - Evidence: Commit on `feat/multi-source-disasters`
