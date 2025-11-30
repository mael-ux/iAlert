// backend/src/routes/webhooks.js
// Clerk webhook handler for syncing users to Neon
import express from "express";
import { Webhook } from "svix";
import { db } from "../config/db.js";
import { usersTable } from "../dataBase/schema.js";
import { eq } from "drizzle-orm";
import { ENV } from "../config/env.js";

const router = express.Router();

// Clerk webhook endpoint
router.post("/clerk", async (req, res) => {
  // Get the headers
  const svix_id = req.headers["svix-id"];
  const svix_timestamp = req.headers["svix-timestamp"];
  const svix_signature = req.headers["svix-signature"];

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: "Missing svix headers" });
  }

  // Get the body
  const payload = req.body;
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(ENV.CLERK_WEBHOOK_SECRET);

  let evt;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return res.status(400).json({ error: "Webhook verification failed" });
  }

  // Handle the webhook
  const eventType = evt.type;
  
  console.log(`📨 Clerk webhook received: ${eventType}`);

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    
    const email = email_addresses[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(" ") || null;

    try {
      // Insert user into Neon
      await db.insert(usersTable).values({
        userId: id,
        email: email,
        name: name,
        location: null,
      });

      console.log(`✅ User created in DB: ${id} (${email})`);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error creating user in DB:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    
    const email = email_addresses[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(" ") || null;

    try {
      // Update user in Neon
      await db
        .update(usersTable)
        .set({
          email: email,
          name: name,
        })
        .where(eq(usersTable.userId, id));

      console.log(`✅ User updated in DB: ${id}`);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating user in DB:", error);
      return res.status(500).json({ error: "Failed to update user" });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      // Delete user from Neon (cascade will delete zones and alerts)
      await db
        .delete(usersTable)
        .where(eq(usersTable.userId, id));

      console.log(`✅ User deleted from DB: ${id}`);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting user from DB:", error);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  }

  return res.status(200).json({ success: true });
});

export default router;