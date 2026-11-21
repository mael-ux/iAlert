-- Migration 0006 (branch: feed): trust/votes, merge reversibility, per-category merge config, recommendations.
-- Safe to re-run (IF NOT EXISTS everywhere). Run the whole file in the Neon SQL editor.

-- 1) incidents: origin, trust, merge tracking, lifecycle
ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "origin" text DEFAULT 'official',            -- official | community
  ADD COLUMN IF NOT EXISTS "trust_score" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trust_tier" text DEFAULT 'unverified',      -- unverified | likely | legit
  ADD COLUMN IF NOT EXISTS "upvotes" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "downvotes" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "still_yes" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "still_no" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "merge_flags" integer DEFAULT 0,             -- "wrong merge" reports
  ADD COLUMN IF NOT EXISTS "last_confirmed_at" timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incidents_status_cat" ON "incidents" ("status", "category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incidents_geo" ON "incidents" ("latitude", "longitude");
--> statement-breakpoint

-- 2) incident_sources: idempotent ingestion (same API event never inserted twice)
DELETE FROM "incident_sources" a USING "incident_sources" b
  WHERE a."id" > b."id" AND a."source_name" = b."source_name"
    AND a."external_event_id" IS NOT NULL AND a."external_event_id" = b."external_event_id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_incident_sources_ext"
  ON "incident_sources" ("source_name", "external_event_id") WHERE "external_event_id" IS NOT NULL;
--> statement-breakpoint

-- 3) incident_reports: media with origin tag (camera vs gallery), reversible merge
ALTER TABLE "incident_reports"
  ADD COLUMN IF NOT EXISTS "media" jsonb DEFAULT '[]'::jsonb,           -- [{url, source:'camera'|'gallery'}]
  ADD COLUMN IF NOT EXISTS "original_incident_id" integer,              -- where it was before a merge, to undo
  ADD COLUMN IF NOT EXISTS "language" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_incident" ON "incident_reports" ("incident_id");
--> statement-breakpoint

-- 4) votes / confirmations / wrong-merge flags (one row per user+incident+kind)
CREATE TABLE IF NOT EXISTS "incident_votes" (
  "id" serial PRIMARY KEY NOT NULL,
  "incident_id" integer NOT NULL REFERENCES "incidents"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("user_id") ON DELETE cascade,
  "kind" text NOT NULL,                       -- vote | still_there | wrong_merge
  "value" smallint NOT NULL,                  -- vote: 1/-1 ; still_there: 1 yes /-1 no ; wrong_merge: 1
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_incident_votes" ON "incident_votes" ("incident_id", "user_id", "kind");
--> statement-breakpoint

-- 5) per-category merge config
CREATE TABLE IF NOT EXISTS "category_merge_config" (
  "category" text PRIMARY KEY NOT NULL,
  "radius_km" numeric(8,2) NOT NULL,
  "window_hours" integer NOT NULL,            -- reports within this window can merge
  "stale_hours" integer NOT NULL              -- ask "still there?" / auto-archive after this
);
--> statement-breakpoint
INSERT INTO "category_merge_config" ("category","radius_km","window_hours","stale_hours") VALUES
  ('wildfires', 25, 72, 168), ('volcanoes', 30, 168, 720), ('severeStorms', 150, 48, 96),
  ('floods', 40, 96, 240), ('earthquakes', 50, 6, 72), ('landslides', 10, 72, 240),
  ('drought', 200, 720, 2160), ('dustHaze', 100, 48, 96), ('tempExtremes', 100, 48, 96),
  ('seaLakeIce', 100, 168, 720), ('snow', 100, 48, 96), ('waterColor', 20, 168, 336),
  ('manmade', 5, 24, 72), ('tsunami', 200, 12, 48), ('cyclone', 200, 72, 120)
ON CONFLICT ("category") DO NOTHING;
--> statement-breakpoint

-- 6) recommendations (sourced from international orgs; one row per language)
CREATE TABLE IF NOT EXISTS "recommendations" (
  "id" serial PRIMARY KEY NOT NULL,
  "category" text NOT NULL,
  "phase" text NOT NULL DEFAULT 'during',     -- before | during | after
  "language" text NOT NULL DEFAULT 'en',
  "title" text NOT NULL,
  "body" text NOT NULL,
  "source_org" text NOT NULL,                 -- e.g. Ready.gov, WHO, IFRC
  "source_url" text,
  "position" integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recs_cat_lang" ON "recommendations" ("category", "language");
