# GDACS (Global Disaster Alert and Coordination System)

**GDACS** is a cooperation framework between the United Nations and the European Commission that provides near real-time alerts on natural disasters worldwide.

---

## Feed Endpoints
- **Primary Endpoint**: `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH` (GeoJSON)
- **Fallback Endpoint**: `https://www.gdacs.org/xml/rss.xml` (GeoRSS / XML)
- **Authentication**: None required
- **Rate Limit**: ~60 requests/minute

---

## Category Mapping (`AI/disasters/gdacs.py`)

| GDACS Event Type Code | Meaning | iAlert Canonical Category |
|---|---|---|
| `TC` | Tropical Cyclone / Hurricane / Typhoon | `cyclone` |
| `FL` | Flood | `floods` |
| `EQ` | Earthquake | `earthquakes` |
| `VO` | Volcano | `volcanoes` |
| `DR` | Drought | `drought` |
| `TS` | Tsunami | `tsunami` |
| `WF` | Wildfire | `wildfires` |

---

## Alert Levels to Severity
- `Red` $\rightarrow$ `critical`
- `Orange` $\rightarrow$ `high`
- `Yellow` $\rightarrow$ `medium`
- `Green` $\rightarrow$ `low`

---

## Fallback Parsing (GeoRSS XML)
If the GeoJSON API fails, `GDACSFetcher` falls back to parsing the official GeoRSS XML feed:
- Namespace `geo`: `http://www.w3.org/2003/01/geo/wgs84_pos#`
- Namespace `gdacs`: `http://www.gdacs.org`
- Extracts `<geo:lat>`, `<geo:long>`, `<gdacs:eventtype>`, `<gdacs:alertlevel>`, and `<gdacs:eventid>`.

---

## Related Notes
- [[Core Concepts/Multi-Source Disaster Telemetry|Multi-Source Disaster Telemetry]]
- [[External Integrations/USGS Earthquakes|USGS Earthquakes]]
