"""
USGS Earthquake Hazards Program real-time GeoJSON feed fetcher.
Fetches global earthquakes with magnitude, depth, and tsunami indicators.
"""

from datetime import datetime, timezone
import json
import logging
import urllib.request
from typing import Any, Dict, List, Optional

from AI.disasters.base import BaseFetcher, create_disaster_event

logger = logging.getLogger("ialert.disasters.usgs")


def normalize_usgs(feature: Any) -> Optional[Dict[str, Any]]:
    """
    Normalize one GeoJSON Feature from USGS earthquake feeds.
    Returns None if missing geometry or coords.
    """
    if not isinstance(feature, dict):
        return None

    props = feature.get("properties", {}) or {}
    geom = feature.get("geometry", {}) or {}

    coords = geom.get("coordinates", [])
    if len(coords) < 2:
        return None

    lng = coords[0]
    lat = coords[1]
    depth = coords[2] if len(coords) > 2 else None

    # Epoch ms to ISO 8601
    epoch_ms = props.get("time")
    date_str = None
    if isinstance(epoch_ms, (int, float)):
        try:
            dt = datetime.fromtimestamp(epoch_ms / 1000.0, tz=timezone.utc)
            date_str = dt.isoformat()
        except Exception:
            date_str = None

    mag = props.get("mag")
    mag_f = float(mag) if isinstance(mag, (int, float)) else None

    # Determine severity
    alert = props.get("alert")
    if alert == "red":
        severity = "critical"
    elif alert == "orange":
        severity = "high"
    elif alert == "yellow":
        severity = "medium"
    elif alert == "green":
        severity = "low"
    elif mag_f is not None:
        if mag_f >= 6.5:
            severity = "critical"
        elif mag_f >= 5.0:
            severity = "high"
        elif mag_f >= 3.5:
            severity = "medium"
        else:
            severity = "low"
    else:
        severity = "low"

    # Category: tsunami if indicated, else earthquakes
    category = "tsunami" if props.get("tsunami") == 1 else "earthquakes"

    place = props.get("place") or "Unknown location"
    title = props.get("title") or (f"M {mag_f:.1f} - {place}" if mag_f else f"Earthquake - {place}")

    depth_str = f" Depth: {depth} km." if depth is not None else ""
    description = f"Magnitude {mag_f or 'unknown'} earthquake near {place}.{depth_str}"

    event_id = feature.get("id") or props.get("code") or f"usgs-{lat}-{lng}"

    return create_disaster_event(
        id=f"usgs-{event_id}",
        title=title,
        description=description,
        category=category,
        lat=lat,
        lng=lng,
        date=date_str,
        link=props.get("url"),
        source="usgs",
        severity=severity,
        magnitude=mag_f,
    )


class USGSFetcher(BaseFetcher):
    """Fetches real-time earthquakes from USGS GeoJSON feeds."""

    source_name: str = "usgs"

    def __init__(self, min_magnitude: float = 2.5, timeout: int = 10):
        self.min_magnitude = min_magnitude
        self.timeout = timeout

    def fetch(self, limit: int = 100, days: int = 30) -> List[Dict[str, Any]]:
        # Choose appropriate standard feed or query endpoint
        endpoints = []
        if days <= 1:
            endpoints.append("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson")
            endpoints.append("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
        elif days <= 7:
            endpoints.append("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson")
            endpoints.append("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson")
        else:
            # Monthly feed or custom query
            endpoints.append("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson")
            endpoints.append(
                f"https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude={self.min_magnitude}&limit={limit}"
            )

        for url in endpoints:
            try:
                req = urllib.request.Request(
                    url,
                    headers={
                        "User-Agent": "iAlert-DisasterMonitoring/1.0",
                        "Accept": "application/json",
                    },
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    data = json.loads(resp.read().decode())
                    features = data.get("features", [])
                    results = []
                    for f in features:
                        norm = normalize_usgs(f)
                        if norm:
                            results.append(norm)
                        if len(results) >= limit:
                            break
                    if results:
                        logger.info(f"USGS: Loaded {len(results)} earthquakes from {url[:50]}")
                        return results
            except Exception as exc:
                logger.warning(f"USGS endpoint {url[:60]} failed: {exc}")
                continue

        return []
