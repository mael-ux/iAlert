"""
Base abstractions and canonical data shape for disaster data fetchers.
All coordinates use standard WGS84: lat in [-90, 90], lng in [-180, 180].
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger("ialert.disasters")

# Canonical disaster categories recognized by the Globe UI
CANONICAL_CATEGORIES = {
    "wildfires",
    "volcanoes",
    "severeStorms",
    "floods",
    "earthquakes",
    "landslides",
    "drought",
    "dustHaze",
    "tempExtremes",
    "seaLakeIce",
    "snow",
    "waterColor",
    "manmade",
    "tsunami",
    "cyclone",
}


def validate_coords(lat: Any, lng: Any) -> Optional[tuple[float, float]]:
    """Validate and return (lat, lng) as floats, or None if invalid/out-of-bounds."""
    try:
        if isinstance(lat, bool) or isinstance(lng, bool):
            return None
        lat_f = float(lat)
        lng_f = float(lng)
        if not (-90.0 <= lat_f <= 90.0) or not (-180.0 <= lng_f <= 180.0):
            return None
        return lat_f, lng_f
    except (TypeError, ValueError):
        return None


def create_disaster_event(
    id: str,
    title: str,
    category: str,
    lat: float,
    lng: float,
    date: Optional[str] = None,
    description: str = "",
    link: Optional[str] = None,
    source: str = "unknown",
    severity: Optional[str] = None,
    magnitude: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    """
    Construct a validated canonical disaster event dict.
    Returns None if mandatory fields are missing or coords are invalid.
    """
    coords = validate_coords(lat, lng)
    if coords is None:
        return None

    valid_lat, valid_lng = coords

    # Fallback category if unmapped
    cat = category if category in CANONICAL_CATEGORIES else "manmade"

    return {
        "id": str(id),
        "title": str(title) if title else "Untitled Event",
        "description": str(description) if description else "",
        "category": cat,
        "lat": valid_lat,
        "lng": valid_lng,
        "date": date,
        "link": link,
        "source": str(source),
        "severity": severity,
        "magnitude": magnitude,
    }


class BaseFetcher(ABC):
    """Abstract base class for all external disaster data source fetchers."""

    source_name: str = "unknown"

    @abstractmethod
    def fetch(self, limit: int = 100, days: int = 30) -> List[Dict[str, Any]]:
        """
        Fetch and normalize events from this source.
        Returns a list of canonical disaster event dicts.
        Must not raise uncaught network exceptions; return empty list or fallback on failure.
        """
        raise NotImplementedError
