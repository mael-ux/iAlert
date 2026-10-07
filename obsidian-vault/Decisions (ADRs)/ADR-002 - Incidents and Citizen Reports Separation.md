# ADR-002: Incidents, Sources, and Citizen Reports Separation

- **Status**: Accepted
- **Deciders**: Core Engineering Team
- **Date**: 2026-09-29

---

## Context & Problem Statement
The platform needed to integrate user-submitted field observations (photos, descriptions, emergency requests) with official satellite and sensor telemetry without creating duplicated clutter or mixing unverified community input directly with official agency data.

## Decision Outcome
Adopted a three-tier relational model in PostgreSQL with Drizzle ORM:
1. `incidents`: The parent entity representing the physical event in time and space.
2. `incident_sources`: External agency telemetry linked to the incident (1:N, cascade delete).
3. `incident_reports`: Citizen eyewitness submissions linked to the incident (1:N, set null on delete).

Implemented proximity matching using the Haversine formula (~35 km threshold):
- A new citizen report automatically attaches to an active incident within 35 km of the same category.
- If none exists, a new incident is created.

### Consequences
- **Positive**: Clean separation of concerns; provenance of telemetry is preserved; reports from multiple citizens enrich the same incident; map remains uncluttered.
- **Negative**: Requires spatial proximity calculation on report submission.

---

## Related Notes
- [[Core Concepts/Incident Model (Incidents, Sources, Reports)|Incident Model Concept]]
- [[Architecture/Database Schema & ERD|Database Schema]]
