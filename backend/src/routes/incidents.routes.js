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
import { haversineKm, findMatchingIncident, refreshTrust, getMergeConfig, getReputations, reputationFactor, PROMOTE_AT } from "../services/incidentLogic.js";
import { ingestFromAI, ingestState } from "../services/ingest.js";
import { recommendationsTable } from "../dataBase/schema.js";

export const incidentsRouter = express.Router();
export const reportsRouter = express.Router();

export { haversineKm };

// ============================================================================
// GET /api/incidents - List incidents with sources and report counts
// ============================================================================
incidentsRouter.get("/", async (req, res) => {
  try {
    const { status = "active", category, limit = 50, origin, sort = "recent", lat, lng, radiusKm, promoted } = req.query;

    let conditions = [];
    if (status !== "all") {
      conditions.push(eq(incidentsTable.status, status));
    }
    if (category) {
      conditions.push(eq(incidentsTable.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    if (origin) conditions.push(eq(incidentsTable.origin, origin));
    if (promoted === "true") conditions.push(eq(incidentsTable.promoted, true));
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

    // latest report per incident (description + first photo) for richer feed cards
    const recentReports = await db
      .select()
      .from(incidentReportsTable)
      .where(inArray(incidentReportsTable.incidentId, incidentIds))
      .orderBy(desc(incidentReportsTable.createdAt));
    const latestMap = new Map();
    recentReports.forEach((r) => {
      if (latestMap.has(r.incidentId)) return;
      const photo = (r.media || []).find((m) => /^https?:/.test(m.url))?.url || null;
      latestMap.set(r.incidentId, { description: r.description || "", photo });
    });

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
      latestReport: latestMap.get(inc.id) || null,
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

// GET /api/incidents/stats - quick health check: open it in a browser to see what is in the DB
incidentsRouter.get("/stats", async (req, res) => {
  try {
    const r = await db.execute(sql`SELECT origin, status, promoted, count(*)::int AS n FROM incidents GROUP BY 1,2,3 ORDER BY 1,2,3`);
    res.json({
      incidents: Array.isArray(r) ? r : r.rows,
      ingestEnabled: ENV.INGEST_ENABLED,
      aiService: ENV.AI_SERVICE_URL,
      lastIngest: ingestState,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/incidents/by-source?source=eonet&id=EONET_123 -> { incidentId }
// Globe events come straight from the AI service; this maps one to its incident (ingesting on a miss).
let lastOnDemandIngest = 0;
incidentsRouter.get("/by-source", async (req, res) => {
  const { source, id } = req.query;
  if (!source || !id) return res.status(400).json({ error: "source and id required" });
  const find = async () => {
    const rows = await db.select().from(incidentSourcesTable).where(eq(incidentSourcesTable.externalEventId, String(id)));
    return rows.find((r) => r.sourceName === source);
  };
  try {
    let hit = await find();
    if (!hit && Date.now() - lastOnDemandIngest > 60000) {
      lastOnDemandIngest = Date.now();
      await ingestFromAI(db, ENV.AI_SERVICE_URL).catch(() => {});
      hit = await find();
    }
    if (!hit) return res.status(404).json({ error: "Incident not found for that source event" });
    res.json({ incidentId: hit.incidentId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/incidents/:id/admin-review { userId, decision: approve | reject | clear }
incidentsRouter.post("/:id/admin-review", requireUser, async (req, res) => {
  if (!ENV.ADMIN_USER_IDS.includes(req.userId)) return res.status(403).json({ error: "Admins only" });
  const id = parseInt(req.params.id, 10);
  const { decision } = req.body;
  if (isNaN(id) || !["approve", "reject", "clear"].includes(decision)) return res.status(400).json({ error: "Bad request" });
  await db.update(incidentsTable).set({ adminDecision: decision === "clear" ? null : decision, ...(decision === "clear" ? { status: "active" } : {}) }).where(eq(incidentsTable.id, id));
  const updated = await refreshTrust(db, id);
  if (!updated) return res.status(404).json({ error: "Incident not found" });
  res.json({ success: true, incident: updated });
});

// Store a vote-like row once per user; re-sending flips/updates it. Then recount on the incident.
async function castVote(req, res, kind, allowed) {
  const id = parseInt(req.params.id, 10);
  const value = parseInt(req.body?.value, 10);
  if (isNaN(id) || !allowed.includes(value)) return res.status(400).json({ error: "Bad id or value" });
  try {
    // How far is the voter from the incident? (nearby people count more; unknown location counts less)
    let distanceKm = null;
    const la = parseFloat(req.body?.latitude), lo = parseFloat(req.body?.longitude);
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      const [inc] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, id)).limit(1);
      if (inc) distanceKm = haversineKm(la, lo, parseFloat(inc.latitude), parseFloat(inc.longitude)).toFixed(1);
    }
    await db.insert(incidentVotesTable)
      .values({ incidentId: id, userId: req.userId, kind, value, distanceKm })
      .onConflictDoUpdate({
        target: [incidentVotesTable.incidentId, incidentVotesTable.userId, incidentVotesTable.kind],
        set: { value, distanceKm },
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

    const rawReports = await db
      .select()
      .from(incidentReportsTable)
      .where(eq(incidentReportsTable.incidentId, id))
      .orderBy(desc(incidentReportsTable.createdAt));

    // Every contribution is labelled by kind; author ids are never sent to other users.
    const reps = await getReputations(db, rawReports.map((r) => r.userId), id);
    const reports = rawReports.map((r) => ({
      id: r.id,
      kind: "citizen", // citizen report (official info comes in `sources`)
      description: r.description,
      media: r.media || [],
      photos: r.photos || [],
      createdAt: r.createdAt,
      distanceKm: r.distanceKm != null ? Number(r.distanceKm) : null,
      trustedAuthor: reputationFactor(reps[r.userId]) >= 1.5,
      mine: !!req.query.userId && r.userId === String(req.query.userId),
    }));
    const officialSources = sources.map((s) => ({ ...s, kind: "official" }));

    // what has THIS user already done here (to highlight buttons in the app)
    const myVotes = {};
    if (req.query.userId) {
      const mine = await db.select().from(incidentVotesTable).where(
        and(eq(incidentVotesTable.incidentId, id), eq(incidentVotesTable.userId, String(req.query.userId))),
      );
      mine.forEach((v) => (myVotes[v.kind] = v.value));
    }

    res.status(200).json({
      ...incident,
      sources: officialSources,
      reports,
      myVotes,
      promoteAt: PROMOTE_AT,
      isAdmin: !!req.query.userId && ENV.ADMIN_USER_IDS.includes(String(req.query.userId)),
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
    const { category: bodyCategory, incidentId: bodyIncidentId, latitude, longitude, description, photos, media } =
      req.body;

    // Reporting on an existing incident (e.g. citizen follow-up on an official event)?
    let targetIncident = null;
    if (bodyIncidentId) {
      [targetIncident] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, parseInt(bodyIncidentId, 10))).limit(1);
      if (!targetIncident) return res.status(404).json({ error: "Incident not found" });
      if (targetIncident.status !== "active") return res.status(409).json({ error: "This incident is closed" });
    }
    const category = targetIncident ? targetIncident.category : bodyCategory;

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
    let matchedIncident = targetIncident || (await findMatchingIncident(db, { category, lat, lng }));
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
    // distance reporter -> incident: nearby witnesses weigh more in the trust score
    const distanceKm = haversineKm(lat, lng, parseFloat(matchedIncident.latitude), parseFloat(matchedIncident.longitude)).toFixed(1);

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
        distanceKm,
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
