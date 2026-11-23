import express from "express";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "../config/env.js";
import { requireUser } from "./incidents.routes.js";

export const mediaRouter = express.Router();

const supabase =
  ENV.SUPABASE_URL && ENV.SUPABASE_SERVICE_KEY
    ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    : null;

// POST /api/media/upload-url  { userId, ext }  ->  { signedUrl, publicUrl }
// The app PUTs the file straight to Supabase; the service key never leaves the backend.
mediaRouter.post("/upload-url", requireUser, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Media storage not configured" });
  const ext = String(req.body?.ext || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const path = `${req.userId.slice(-12)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from(ENV.SUPABASE_BUCKET).createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: error.message });
  res.json({
    signedUrl: data.signedUrl,
    publicUrl: `${ENV.SUPABASE_URL}/storage/v1/object/public/${ENV.SUPABASE_BUCKET}/${path}`,
  });
});

// GET /api/media/status - open in a browser to check Supabase is configured and the bucket exists
mediaRouter.get("/status", async (req, res) => {
  if (!supabase) {
    return res.json({ configured: false, missing: ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter((k) => !ENV[k]) });
  }
  const { data, error } = await supabase.storage.getBucket(ENV.SUPABASE_BUCKET);
  res.json({ configured: true, bucket: ENV.SUPABASE_BUCKET, bucketFound: !!data, public: data?.public ?? null, error: error?.message || null });
});

// POST /api/media/upload  { userId, ext, base64 }  ->  { url }
// The backend uploads for the app (simplest path from React Native; the service key stays here).
mediaRouter.post("/upload", requireUser, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Media storage not configured (missing SUPABASE_URL / SUPABASE_SERVICE_KEY)" });
  const { base64 } = req.body || {};
  if (!base64 || typeof base64 !== "string") return res.status(400).json({ error: "base64 required" });
  const ext = String(req.body?.ext || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const buffer = Buffer.from(base64.replace(/^data:[^,]+,/, ""), "base64");
  if (buffer.length === 0 || buffer.length > 8 * 1024 * 1024) return res.status(413).json({ error: "Image empty or larger than 8 MB" });
  const path = `${req.userId.slice(-12)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(ENV.SUPABASE_BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ url: `${ENV.SUPABASE_URL}/storage/v1/object/public/${ENV.SUPABASE_BUCKET}/${path}` });
});
