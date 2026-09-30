# NASA EONET (Earth Observatory Natural Event Tracker)

**NASA EONET** curates natural events observed by NASA satellite instruments and partner agencies.

---

## Feed Endpoints
- **v3 API**: `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit={limit}`
- **v2.1 API**: `https://eonet.gsfc.nasa.gov/api/v2.1/events?status=open&limit={limit}&days={days}`
- **CORS Proxies**: `api.allorigins.win`, `corsproxy.io` (fallback routes)

---

## Schema Duality Handling (`AI/disasters/eonet.py`)
EONET maintains two concurrent API shapes:
- **v3**: uses the key `"geometry"` (a list of observation objects, latest is last).
- **v2.1**: uses the key `"geometries"`.
- Coordinates in both are `[longitude, latitude]`.

`normalize_eonet` tolerates both versions and defensive extracts category strings whether `categories` is a list of strings or list of objects.

---

## Related Notes
- [[Core Concepts/Multi-Source Disaster Telemetry|Multi-Source Telemetry Ingestion]]
- [[External Integrations/NASA FIRMS|NASA FIRMS]]
