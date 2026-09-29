# Feature: Multi-Source Real-Time Disaster Ingestion for Globe

**Branch**: `feat/multi-source-disasters`
**Status**: done
**Created**: 2026-09-28

## Overview
Ingest real-time natural disaster data from multiple authoritative global APIs (NASA EONET, USGS Earthquakes, GDACS, NASA FIRMS) in the AI service, normalize into a canonical shape, and render on the 3D mobile Globe with source identification and badges.

## Tasks

- [x] Task 1: Update GlobeMap component to consume multi-source disaster data and render source badges
  - Evidence: Commit 16e3b38 on `feat/multi-source-disasters`
- [x] Task 2: Create `AI/disasters/` module architecture with `BaseFetcher` and canonical normalization schema
  - Evidence: Commit 8e26e7b on `feat/multi-source-disasters`
- [x] Task 3: Implement `USGSFetcher` (`AI/disasters/usgs.py`) for global real-time earthquakes (GeoJSON)
  - Evidence: Commit 953526b on `feat/multi-source-disasters`
- [x] Task 4: Implement `GDACSFetcher` (`AI/disasters/gdacs.py`) for multi-hazard alerts (floods, cyclones, volcanoes, droughts)
  - Evidence: Commit bacc67c on `feat/multi-source-disasters`
- [x] Task 5: Implement `FIRMSFetcher` (`AI/disasters/firms.py`) for active wildfires with keyless graceful degradation
  - Evidence: Commit 995df9c on `feat/multi-source-disasters`
- [x] Task 6: Integrate unified multi-source ingestion into `AI/main.py` with parallel fan-out, per-source TTL cache, and partial failure tolerance
  - Evidence: Commit 31a6ff3 on `feat/multi-source-disasters`
- [x] Task 7: Smoke testing and contract verification of `/api/disasters` across all sources
  - Evidence: Commit 0ab45f5 on `feat/multi-source-disasters`
