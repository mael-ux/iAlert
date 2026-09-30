-- Migration 0005: Create user_alert_config table for disaster notification preferences.

CREATE TABLE IF NOT EXISTS "user_alert_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("user_id") ON DELETE cascade,
	"selected_types" jsonb DEFAULT '["wildfires", "volcanoes", "severeStorms", "floods", "earthquakes"]'::jsonb,
	"vibrate_enabled" boolean DEFAULT true,
	"sound_enabled" boolean DEFAULT true,
	"flash_enabled" boolean DEFAULT false,
	"sound_level" integer DEFAULT 80,
	"notify_current_location" boolean DEFAULT true,
	"notify_only_selected_zones" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_alert_config_user" ON "user_alert_config" ("user_id");
