# NASA FIRMS (Fire Information for Resource Management System)

**NASA FIRMS** delivers near real-time thermal anomaly and active fire detections from MODIS and VIIRS satellite instruments.

---

## API & Authentication
- **Endpoint**: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/world/{DAYS}`
- **Authentication**: Free MAP Key required. Register at [NASA Earthdata FIRMS API](https://firms.modaps.eosdis.nasa.gov/api/).
- **Environment Variable**: `FIRMS_MAP_KEY` or `FIRMS_API_KEY`.

---

## Graceful Degradation Pattern
If `FIRMS_MAP_KEY` is not present in the environment:
- `FIRMSFetcher.is_configured()` returns `False`.
- `fetch()` safely returns an empty list `[]` with an informational log on first call.
- The rest of the disaster ingestion pipeline (USGS, GDACS, EONET) proceeds normally with zero errors.

---

## CSV Parsing & Mapping (`AI/disasters/firms.py`)
- Reads CSV streams directly via Python `csv.DictReader`.
- Latitude and Longitude parsed as floats.
- **Fire Radiative Power (FRP)** in Megawatts (MW) mapped to `magnitude`.
- **Severity**:
  - `confidence == "high"` or FRP $\ge 50\text{ MW} \rightarrow$ `high`
  - FRP $< 10\text{ MW} \rightarrow$ `low`
  - Default $\rightarrow$ `medium`

---

## Related Notes
- [[Core Concepts/Multi-Source Disaster Telemetry|Multi-Source Telemetry Ingestion]]
- [[External Integrations/NASA EONET|NASA EONET]]
