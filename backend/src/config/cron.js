import cron from "cron";
import fetch from "node-fetch"; 
import { neon } from "@neondatabase/serverless";
import * as schema from "../dataBase/schema.js";
import { sql } from "drizzle-orm";
import { ENV } from "./env.js";

const db = neon(ENV.DATABASE_URL);

// Health check every 14 mins
const healthCheckJob = new cron.CronJob("*/14 * * * *", async () => {
  try {
    const res = await fetch(ENV.API_URL);
    if (res.ok) console.log("Health check ping successful");
    else console.log("Health check failed", res.status);
  } catch (err) {
    console.error("Error sending health check:", err);
  }
});

// Photo of the day cron job
const photoJob = new cron.CronJob("0 0 * * *", async () => {
  try {
    const res = await fetch(ENV.NASA_API);
    const text = await res.text();

    if (!res.ok) {
      console.error("NASA API request failed:", res.status, text);
      return;
    }

    let photo;
    try {
      photo = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse NASA API response:", text);
      return;
    }

    if (!photo || !photo.title || !photo.url) {
      console.error("Invalid photo data from NASA API:", photo);
      return;
    }

    // Insert new photo
    await db.insert(schema.photoOfTheDay).values({
      title: photo.title,
      credits: photo.copyright || "NASA",
      image: photo.url,
      description: photo.explanation || "",
    });

    // Keep only last 30 entries (FIFO)
    const countResult = await db.select({ count: sql`count(*)` }).from(schema.photoOfTheDay);
    const total = parseInt(countResult[0].count, 10);

    if (total > 30) {
      const rowsToDelete = total - 30;
      await db
        .delete(schema.photoOfTheDay)
        .where(
          sql`id IN (SELECT id FROM photo_of_the_day ORDER BY date ASC LIMIT ${rowsToDelete})`
        );
    }

    console.log("Photo of the day inserted and old rows cleaned up");
  } catch (err) {
    console.error("Photo cron job error:", err);
  }
});


export default { healthCheckJob };

export  { photoJob };

