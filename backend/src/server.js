// backend/src/server.js - FIXED VERSION
import express from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
import {
  interestZonesTable,
  photoOfTheDayTable,
  weatherCacheTable, 
} from "./dataBase/schema.js";

// FIXED: Import both cron jobs correctly
import { healthCheckJob, photoJob } from "./config/cron.js";
import fetch from "node-fetch";

const app = express();
const PORT = ENV.PORT || 8001;

// FIXED: Start cron jobs properly in production
if (ENV.NODE_ENV === "production") {
  console.log("Starting cron jobs in production mode...");
  healthCheckJob.start();
  photoJob.start();
  console.log("Cron jobs started successfully");
}

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, timestamp: new Date().toISOString() });
});

// Secure city search (no API key exposed to client)
app.get("/api/search-city", async (req, res) => {
  const { q } = req.query; 

  if (!q) {
    return res.status(400).json({ error: "Missing search query" });
  }

  const { OPENWEATHER_API_KEY } = ENV;
  if (!OPENWEATHER_API_KEY) {
    console.error("Missing OPENWEATHER_API_KEY");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const geoApiUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=5&appid=${OPENWEATHER_API_KEY}`;
    
    const response = await fetch(geoApiUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch from OpenWeatherMap");
    }

    const data = await response.json();
    res.status(200).json(data); 

  } catch (error) {
    console.error("Error in /api/search-city route:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Interest Zones CRUD
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

    res.status(200).json({ message: "Zone of Interest removed successfully" });
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

// FIXED: Get RANDOM photo from database
app.get("/api/photoOfTheDay", async (req, res) => {
  try {
    // Select a random photo using SQL RANDOM()
    const [randomPhoto] = await db
      .select()
      .from(photoOfTheDayTable)
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (!randomPhoto) {
      console.log("No photo in DB, returning fallback");
      return res.status(200).json({
        title: "Horsehead Nebula",
        image: "https://apod.nasa.gov/apod/image/2301/Horsehead_Hubble_1225.jpg",
        description: "The Horsehead Nebula is one of the most identifiable nebulae in the sky.",
        credits: "NASA, ESA, Hubble Heritage Team",
      });
    }

    // Return the photo with consistent key names
    res.status(200).json({
      title: randomPhoto.title,
      image: randomPhoto.image,
      description: randomPhoto.description,
      credits: randomPhoto.credits,
    });
  } catch (error) {
    console.log("Error fetching Photo of the Day", error);
    res.status(200).json({
      title: "Horsehead Nebula",
      image: "https://apod.nasa.gov/apod/image/2301/Horsehead_Hubble_1225.jpg",
      description: "The Horsehead Nebula is one of the most identifiable nebulae in the sky.",
      credits: "NASA, ESA, Hubble Heritage Team",
    });
  }
});

// Manual photo upload endpoint
app.post("/api/photoOfTheDay", async (req, res) => {
  try {
    const { title, credits, image, description } = req.body;

    if (!title || !image) {
      return res.status(400).json({ error: "Missing required fields (title, image)" });
    }

    const today = new Date().toISOString().split('T')[0];

    const newPhotoOfTheDay = await db
      .insert(photoOfTheDayTable)
      .values({
        title,
        credits: credits || "NASA",
        image,
        description: description || "",
        date: today,
      })
      .returning();

    res.status(201).json(newPhotoOfTheDay[0]);
  } catch (error) {
    console.log("Error adding Photo of the Day", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Weather cache endpoint
app.post("/api/get-weather", async (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Missing coordinates" });
  }

  const { OPENWEATHER_API_KEY } = ENV;
  if (!OPENWEATHER_API_KEY) {
    console.error("Missing OPENWEATHER_API_KEY");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const gridLat = Math.round(latitude * 10) / 10;
  const gridLng = Math.round(longitude * 10) / 10;

  try {
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

    const oneHour = 3600000; 
    const isStale =
      !cachedWeather ||
      new Date().getTime() - new Date(cachedWeather.updatedAt).getTime() >
        oneHour;

    if (cachedWeather && !isStale) {
      console.log(`Cache HIT for grid: ${gridLat}, ${gridLng}`);
      return res.status(200).json(cachedWeather.weatherData);
    }

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

    return res.status(200).json(weatherData);
  } catch (error) {
    console.error("Error in /api/get-weather route:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on PORT: ${PORT} and listening on all interfaces`);
  console.log(`Environment: ${ENV.NODE_ENV}`);
});