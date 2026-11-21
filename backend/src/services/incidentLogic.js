// Shared feed logic: merge matching + trust scoring. Every function takes `db` so it can be tested.
import { and, eq, gte, sql } from "drizzle-orm";
import {
  incidentsTable,
  incidentSourcesTable,
  incidentReportsTable,
  categoryMergeConfigTable,
} from "../dataBase/schema.js";

const DEFAULT_CFG = { radiusKm: 35, windowHours: 72, staleHours: 168 };

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getMergeConfig(db, category) {
  const [row] = await db
    .select()
    .from(categoryMergeConfigTable)
    .where(eq(categoryMergeConfigTable.category, category))
    .limit(1);
  if (!row) return DEFAULT_CFG;
  return {
    radiusKm: parseFloat(row.radiusKm),
    windowHours: row.windowHours,
    staleHours: row.staleHours,
  };
}

// Closest active incident of the same category within radius + time window (bbox prefilter in SQL).
export async function findMatchingIncident(db, { category, lat, lng }) {
  const cfg = await getMergeConfig(db, category);
  const dLat = cfg.radiusKm / 111;
  const dLng = cfg.radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const since = new Date(Date.now() - cfg.windowHours * 3600 * 1000);

  const candidates = await db
    .select()
    .from(incidentsTable)
    .where(
      and(
        eq(incidentsTable.status, "active"),
        eq(incidentsTable.category, category),
        gte(incidentsTable.lastConfirmedAt, since),
        sql`${incidentsTable.latitude} BETWEEN ${(lat - dLat).toFixed(6)} AND ${(lat + dLat).toFixed(6)}`,
        sql`${incidentsTable.longitude} BETWEEN ${(lng - dLng).toFixed(6)} AND ${(lng + dLng).toFixed(6)}`,
      ),
    );

  let best = null;
  let bestDist = Infinity;
  for (const inc of candidates) {
    const d = haversineKm(lat, lng, parseFloat(inc.latitude), parseFloat(inc.longitude));
    if (d <= cfg.radiusKm && d < bestDist) {
      best = inc;
      bestDist = d;
    }
  }
  return best;
}

// score = official sources + distinct reporters + votes + "still there?" answers
export function computeTrust({ sourceCount, reporterCount, upvotes, downvotes, stillYes, stillNo }) {
  const score =
    10 * Math.min(sourceCount, 2) + 2 * reporterCount + upvotes - downvotes + stillYes - 2 * stillNo;
  const tier = score >= 10 ? "legit" : score >= 4 ? "likely" : "unverified";
  return { score, tier };
}

// Recompute and persist trust (and auto-archive when people say it's over). Returns updated row.
export async function refreshTrust(db, incidentId) {
  const [inc] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, incidentId)).limit(1);
  if (!inc) return null;

  const [{ n: sourceCount }] = await db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(incidentSourcesTable)
    .where(eq(incidentSourcesTable.incidentId, incidentId));
  const [{ n: reporterCount }] = await db
    .select({ n: sql`count(distinct coalesce(${incidentReportsTable.userId}, ${incidentReportsTable.id}::text))`.mapWith(Number) })
    .from(incidentReportsTable)
    .where(eq(incidentReportsTable.incidentId, incidentId));

  const { score, tier } = computeTrust({
    sourceCount,
    reporterCount,
    upvotes: inc.upvotes || 0,
    downvotes: inc.downvotes || 0,
    stillYes: inc.stillYes || 0,
    stillNo: inc.stillNo || 0,
  });

  const archive = (inc.stillNo || 0) >= 3 && (inc.stillNo || 0) > (inc.stillYes || 0);
  const [updated] = await db
    .update(incidentsTable)
    .set({
      trustScore: score,
      trustTier: tier,
      updatedAt: new Date(),
      ...(archive && inc.status === "active"
        ? { status: "resolved", archivedAt: new Date(), resolvedAt: new Date() }
        : {}),
    })
    .where(eq(incidentsTable.id, incidentId))
    .returning();
  return updated;
}
