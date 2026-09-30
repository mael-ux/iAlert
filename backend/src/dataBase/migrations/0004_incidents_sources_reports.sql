-- Migration 0004: Create incidents, incident_sources, and incident_reports tables.
-- Supports multi-source telemetry aggregation and citizen field reporting.

CREATE TABLE IF NOT EXISTS "incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"severity" text DEFAULT 'medium',
	"status" text DEFAULT 'active',
	"started_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incident_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"incident_id" integer NOT NULL REFERENCES "incidents"("id") ON DELETE cascade,
	"source_name" text NOT NULL,
	"external_event_id" text,
	"raw_data" jsonb,
	"url" text,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incident_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"incident_id" integer REFERENCES "incidents"("id") ON DELETE set null,
	"user_id" text REFERENCES "users"("user_id") ON DELETE set null,
	"category" text NOT NULL,
	"description" text,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incidents_coords" ON "incidents" ("latitude", "longitude");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incidents_status" ON "incidents" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incident_sources_incident" ON "incident_sources" ("incident_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incident_reports_incident" ON "incident_reports" ("incident_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incident_reports_user" ON "incident_reports" ("user_id");
