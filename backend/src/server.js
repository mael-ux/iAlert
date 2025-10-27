import express from "express";
import { eq, and } from "drizzle-orm";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
import { interestZonesTable } from "./dataBase/schema.js";
import { photoOfTheDay } from "./dataBase/schema.js";
import healthCheckJob from "./config/cron.js";
import photoJob from "./config/cron.js";
import fetch from "node-fetch"; 

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

// 🔥 Manual test route for now
const fetchAndInsertPhoto = async () => {
  const res = await fetch("https://picsum.photos/800/600");
  const image = res.url;

  const photo = {
    title: "Temporary Photo of the Day",
    credits: "Lorem Picsum",
    image,
    description: "Mock image used while NASA API is offline",
  };

  await db.insert(photoOfTheDay).values(photo);
  return photo;
};

app.get("/api/fetch-photo", async (req, res) => {
  try {
    const photo = await fetchAndInsertPhoto();
    res.status(200).json({ success: true, photo });
  } catch (err) {
    console.error("Error fetching photo:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);
});