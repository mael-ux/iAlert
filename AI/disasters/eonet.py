"""
NASA EONET (Earth Observatory Natural Event Tracker) disaster fetcher.
Supports EONET v3 and v2.1 shapes with multi-endpoint fallback.
"""

import json
import logging
import urllib.request
from typing import Any, Dict, List, Optional

from AI.disasters.base import BaseFetcher, create_disaster_event

logger = logging.getLogger("ialert.disasters.eonet")


def normalize_eonet(evt: Any) -> Optional[Dict[str, Any]]:
    """
    Normalize one raw NASA EONET event (v2.1 or v3 shape) into canonical dict.
    Returns None when the event carries no usable geometry/coordinates.

    Version duality handled here (Issue #45):
    - v3 uses "geometry", v2.1 uses "geometries"
    - categories/sources entries are dicts in both versions
    """
    if not isinstance(evt, dict):
        return None

    geometries = evt.get("geometry") or evt.get("geometries")
    if not geometries:
        return None

    geom = geometries[-1] if isinstance(geometries, list) else geometries
    if not isinstance(geom, dict):
        return None

    coords = geom.get("coordinates", [])
    if len(coords) < 2:
        return None

    categories = evt.get("categories", [])
    category = "manmade"
    if categories and len(categories) > 0:
        cat_obj = categories[0]
        category = cat_obj.get("id") if isinstance(cat_obj, dict) else str(cat_obj)

    sources = evt.get("sources", [])
    link = None
    if sources and len(sources) > 0:
        source_obj = sources[0]
        link = source_obj.get("url") if isinstance(source_obj, dict) else None

    # GeoJSON coords are [longitude, latitude]
    raw_lng = coords[0]
    raw_lat = coords[1]

    return create_disaster_event(
        id=evt.get("id", f"eonet-{raw_lat}-{raw_lng}"),
        title=evt.get("title", "NASA EONET Event"),
        description=evt.get("description", ""),
        category=category,
        lat=raw_lat,
        lng=raw_lng,
        date=geom.get("date"),
        link=link or evt.get("link"),
        source="eonet",
    )


class EONETFetcher(BaseFetcher):
    """Fetches real-time natural events from NASA EONET API."""

    source_name: str = "eonet"

    def __init__(self, timeout: int = 15):
        self.timeout = timeout

    def fetch(self, limit: int = 100, days: int = 30) -> List[Dict[str, Any]]:
        endpoints = [
            f"https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit={limit}",
            f"https://eonet.gsfc.nasa.gov/api/v2.1/events?status=open&limit={limit}&days={days}",
            f"https://api.allorigins.win/raw?url=https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit={limit}",
            f"https://corsproxy.io/?https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit={limit}",
        ]

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
                    if "contents" in data:
                        data = json.loads(data["contents"])
                    events = data.get("events", [])
                    results = []
                    for e in events:
                        norm = normalize_eonet(e)
                        if norm:
                            results.append(norm)
                    if results:
                        return results
            except Exception as exc:
                logger.warning(f"EONET endpoint {url[:60]} failed: {exc}")
                continue

        return []
