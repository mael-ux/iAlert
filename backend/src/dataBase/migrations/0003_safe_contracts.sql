-- Issue #45: DB/API contract hardening.
-- GENERATED-BUT-UNAPPLIED: this migration has NOT been applied to any database
-- (no Neon/prod access exists or is needed here). Requires a staging apply first.
-- Hand-written in the existing migrations style: `drizzle-kit generate` was NOT
-- run because the checked-in meta snapshots (0002 and earlier) are stale relative
-- to the live schema (they lack weather_cache, users.email/name/location and the
-- interest_zone lat/lng columns — README deploys via `drizzle-kit push:pg`, not
-- these files), so a generated diff would be a spurious catch-up unrelated to #45.
-- 1) Clerk may omit email addresses: tolerate NULL instead of failing the webhook
--    upsert. NOTE: the users.email/name/location columns themselves arrived via
--    push (see schema.js); this statement assumes that pushed shape.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
-- 2) Zone titles are required by the API: backfill existing NULLs BEFORE the
--    constraint so no existing row breaks (prod could not be queried to prove
--    zero NULLs, hence backfill-then-constrain instead of a bare SET NOT NULL).
UPDATE "interest_zone" SET "title" = 'Untitled zone' WHERE "title" IS NULL;
--> statement-breakpoint
ALTER TABLE "interest_zone" ALTER COLUMN "title" SET DEFAULT 'Untitled zone';
--> statement-breakpoint
ALTER TABLE "interest_zone" ALTER COLUMN "title" SET NOT NULL;
--> statement-breakpoint
-- 3) Weather grid headroom: the 0.1-degree cache key keeps working and is stored
--    exactly under numeric(5,2).
ALTER TABLE "weather_cache" ALTER COLUMN "grid_lat" SET DATA TYPE numeric(5,2);
--> statement-breakpoint
ALTER TABLE "weather_cache" ALTER COLUMN "grid_lng" SET DATA TYPE numeric(5,2);
