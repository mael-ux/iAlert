# Proximity Aggregation (Haversine)

To prevent duplicate incidents and consolidate citizen reports, iAlert uses the **Haversine formula** for great-circle distance calculation between two points on the Earth's surface.

---

## The Formula

Given two coordinates $(\text{lat}_1, \text{lon}_1)$ and $(\text{lat}_2, \text{lon}_2)$ in radians:

$$\Delta\text{lat} = \text{lat}_2 - \text{lat}_1$$
$$\Delta\text{lon} = \text{lon}_2 - \text{lon}_1$$

$$a = \sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1) \cdot \cos(\text{lat}_2) \cdot \sin^2\left(\frac{\Delta\text{lon}}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R \cdot c$$

Where $R = 6,371\text{ km}$ (Earth's mean radius).

---

## Implementation in Backend (`routes/incidents.routes.js`)

```javascript
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
```

---

## Operating Radii

1. **Citizen Report Incident Matching (`POST /api/reports`)**:
   - **Radius**: **35 km**.
   - **Condition**: Must match the same hazard category and the existing incident must be in `active` status.
   - **Behavior**: If matched, report is linked (`incident_reports.incident_id = incident.id`). If no incident is within 35 km, a new `Incident` is generated automatically.

2. **Globe Corroboration Detection (`components/globeMap.jsx`)**:
   - **Radius**: **200 km**.
   - **Condition**: Finds other active telemetry markers within the radius.
   - **Behavior**: Shows a list of nearby corroborating sensors (e.g., *"Detected by USGS M5.4 (120 km away)"*).

---

## Related Notes
- [[Architecture/Database Schema & ERD|Database Schema]]
- [[Core Concepts/Incident Model (Incidents, Sources, Reports)|Incident Model]]
