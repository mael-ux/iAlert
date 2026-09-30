# Database Schema & ERD

The iAlert database runs on serverless **PostgreSQL** (hosted on [Neon](https://neon.tech)) managed through **Drizzle ORM** (`backend/src/dataBase/schema.js`).

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────┐       1:N       ┌─────────────────────┐
│      incidents      │─────────────────┤  incident_sources   │
├─────────────────────┤                 ├─────────────────────┤
│ id (PK, serial)     │                 │ id (PK, serial)     │
│ title (text)        │                 │ incident_id (FK)    │
│ category (text)     │                 │ source_name (text)  │
│ latitude (numeric)  │                 │ external_event_id   │
│ longitude (numeric) │                 │ raw_data (jsonb)    │
│ severity (text)     │                 │ url (text)          │
│ status (text)       │                 │ fetched_at (ts)     │
│ started_at (ts)     │                 └─────────────────────┘
│ resolved_at (ts)    │
│ created_at (ts)     │       1:N       ┌─────────────────────┐
│ updated_at (ts)     │─────────────────┤  incident_reports   │
└─────────────────────┘                 ├─────────────────────┤
                                        │ id (PK, serial)     │
                                        │ incident_id (FK)    │
┌─────────────────────┐       1:N       │ user_id (FK)        │
│        users        │─────────────────┤ category (text)     │
├─────────────────────┤                 │ description (text)  │
│ user_id (PK, text)  │                 │ latitude (numeric)  │
│ name (text)         │                 │ longitude (numeric) │
│ email (text)        │                 │ photos (jsonb)      │
│ location (text)     │                 │ verified (boolean)  │
└──────────┬──────────┘                 │ created_at (ts)     │
           │                            └─────────────────────┘
           │
           │ 1:1
           ▼
┌─────────────────────────────┐
│      user_alert_config      │
├─────────────────────────────┤
│ id (PK, serial)             │
│ user_id (FK, unique)        │
│ selected_types (jsonb)      │
│ vibrate_enabled (boolean)   │
│ sound_enabled (boolean)     │
│ flash_enabled (boolean)     │
│ sound_level (integer)       │
│ notify_current_location     │
│ notify_only_selected_zones  │
└─────────────────────────────┘
```

---

## Detailed Table Specifications

### 1. `incidents` Table
The primary aggregated entity representing an ongoing or historical natural disaster event.
- **Indexes**: `idx_incidents_coords` on `(latitude, longitude)`, `idx_incidents_status` on `(status)`.
- **Cascade rules**: Deleting an incident cascades to delete all linked `incident_sources`, and sets `incident_id = NULL` on citizen `incident_reports`.

### 2. `incident_sources` Table
External agency telemetry records associated with an incident.
- **Foreign Key**: `incident_id -> incidents(id) ON DELETE CASCADE`.
- **Storage**: Full original JSON payload saved in `raw_data` for audit and re-processing.

### 3. `incident_reports` Table
Eyewitness reports submitted by users from the mobile app.
- **Foreign Key 1**: `incident_id -> incidents(id) ON DELETE SET NULL`.
- **Foreign Key 2**: `user_id -> users(user_id) ON DELETE SET NULL`.
- **Photos**: JSON array of image URLs (`photos jsonb DEFAULT '[]'::jsonb`).

### 4. `users` & `user_alert_config` Tables
- Synchronized from Clerk webhooks (`users`).
- Notification preferences (types, volume, vibration, flash, geofencing) stored in `user_alert_config`.

### 5. `weather_cache` & `photo_of_the_day` Tables
- `weather_cache`: 0.1-degree grid resolution cache for OpenWeatherMap queries (numeric 5,2).
- `photo_of_the_day`: NASA Astronomy Picture of the Day gallery.

---

## Migrations History

| Migration | Description | Status |
|---|---|---|
| `0000_groovy_major_mapleleaf.sql` | Initial schema for interest zones, photos, users | Applied |
| `0001_polite_mantis.sql` | Rename column `text` -> `title` in interest zones | Applied |
| `0002_plain_starfox.sql` | Set `image` NOT NULL in photo of the day | Applied |
| `0003_safe_contracts.sql` | Contract hardening: nullable Clerk email, backfill titles | Applied |
| `0004_incidents_sources_reports.sql` | Incidents, incident_sources, incident_reports tables | Applied |
| `0005_user_alert_config.sql` | User alert config and notification preferences | Applied |

---

## Related Notes
- [[Core Concepts/Incident Model (Incidents, Sources, Reports)|Incident Model Concept]]
- [[Services/Backend API (Express & Drizzle)|Backend API Implementation]]
