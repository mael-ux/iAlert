// backend/src/config/cron.js - FIXED VERSION
import cron from "cron";
import fetch from "node-fetch"; 
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { ENV } from "./env.js";

// Create database connection
const sqlConnection = neon(ENV.DATABASE_URL);

// FIXED: Define both cron jobs and export them properly

// Health check every 14 mins to keep Render instance alive
export const healthCheckJob = new cron.CronJob("*/14 * * * *", async () => {
  try {
    const res = await fetch(`${ENV.API_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      console.log("✓ Health check ping successful:", data.timestamp);
    } else {
      console.log("✗ Health check failed with status:", res.status);
    }
  } catch (err) {
    console.error("✗ Error sending health check:", err.message);
  }
});

// Photo of the day cron job - runs daily at midnight
export const photoJob = new cron.CronJob("0 0 * * *", async () => {
  console.log("Starting Photo of the Day cleanup...");
  
  try {
    // Count total photos
    const countResult = await sqlConnection`
      SELECT COUNT(*) as count FROM photo_of_the_day
    `;
    
    // Safety check: Make sure we got a result
    if (!countResult || countResult.length === 0) {
      console.log("No photos in database yet, skipping cleanup");
      return;
    }
    
    const total = parseInt(countResult[0].count, 10);
    console.log(`Current photo count: ${total}`);

    // Keep only last 30 entries (FIFO)
    if (total > 30) {
      const rowsToDelete = total - 30;
      console.log(`Deleting ${rowsToDelete} old photos...`);
      
      await sqlConnection`
        DELETE FROM photo_of_the_day
        WHERE id IN (
          SELECT id FROM photo_of_the_day 
          ORDER BY date ASC 
          LIMIT ${rowsToDelete}
        )
      `;
      
      console.log(`✓ Successfully cleaned up ${rowsToDelete} old photos`);
    } else {
      console.log("✓ Photo count is within limit, no cleanup needed");
    }

  } catch (err) {
    console.error("✗ Photo cron job error:", err);
  }
});

// Optional: Manual function to add a photo (you can call this from an endpoint)
export const addPhotoManually = async (photoData) => {
  try {
    const { title, credits, image, description } = photoData;
    const today = new Date().toISOString().split('T')[0];

    await sqlConnection`
      INSERT INTO photo_of_the_day (title, credits, image, description, date)
      VALUES (${title}, ${credits}, ${image}, ${description}, ${today})
    `;

    console.log("✓ Photo added successfully");
    return true;
  } catch (err) {
    console.error("✗ Error adding photo:", err);
    return false;
  }
};