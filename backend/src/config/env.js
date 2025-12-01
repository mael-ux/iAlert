// backend/src/config/env.js - BEST APPROACH
import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT || 5001,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || "development",
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,  // ← ADD THIS
  // Smart API_URL: uses env var in production, localhost in dev
  API_URL: process.env.NODE_ENV === "production"
    ? process.env.API_URL || "https://ialert.onrender.com/api"
    : process.env.API_URL || `http://localhost:${process.env.PORT || 5001}/api`,
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

console.log("✓ Environment configuration loaded");
console.log(`  - NODE_ENV: ${ENV.NODE_ENV}`);
console.log(`  - PORT: ${ENV.PORT}`);
console.log(`  - API_URL: ${ENV.API_URL}`);