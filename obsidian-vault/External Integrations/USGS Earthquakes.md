# USGS Earthquake Hazards Program

The **USGS** (United States Geological Survey) feed provides near-instantaneous global seismic activity data.

---

## Feed Endpoint
- **URL**: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson`
- **Protocol**: HTTP GET, GeoJSON
- **Authentication**: None required (public domain)
- **Rate Limits**: Extremely generous (~50,000 requests/day)

---

## GeoJSON Payload Structure
Coordinates follow standard GeoJSON format: `[longitude, latitude, depth_km]`.

```json
{
  "type": "Feature",
  "properties": {
    "mag": 5.4,
    "place": "120 km S of Tokyo, Japan",
    "time": 1790636084809,
    "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us6000test",
    "alert": "yellow",
    "tsunami": 0
  },
  "geometry": {
    "type": "Point",
    "coordinates": [139.75, 34.5, 10.0]
  }
}
```

---

## Mapping in iAlert (`AI/disasters/usgs.py`)
- **Coordinates**: Extracted directly: `lat = coords[1]`, `lng = coords[0]`.
- **Category**: If `tsunami == 1`, mapped to `tsunami`; otherwise `earthquakes`.
- **Severity**:
  - `alert == "red"` or magnitude $\ge 6.5 \rightarrow$ `critical`
  - `alert == "orange"` or magnitude $\ge 5.0 \rightarrow$ `high`
  - `alert == "yellow"` or magnitude $\ge 3.5 \rightarrow$ `medium`
  - Otherwise $\rightarrow$ `low`
- **Timestamp**: Epoch milliseconds converted to ISO 8601 UTC.

---

## Related Notes
- [[Core Concepts/Multi-Source Disaster Telemetry|Multi-Source Telemetry Overview]]
- [[External Integrations/GDACS|GDACS Integration]]
