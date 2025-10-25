import https from "https";
import { db } from "../db"; 
import { photoOfTheDay } from "./dataBase/schema.js";
import { ENV } from "./env.js";


export const fetchAndStorePhotoOfTheDay = () => {
  https.get(process.ENV.NASA_API, (res) => {
    let data = "";

    res.on("data", (chunk) => (data += chunk));
    res.on("end", async () => {
      try {
        const parsed = JSON.parse(data);

        const today = new Date().toISOString().split("T")[0];
        
        const exists = await db
          .select()
          .from(photoOfTheDay)
          .where(photoOfTheDay.date.eq(today));

        if (exists.length > 0) return; 

        await db.insert(photoOfTheDay).values({
          title: parsed.title,
          description: parsed.explanation,
          credits: parsed.copyright || "Unknown",
          image: parsed.url,
          date: today,
        });

        console.log("Photo of the day stored!");
      } catch (err) {
        console.error("Failed to store photo of the day", err);
      }
    });
  }).on("error", (err) => console.error("GET request failed", err));
};
