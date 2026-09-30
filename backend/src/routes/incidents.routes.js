import express from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  incidentsTable,
  incidentSourcesTable,
  incidentReportsTable,
  usersTable,
} from "../dataBase/schema.js";

export const incidentsRouter = express.Router();
export const reportsRouter = express.Router();

// Helper: Haversine distance in kilometers
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// GET /api/incidents - List incidents with sources and report counts
// ============================================================================
incidentsRouter.get("/", async (req, res) => {
  try {
    const { status = "active", category, limit = 50 } = req.query;

    let conditions = [];
    if (status !== "all") {
      conditions.push(eq(incidentsTable.status, status));
    }
    if (category) {
      conditions.push(eq(incidentsTable.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const incidents = await db
      .select()
      .from(incidentsTable)
      .where(whereClause)
      .orderBy(desc(incidentsTable.startedAt))
      .limit(parseInt(limit, 10) || 50);

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
reportsRouter.post("/", async (req, res) => {
  try {
    const { userId, category, latitude, longitude, description, photos } =
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

    // Proximity threshold: 35 km
    const PROXIMITY_KM = 35;

    // Search active incidents in the same category
    const activeIncidents = await db
      .select()
      .from(incidentsTable)
      .where(
        and(
          eq(incidentsTable.status, "active"),
          eq(incidentsTable.category, category),
        ),
      );

    let matchedIncident = null;
    let minDistance = Infinity;

    for (const inc of activeIncidents) {
      const dist = haversineKm(lat, lng, parseFloat(inc.latitude), parseFloat(inc.longitude));
      if (dist <= PROXIMITY_KM && dist < minDistance) {
        minDistance = dist;
        matchedIncident = inc;
      }
    }

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
        })
        .returning();

      incidentId = newIncident.id;
      matchedIncident = newIncident;
    }

    const photoList = Array.isArray(photos) ? photos : [];

    // Check if user exists to satisfy foreign key constraint gracefully
    let reportUserId = null;
    if (userId) {
      const [existingUser] = await db
        .select({ userId: usersTable.userId })
        .from(usersTable)
        .where(eq(usersTable.userId, userId))
        .limit(1);
      if (existingUser) {
        reportUserId = existingUser.userId;
      }
    }

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
      })
      .returning();

    res.status(201).json({
      success: true,
      report,
      incident: matchedIncident,
      isNewIncident: !matchedIncident || matchedIncident.id === incidentId,
    });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Failed to submit disaster report" });
  }
});
