import express from "express";
import { eq, and, desc } from "drizzle-orm";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
import {
  interestZonesTable,
  photoOfTheDayTable,
  weatherCacheTable, 
} from "./dataBase/schema.js";

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

// --- YOUR EXISTING ROUTES ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

app.post("/api/interestZone", async (req, res) => {
  try {
    const { userId, title, latitude, longitude } = req.body;

    if (!userId || !title || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newZoneOfInterest = await db
      .insert(interestZonesTable)
      .values({
        userId,
        title,
        latitude,
        longitude,
      })
      .returning();

    res.status(201).json(newZoneOfInterest[0]);
  } catch (error) {
    console.log("Error adding Zone of Interest", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete("/api/interestZone/:userId/:id", async (req, res) => {
  try {
    const { userId, id } = req.params;

    if (!userId || !id) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    await db
      .delete(interestZonesTable)
      .where(
        and(
          eq(interestZonesTable.userId, userId),
          eq(interestZonesTable.id, parseInt(id)),
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

app.get("/api/photoOfTheDay", async (req, res) => {
  try {
    const [latestPhoto] = await db
      .select()
      .from(photoOfTheDayTable)
      .orderBy(desc(photoOfTheDayTable.date))
      .limit(1);

    if (!latestPhoto) {
      // Return fallback photo when database is empty
      console.log("No photo in DB, returning fallback");
      return res.status(200).json({
        title: "Horsehead Nebula",
        url: "https://apod.nasa.gov/apod/image/2301/Horsehead_Hubble_1225.jpg",
        explanation: "The Horsehead Nebula is one of the most identifiable nebulae in the sky, located in the constellation Orion. This iconic shape is sculpted from dense clouds of molecular gas and dust.",
        copyright: "NASA, ESA, Hubble Heritage Team",
      });
    }

    res.status(200).json({
      title: latestPhoto.title,
      url: latestPhoto.image,
      explanation: latestPhoto.description,
      copyright: latestPhoto.credits,
    });
  } catch (error) {
    console.log("Error fetching Photo of the Day", error);
    // Return fallback photo on error
    res.status(200).json({
      title: "Horsehead Nebula",
      url: "https://apod.nasa.gov/apod/image/2301/Horsehead_Hubble_1225.jpg",
      explanation: "The Horsehead Nebula is one of the most identifiable nebulae in the sky, located in the constellation Orion. This iconic shape is sculpted from dense clouds of molecular gas and dust.",
      copyright: "NASA, ESA, Hubble Heritage Team",
    });
  }
});

app.post("/api/photoOfTheDay", async (req, res) => {
  try {
    const { title, credits, image, description } = req.body;

    if (!title || !image) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const today = new Date().toISOString().split('T')[0];

    const newPhotoOfTheDay = await db
      .insert(photoOfTheDayTable)
      .values({
        title,
        credits,
        image,
        description,
        date: today,
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

// --- 2. ADD THIS NEW "SMART CACHE" ROUTE ---
app.post("/api/get-weather", async (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Missing coordinates" });
  }

  // Get the secret key from your config
  const { OPENWEATHER_API_KEY } = ENV;
  if (!OPENWEATHER_API_KEY) {
    console.error("Missing OPENWEATHER_API_KEY");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Round coordinates for the cache grid
  const gridLat = Math.round(latitude * 10) / 10;
  const gridLng = Math.round(longitude * 10) / 10;

  try {
    // 1. Check the cache
    const [cachedWeather] = await db
      .select()
      .from(weatherCacheTable)
      .where(
        and(
          eq(weatherCacheTable.gridLat, gridLat),
          eq(weatherCacheTable.gridLng, gridLng),
        ),
      )
      .limit(1);

    // 2. Check if data is stale (older than 1 hour)
    const oneHour = 3600000; // 1 hour in milliseconds
    const isStale =
      !cachedWeather ||
      new Date().getTime() - new Date(cachedWeather.updatedAt).getTime() >
        oneHour;

    if (cachedWeather && !isStale) {
      // CACHE HIT: Return old data
      console.log(`Cache HIT for grid: ${gridLat}, ${gridLng}`);
      return res.status(200).json(cachedWeather.weatherData);
    }

    // CACHE MISS: Get new data
    console.log(`Cache MISS for grid: ${gridLat}, ${gridLng}`);
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`,
    );

    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json();
      console.error("OpenWeatherMap API Error:", errorData);
      throw new Error(`Failed to fetch weather. Status: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();

    // 3. Save new data to cache ("upsert")
    // Make sure your unique constraint is set on (gridLat, gridLng) in your schema
    await db
      .insert(weatherCacheTable)
      .values({
        gridLat: gridLat,
        gridLng: gridLng,
        weatherData: weatherData,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [weatherCacheTable.gridLat, weatherCacheTable.gridLng],
        set: {
          weatherData: weatherData,
          updatedAt: new Date(),
        },
      });

    // 4. Return new data
    return res.status(200).json(weatherData);
  } catch (error) {
    console.error("Error in /api/get-weather route:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, "0.0.0.0", () => { // <-- ADD "0.0.0.0"
  console.log(`Server is running on PORT: ${PORT} and listening on all interfaces`);
});