// Shared feed logic: merge matching + trust scoring. Every function takes `db` so it can be tested.
import { and, eq, gte, sql } from "drizzle-orm";
import {
  incidentVotesTable,
  incidentsTable,
  incidentSourcesTable,
  incidentReportsTable,
  categoryMergeConfigTable,
} from "../dataBase/schema.js";
import { ENV } from "../config/env.js";

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

// ---------------------------------------------------------------------------
// Weighted trust. Score goes up AND down as people react.
//   official sources ........ +10 each (max 2)
//   each distinct reporter .. +3  x location x reputation
//   votes / "still there?" .. +-1 x location x reputation  (admins x3, "gone" answers x2)
// Location factor: near the incident counts more, far away or unknown counts less.
// Reputation: past reports that ended up on the globe raise it, rejected ones lower it.
// ---------------------------------------------------------------------------
export const PROMOTE_AT = 10; // community incident reaches the globe (and alerts)
export const DEMOTE_BELOW = 5; // hysteresis: leaves the globe only below this

export function locationFactor(distKm, radiusKm) {
  if (distKm == null || Number.isNaN(distKm)) return 0.5;
  if (distKm <= radiusKm) return 1.5;
  if (distKm <= radiusKm * 4) return 0.8;
  return 0.3;
}

export function reputationFactor({ good = 0, bad = 0 } = {}) {
  return Math.min(2, Math.max(0.3, 1 + 0.25 * good - 0.4 * bad));
}

export function tierForScore(score) {
  return score >= PROMOTE_AT ? "legit" : score >= 4 ? "likely" : "unverified";
}

const rowsOf = (r) => (Array.isArray(r) ? r : r.rows || []);

// { userId: {good, bad} } from each user's other reports
export async function getReputations(db, userIds, excludeIncidentId = -1) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const res = await db.execute(sql`
    SELECT r.user_id AS user_id,
      SUM(CASE WHEN i.promoted OR i.admin_decision = 'approve' THEN 1 ELSE 0 END)::int AS good,
      SUM(CASE WHEN i.admin_decision = 'reject' OR i.trust_score <= -3 THEN 1 ELSE 0 END)::int AS bad
    FROM incident_reports r JOIN incidents i ON i.id = r.incident_id
    WHERE r.incident_id <> ${excludeIncidentId}
      AND r.user_id IN (${sql.join(ids.map((x) => sql`${x}`), sql`, `)})
    GROUP BY r.user_id`);
  const out = {};
  rowsOf(res).forEach((r) => (out[r.user_id] = { good: Number(r.good) || 0, bad: Number(r.bad) || 0 }));
  return out;
}

export function computeTrust({ sourceCount, reports, votes, radiusKm, reps, adminIds = [] }) {
  let score = 10 * Math.min(sourceCount, 2);
  const seen = new Set();
  for (const r of reports) {
    const key = r.userId || `r${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    score += 3 * locationFactor(r.distanceKm != null ? Number(r.distanceKm) : null, radiusKm) * reputationFactor(reps[r.userId]);
  }
  for (const v of votes) {
    let w = locationFactor(v.distanceKm != null ? Number(v.distanceKm) : null, radiusKm) * reputationFactor(reps[v.userId]);
    if (adminIds.includes(v.userId)) w *= 3;
    if (v.kind === "vote") score += v.value * w;
    else if (v.kind === "still_there") score += (v.value > 0 ? 1 : 2 * -1) * w;
  }
  return Math.round(score * 10) / 10;
}

// Recompute and persist trust + promotion (+ auto-archive community incidents people say are over).
export async function refreshTrust(db, incidentId, adminIds = ENV.ADMIN_USER_IDS) {
  const [inc] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, incidentId)).limit(1);
  if (!inc) return null;

  const sources = await db.select().from(incidentSourcesTable).where(eq(incidentSourcesTable.incidentId, incidentId));
  const reports = await db.select().from(incidentReportsTable).where(eq(incidentReportsTable.incidentId, incidentId));
  const votes = await db.select().from(incidentVotesTable).where(eq(incidentVotesTable.incidentId, incidentId));
  const cfg = await getMergeConfig(db, inc.category);
  const reps = await getReputations(db, [...reports.map((r) => r.userId), ...votes.map((v) => v.userId)], incidentId);

  const score = computeTrust({ sourceCount: sources.length, reports, votes, radiusKm: cfg.radiusKm, reps, adminIds });

  // Promotion: official/linked, admin approval, or enough community score (with hysteresis).
  let promoted;
  if (inc.adminDecision === "reject") promoted = false;
  else if (inc.adminDecision === "approve" || sources.length > 0) promoted = true;
  else promoted = inc.promoted ? score >= DEMOTE_BELOW : score >= PROMOTE_AT;

  const archive = inc.origin === "community" && (inc.stillNo || 0) >= 3 && (inc.stillNo || 0) > (inc.stillYes || 0);
  const status = inc.adminDecision === "reject" ? "rejected" : archive && inc.status === "active" ? "resolved" : inc.status;

  const [updated] = await db
    .update(incidentsTable)
    .set({
      trustScore: Math.round(score),
      trustTier: inc.adminDecision === "approve" ? "legit" : tierForScore(score),
      promoted,
      promotedAt: promoted ? inc.promotedAt || new Date() : null,
      updatedAt: new Date(),
      status,
      ...(status !== inc.status && status === "resolved" ? { archivedAt: new Date(), resolvedAt: new Date() } : {}),
    })
    .where(eq(incidentsTable.id, incidentId))
    .returning();
  return updated;
}
