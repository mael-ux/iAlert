import express from "express";
import { eq, and } from "drizzle-orm";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
import { interestZonesTable } from "./dataBase/schema.js";
import { photoOfTheDay } from "./dataBase/schema.js";
import healthCheckJob from "./config/cron.js";
import photoJob from "./config/cron.js";
import https from "https";

const app = express();
const PORT = ENV.PORT || 8001;

if (ENV.NODE_ENV === "production") {
  healthCheckJob.start();
  photoJob.start();
}

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

app.post("/api/interestZone", async (req, res) => {
  try {
    const { userId, zoneId, title, coordinates } = req.body;

    if (!userId || !zoneId || !title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newZoneOfInterest = await db
      .insert(interestZonesTable)
      .values({
        userId,
        zoneId,
        title,
        coordinates,
      })
      .returning();

    res.status(201).json(newZoneOfInterest[0]);
  } catch (error) {
    console.log("Error adding Zone of Interest", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete("/api/interestZone/:userId/:zoneId", async (req, res) => {
  try {
    const { userId, zoneId } = req.params;

    if (!userId || !zoneId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    await db
      .delete(interestZonesTable)
      .where(
        and(
          eq(interestZonesTable.userId, userId),
          eq(interestZonesTable.zoneId, parseInt(zoneId)),
        ),
      );

    res.status(200).json({ message: "Zone of Interest removed succesfully" });
  } catch (error) {
    console.log("Error deleting Zone of Interest:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/interestZone/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const userZoneOfInterest = await db
      .select()
      .from(interestZonesTable)
      .where(eq(interestZonesTable.userId, userId));

    res.status(200).json(userZoneOfInterest);
  } catch (error) {
    console.log("Error getting Zone of Interest:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/api/photoOfTheDay", async (req, res) => {
  try {
    const { title, credits, image, description } = req.body;

    if (!title || !image) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newPhotoOfTheDay = await db
      .insert(photoOfTheDay)
      .values({
        title,
        credits,
        image,
        description,
      })
      .returning();

    res.status(201).json(newPhotoOfTheDay[0]);
  } catch (error) {
    console.log("Error adding Photo of the Day", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);
});
const fetchAndInsertPhoto = async () => {
  try {
    const response = await fetch(process.env.NASA_API);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`NASA API request failed: ${response.status} ${text}`);
    }

    if (!text || text.trim() === "") {
      throw new Error("NASA API returned empty response");
    }

    let photo;
    try {
      photo = JSON.parse(text);
    } catch (err) {
      throw new Error(`Failed to parse NASA API response: ${text}`);
    }

    if (!photo.title || !photo.url) {
      throw new Error("Invalid photo data from NASA API");
    }

    // Insert into DB
    await db.insert(schema.photoOfTheDay).values({
      title: photo.title,
      credits: photo.copyright || "Unknown",
      image: photo.url,
      description: photo.explanation || "",
    });

    // Keep only last 30 entries
    const countResult = await db.select({ count: sql`count(*)` }).from(schema.photoOfTheDay);
    const total = parseInt(countResult[0].count, 10);

    if (total > 30) {
      const rowsToDelete = total - 30;
      await db
        .delete(schema.photoOfTheDay)
        .where(sql`id IN (SELECT id FROM photo_of_the_day ORDER BY date ASC LIMIT ${rowsToDelete})`);
    }

    return photo;
  } catch (err) {
    console.error("fetchAndInsertPhoto error:", err);
    throw err;
  }
};

// Manual endpoint to test via Postman
app.get("/api/fetch-photo", async (req, res) => {
  try {
    const photo = await fetchAndInsertPhoto();
    res.status(200).json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
