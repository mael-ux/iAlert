import express from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  incidentsTable,
  incidentSourcesTable,
  incidentReportsTable,
  usersTable,
  incidentVotesTable,
} from "../dataBase/schema.js";
import { ENV } from "../config/env.js";
import { haversineKm, findMatchingIncident, refreshTrust } from "../services/incidentLogic.js";
import { ingestFromAI } from "../services/ingest.js";
import { recommendationsTable } from "../dataBase/schema.js";

export const incidentsRouter = express.Router();
export const reportsRouter = express.Router();

export { haversineKm };

// ============================================================================
// GET /api/incidents - List incidents with sources and report counts
// ============================================================================
incidentsRouter.get("/", async (req, res) => {
  try {
    const { status = "active", category, limit = 50, origin, sort = "recent", lat, lng, radiusKm } = req.query;

    let conditions = [];
    if (status !== "all") {
      conditions.push(eq(incidentsTable.status, status));
    }
    if (category) {
      conditions.push(eq(incidentsTable.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    if (origin) conditions.push(eq(incidentsTable.origin, origin));
    const where2 = conditions.length > 0 ? and(...conditions) : undefined;

    let incidents = await db
      .select()
      .from(incidentsTable)
      .where(where2)
      .orderBy(sort === "trust" ? desc(incidentsTable.trustScore) : desc(incidentsTable.startedAt))
      .limit(lat && lng ? 500 : parseInt(limit, 10) || 50);

    // "Near me": filter + sort by distance (JS haversine; fine at this scale)
    if (lat && lng) {
      const la = parseFloat(lat), lo = parseFloat(lng), r = parseFloat(radiusKm) || 300;
      incidents = incidents
        .map((i) => ({ ...i, distanceKm: haversineKm(la, lo, parseFloat(i.latitude), parseFloat(i.longitude)) }))
        .filter((i) => i.distanceKm <= r)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, parseInt(limit, 10) || 50);
    }

    if (incidents.length === 0) {
      return res.status(200).json({ status: "ok", count: 0, incidents: [] });
    }

    const incidentIds = incidents.map((i) => i.id);

    // Fetch sources for these incidents
    const sources = await db
      .select()
      .from(incidentSourcesTable)
      .where(inArray(incidentSourcesTable.incidentId, incidentIds));

    // Fetch report counts for these incidents
    const reportCounts = await db
      .select({
        incidentId: incidentReportsTable.incidentId,
        count: sql`count(*)`.mapWith(Number),
      })
      .from(incidentReportsTable)
      .where(inArray(incidentReportsTable.incidentId, incidentIds))
      .groupBy(incidentReportsTable.incidentId);

    const countsMap = new Map();
    reportCounts.forEach((rc) => countsMap.set(rc.incidentId, rc.count));

    const sourcesMap = new Map();
    sources.forEach((s) => {
      if (!sourcesMap.has(s.incidentId)) {
        sourcesMap.set(s.incidentId, []);
      }
      sourcesMap.get(s.incidentId).push(s);
    });

    const result = incidents.map((inc) => ({
      ...inc,
      sources: sourcesMap.get(inc.id) || [],
      reportCount: countsMap.get(inc.id) || 0,
    }));

    res.status(200).json({
      status: "ok",
      count: result.length,
      incidents: result,
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

// ============================================================================
// Guard: writes need a real signed-in user. TODO(before final): verify Clerk JWT instead of trusting body.userId
// ============================================================================
export async function requireUser(req, res, next) {
  const userId = req.body?.userId;
  if (!userId || userId === "anonymous") {
    return res.status(401).json({ error: "Sign in required" });
  }
  const [u] = await db.select({ userId: usersTable.userId }).from(usersTable).where(eq(usersTable.userId, userId)).limit(1);
  if (!u) return res.status(401).json({ error: "Unknown user" });
  req.userId = userId;
  next();
}

// POST /api/incidents/ingest - manual trigger (demo): header x-ingest-secret
incidentsRouter.post("/ingest", async (req, res) => {
  if (!ENV.INGEST_SECRET || req.get("x-ingest-secret") !== ENV.INGEST_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    res.json({ status: "ok", stats: await ingestFromAI(db, ENV.AI_SERVICE_URL) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// GET /api/incidents/recommendations?category=floods&language=en
incidentsRouter.get("/recommendations", async (req, res) => {
  const { category, language = "en" } = req.query;
  if (!category) return res.status(400).json({ error: "category required" });
  const rows = await db.select().from(recommendationsTable)
    .where(and(eq(recommendationsTable.category, category), eq(recommendationsTable.language, language)))
    .orderBy(recommendationsTable.phase, recommendationsTable.position);
  res.json({ recommendations: rows });
});

// Store a vote-like row once per user; re-sending flips/updates it. Then recount on the incident.
async function castVote(req, res, kind, allowed) {
  const id = parseInt(req.params.id, 10);
  const value = parseInt(req.body?.value, 10);
  if (isNaN(id) || !allowed.includes(value)) return res.status(400).json({ error: "Bad id or value" });
  try {
    await db.insert(incidentVotesTable)
      .values({ incidentId: id, userId: req.userId, kind, value })
      .onConflictDoUpdate({
        target: [incidentVotesTable.incidentId, incidentVotesTable.userId, incidentVotesTable.kind],
        set: { value },
      });
    const rows = await db.select().from(incidentVotesTable).where(eq(incidentVotesTable.incidentId, id));
    const c = (k, v) => rows.filter((r) => r.kind === k && r.value === v).length;
    await db.update(incidentsTable).set({
      upvotes: c("vote", 1), downvotes: c("vote", -1),
      stillYes: c("still_there", 1), stillNo: c("still_there", -1),
      mergeFlags: c("wrong_merge", 1),
      ...(kind === "still_there" && value === 1 ? { lastConfirmedAt: new Date() } : {}),
    }).where(eq(incidentsTable.id, id));
    const updated = await refreshTrust(db, id);
    if (!updated) return res.status(404).json({ error: "Incident not found" });
    res.json({ success: true, incident: updated });
  } catch (e) {
    console.error(`${kind} failed:`, e);
    res.status(500).json({ error: "Failed to register" });
  }
}
incidentsRouter.post("/:id/vote", requireUser, (req, res) => castVote(req, res, "vote", [1, -1]));
incidentsRouter.post("/:id/still-there", requireUser, (req, res) => castVote(req, res, "still_there", [1, -1]));
incidentsRouter.post("/:id/wrong-merge", requireUser, (req, res) => castVote(req, res, "wrong_merge", [1]));

// ============================================================================
// GET /api/incidents/:id - Get specific incident with full sources and reports
// ============================================================================
incidentsRouter.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid incident ID" });
    }

    const [incident] = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const sources = await db
      .select()
      .from(incidentSourcesTable)
      .where(eq(incidentSourcesTable.incidentId, id));

    const reports = await db
      .select()
      .from(incidentReportsTable)
      .where(eq(incidentReportsTable.incidentId, id))
      .orderBy(desc(incidentReportsTable.createdAt));

    res.status(200).json({
      ...incident,
      sources,
      reports,
    });
  } catch (error) {
    console.error("Error fetching incident detail:", error);
    res.status(500).json({ error: "Failed to fetch incident" });
  }
});

// ============================================================================
// POST /api/reports - Citizen disaster report submission
// ============================================================================
reportsRouter.post("/", requireUser, async (req, res) => {
  try {
    const { category, latitude, longitude, description, photos, media } =
      req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      !category ||
      typeof category !== "string"
    ) {
      return res.status(400).json({
        error: "Missing required fields: latitude, longitude, and category are required",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Coordinates out of bounds" });
    }

    // Per-category radius/time window from category_merge_config
    let matchedIncident = await findMatchingIncident(db, { category, lat, lng });
    let isNewIncident = false;

    let incidentId;

    if (matchedIncident) {
      incidentId = matchedIncident.id;
    } else {
      // Create new incident initiated by citizen report
      const cleanDesc = description && description.trim() ? description.trim() : "";
      const title = cleanDesc
        ? `Reported ${category}: ${cleanDesc.slice(0, 40)}`
        : `Community Reported ${category}`;

      const [newIncident] = await db
        .insert(incidentsTable)
        .values({
          title,
          category,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
          severity: "medium",
          status: "active",
          origin: "community",
          lastConfirmedAt: new Date(),
        })
        .returning();

      incidentId = newIncident.id;
      matchedIncident = newIncident;
      isNewIncident = true;
    }

    const photoList = Array.isArray(photos) ? photos : [];

    const reportUserId = req.userId;

    const [report] = await db
      .insert(incidentReportsTable)
      .values({
        incidentId,
        userId: reportUserId,
        category,
        description: description || "",
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        photos: photoList,
        media: Array.isArray(media) ? media : [],
      })
      .returning();
    await db.update(incidentsTable).set({ lastConfirmedAt: new Date() }).where(eq(incidentsTable.id, incidentId));
    const refreshed = await refreshTrust(db, incidentId);
    matchedIncident = refreshed || matchedIncident;

    res.status(201).json({
      success: true,
      report,
      incident: matchedIncident,
      isNewIncident,
    });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Failed to submit disaster report" });
  }
});
