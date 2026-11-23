// backend/src/config/env.js - BEST APPROACH
import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT || 5001,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || "development",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "https://ialert-ai-service.onrender.com",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY, // server-only, never ship to the app
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || "incident-media",
  ADMIN_USER_IDS: (process.env.ADMIN_USER_IDS || "").split(",").map((x) => x.trim()).filter(Boolean), // Clerk user ids
  INGEST_SECRET: process.env.INGEST_SECRET, // protects POST /api/incidents/ingest
  INGEST_ENABLED: process.env.INGEST_ENABLED !== undefined ? process.env.INGEST_ENABLED === "true" : process.env.NODE_ENV === "production",
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,  // ← ADD THIS
  // Smart API_URL: uses env var in production, localhost in dev
  API_URL: process.env.NODE_ENV === "production"
    ? process.env.API_URL || "https://ialert.onrender.com/api"
    : process.env.API_URL || `http://localhost:${process.env.PORT || 5001}/api`,
  // KEEP_ALIVE: explicit opt-in flag for cron jobs (self health-ping + photo cleanup).
  // Default preserves the historical behavior exactly: on in production, off otherwise,
  // so production is behavior-identical. Staging/preview can opt in with KEEP_ALIVE=true.
  // NOTE: add `KEEP_ALIVE=` to backend/.env.example once fix/issue-43-env-hygiene merges.
  KEEP_ALIVE:
    process.env.KEEP_ALIVE !== undefined
      ? process.env.KEEP_ALIVE === "true"
      : process.env.NODE_ENV === "production",
};

// Validation: Log warnings if critical env vars are missing
if (!ENV.DATABASE_URL) {
  console.warn("⚠️  WARNING: DATABASE_URL is not set");
}

if (!ENV.OPENWEATHER_API_KEY) {
  console.warn("⚠️  WARNING: OPENWEATHER_API_KEY is not set");
}

if (!ENV.CLERK_WEBHOOK_SECRET) {  // ← ADD THIS
  console.warn("⚠️  WARNING: CLERK_WEBHOOK_SECRET is not set - webhooks will fail");
}

if (!ENV.API_URL) {
  console.error("⚠️  CRITICAL: API_URL is not set! Health checks will fail.");
}

NASA_API_KEY: process.env.NASA_API_KEY || "DEMO_KEY",

console.log("✓ Environment configuration loaded");
console.log(`  - NODE_ENV: ${ENV.NODE_ENV}`);
console.log(`  - PORT: ${ENV.PORT}`);
console.log(`  - API_URL: ${ENV.API_URL}`);