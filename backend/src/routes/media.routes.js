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
