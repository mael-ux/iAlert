-- Migration 0008 (branch: feed): promotion to the globe, admin review, location-aware votes/reports.
-- Safe to re-run.
ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "promoted" boolean DEFAULT false,        -- true = shown on globe + triggers alerts
  ADD COLUMN IF NOT EXISTS "promoted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "admin_decision" text;                   -- approve | reject | NULL
--> statement-breakpoint
ALTER TABLE "incident_votes" ADD COLUMN IF NOT EXISTS "distance_km" numeric(8,1);   -- voter -> incident
--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN IF NOT EXISTS "distance_km" numeric(8,1); -- reporter -> incident
--> statement-breakpoint
-- Official incidents are always on the globe; community ones linked to an official source too.
UPDATE "incidents" SET "promoted" = true, "promoted_at" = COALESCE("promoted_at", now())
 WHERE "promoted" = false AND ("origin" = 'official'
   OR EXISTS (SELECT 1 FROM "incident_sources" s WHERE s."incident_id" = "incidents"."id"));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incidents_promoted" ON "incidents" ("promoted", "status");
