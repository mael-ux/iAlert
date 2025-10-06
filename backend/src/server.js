import express from "express";
import { ENV } from "./config/env.js";
import {db} from "./config/db.js";
import { interestZonesTable } from "./dataBase/schema.js";
import { photoOfTheDay } from "./dataBase/schema.js";

const app = express();
const PORT = ENV.PORT || 8001;

app.use(express.json());

app.get("/api/health", (req,res) =>{
     res.status(200).json({success: true })
})

app.post("/api/interestZone", async (req,res) =>{

    try {
        const {id, userId, zoneId, title, coordinates, createdAt} = req.body;
    
        if(!userId || !zoneId || !title){
            return res.status(400).json({ error: "Missing required fields"});
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

        res.status(201).json(newZoneOfInterest[0])
    } catch (error) {
        console.log("Error adding Zone of Interest", error)
        res.status(500).json({error: "Something went wrong"})
    }
});

app.post("/api/photoOfTheDay", async (req,res) =>{

    try {
        const {id, title, credits, image, description, date} = req.body;
    
        if(!title || !image){
            return res.status(400).json({ error: "Missing required fields"});
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

        res.status(201).json(newPhotoOfTheDay[0])
    } catch (error) {
        console.log("Error adding Photo of the Day", error)
        res.status(500).json({error: "Something went wrong"})
    }
});

app.listen(PORT, () => {
    console.log("Server is running on PORT:", PORT);
}); 
