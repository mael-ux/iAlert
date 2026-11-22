// Pulls normalized events from the AI service (/api/disasters) and upserts them as incidents.
import { eq, sql } from "drizzle-orm";
import { incidentsTable, incidentSourcesTable } from "../dataBase/schema.js";
import { findMatchingIncident, refreshTrust } from "./incidentLogic.js";

const SEVERITIES = ["low", "medium", "high", "critical"];

export async function ingestEvents(db, events) {
  const stats = { seen: 0, created: 0, merged: 0, updated: 0, skipped: 0 };
  for (const ev of events) {
    stats.seen++;
    const lat = Number(ev.lat);
    const lng = Number(ev.lng);
    if (!ev.id || !ev.source || !ev.category || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      stats.skipped++;
      continue;
    }
    try {
      // 1) Already ingested? just touch the incident.
      const existing = await db
        .select()
        .from(incidentSourcesTable)
        .where(eq(incidentSourcesTable.externalEventId, String(ev.id)));
      const hit = existing.find((s) => s.sourceName === ev.source);
      if (hit) {
        await db
          .update(incidentsTable)
          .set({ lastConfirmedAt: new Date(), updatedAt: new Date() })
          .where(eq(incidentsTable.id, hit.incidentId));
        await db.update(incidentSourcesTable).set({ rawData: ev, fetchedAt: new Date() }).where(eq(incidentSourcesTable.id, hit.id));
        stats.updated++;
        continue;
      }

      // 2) Merge into a matching incident, or create a new official one.
      let incident = await findMatchingIncident(db, { category: ev.category, lat, lng });
      if (incident) {
        stats.merged++;
      } else {
        const sev = String(ev.severity || "").toLowerCase();
        [incident] = await db
          .insert(incidentsTable)
          .values({
            title: String(ev.title || ev.category).slice(0, 200),
            category: ev.category,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
            severity: SEVERITIES.includes(sev) ? sev : "medium",
            status: "active",
            origin: "official",
            startedAt: ev.date ? new Date(ev.date) : new Date(),
            lastConfirmedAt: new Date(),
          })
          .returning();
        stats.created++;
      }
      await db.insert(incidentSourcesTable).values({
        incidentId: incident.id,
        sourceName: ev.source,
        externalEventId: String(ev.id),
        rawData: ev,
        url: ev.link || null,
      }).onConflictDoNothing();
      await refreshTrust(db, incident.id);
    } catch (e) {
      console.error("ingest event failed:", ev.id, e.message);
      stats.skipped++;
    }
  }
  return stats;
}

export async function ingestFromAI(db, baseUrl, { days = 30, limit = 200 } = {}) {
  const res = await fetch(`${baseUrl}/api/disasters?days=${days}&limit=${limit}`);
  if (!res.ok) throw new Error(`AI service responded ${res.status}`);
  const data = await res.json();
  const events = Array.isArray(data) ? data : data.events || data.disasters || [];
  return ingestEvents(db, events);
}

// Close incidents nobody (feeds or users) has confirmed within the category's stale window.
export async function archiveStale(db) {
  const r = await db.execute(sql`
    UPDATE incidents i SET status = 'resolved', archived_at = now(), resolved_at = now()
    FROM category_merge_config c
    WHERE i.category = c.category AND i.status = 'active'
      AND i.last_confirmed_at < now() - (c.stale_hours || ' hours')::interval
  `);
  return r.rowCount ?? r.count ?? 0;
}
