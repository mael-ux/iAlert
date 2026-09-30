"""
GDACS (Global Disaster Alert and Coordination System) disaster fetcher.
Fetches multi-hazard alerts (cyclones, floods, earthquakes, droughts, volcanoes, tsunamis).
Uses the GDACS SEARCH GeoJSON API with fallback to GeoRSS.
"""

import json
import logging
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional

from AI.disasters.base import BaseFetcher, create_disaster_event

logger = logging.getLogger("ialert.disasters.gdacs")

# GDACS event type code -> Canonical category
GDACS_TYPE_MAP = {
    "TC": "cyclone",
    "FL": "floods",
    "EQ": "earthquakes",
    "VO": "volcanoes",
    "DR": "drought",
    "TS": "tsunami",
    "WF": "wildfires",
}

# Alert level -> Canonical severity
GDACS_SEVERITY_MAP = {
    "red": "critical",
    "orange": "high",
    "yellow": "medium",
    "green": "low",
}


def normalize_gdacs(feature: Any) -> Optional[Dict[str, Any]]:
    """
    Normalize one GDACS GeoJSON Feature into canonical dict.
    Returns None if missing coordinates or unparseable.
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

    event_type = str(props.get("eventtype", "")).upper()
    category = GDACS_TYPE_MAP.get(event_type, "manmade")

    alert_level = str(props.get("alertlevel", "")).lower()
    severity = GDACS_SEVERITY_MAP.get(alert_level, "medium")

    # Name and descriptions
    name = props.get("name") or props.get("eventname") or "GDACS Event"
    desc = props.get("description") or props.get("htmldescription") or ""
    # Strip HTML tags if present in htmldescription
    if "<" in desc and ">" in desc:
        import re
        desc = re.sub(r"<[^>]+>", "", desc).strip()

    # Link from url object or report string
    url_obj = props.get("url")
    link = None
    if isinstance(url_obj, dict):
        link = url_obj.get("report") or url_obj.get("details")
    elif isinstance(url_obj, str):
        link = url_obj

    # Magnitude / severity value
    sev_data = props.get("severitydata", {}) or {}
    mag_val = sev_data.get("severity") if isinstance(sev_data, dict) else None
    mag_f = float(mag_val) if isinstance(mag_val, (int, float)) else None

    event_id = props.get("eventid") or f"{event_type}-{lat}-{lng}"

    date_str = props.get("fromdate") or props.get("datemodified") or props.get("todate")

    return create_disaster_event(
        id=f"gdacs-{event_id}",
        title=name,
        description=desc,
        category=category,
        lat=lat,
        lng=lng,
        date=date_str,
        link=link,
        source="gdacs",
        severity=severity,
        magnitude=mag_f,
    )


def _parse_georss(xml_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse GDACS GeoRSS feed as fallback."""
    results = []
    try:
        root = ET.fromstring(xml_bytes)
        # Namespaces
        namespaces = {
            "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
            "gdacs": "http://www.gdacs.org",
        }

        channel = root.find("channel")
        if channel is None:
            return []

        for item in channel.findall("item"):
            title = item.findtext("title", "GDACS Event")
            desc = item.findtext("description", "")
            link = item.findtext("link", "")
            pub_date = item.findtext("pubDate")
            
            event_type = item.findtext("{http://www.gdacs.org}eventtype", "").upper()
            alert_level = item.findtext("{http://www.gdacs.org}alertlevel", "").lower()
            event_id = item.findtext("{http://www.gdacs.org}eventid", "")

            lat_elem = item.find("{http://www.w3.org/2003/01/geo/wgs84_pos#}lat")
            lng_elem = item.find("{http://www.w3.org/2003/01/geo/wgs84_pos#}long")

            if lat_elem is not None and lng_elem is not None and lat_elem.text and lng_elem.text:
                try:
                    lat = float(lat_elem.text.strip())
                    lng = float(lng_elem.text.strip())
                except ValueError:
                    continue

                category = GDACS_TYPE_MAP.get(event_type, "manmade")
                severity = GDACS_SEVERITY_MAP.get(alert_level, "medium")

                norm = create_disaster_event(
                    id=f"gdacs-{event_id or f'{lat}-{lng}'}",
                    title=title,
                    description=desc,
                    category=category,
                    lat=lat,
                    lng=lng,
                    date=pub_date,
                    link=link,
                    source="gdacs",
                    severity=severity,
                )
                if norm:
                    results.append(norm)
    except Exception as exc:
        logger.warning(f"Error parsing GDACS GeoRSS: {exc}")

    return results


class GDACSFetcher(BaseFetcher):
    """Fetches real-time multi-hazard disaster alerts from GDACS."""

    source_name: str = "gdacs"

    def __init__(self, timeout: int = 15):
        self.timeout = timeout

    def fetch(self, limit: int = 100, days: int = 30) -> List[Dict[str, Any]]:
        # Primary: GeoJSON SEARCH endpoint
        geojson_url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"
        try:
            req = urllib.request.Request(
                geojson_url,
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
                    norm = normalize_gdacs(f)
                    if norm:
                        results.append(norm)
                    if len(results) >= limit:
                        break
                if results:
                    logger.info(f"GDACS: Loaded {len(results)} events from GeoJSON")
                    return results
        except Exception as exc:
            logger.warning(f"GDACS GeoJSON endpoint failed: {exc}")

        # Fallback: GeoRSS XML feed
        rss_url = "https://www.gdacs.org/xml/rss.xml"
        try:
            req = urllib.request.Request(
                rss_url,
                headers={
                    "User-Agent": "iAlert-DisasterMonitoring/1.0",
                    "Accept": "application/xml, text/xml",
                },
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                results = _parse_georss(resp.read())
                if results:
                    logger.info(f"GDACS: Loaded {len(results)} events from GeoRSS fallback")
                    return results[:limit]
        except Exception as exc:
            logger.warning(f"GDACS GeoRSS endpoint failed: {exc}")

        return []
