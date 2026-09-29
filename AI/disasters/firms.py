"""
NASA FIRMS (Fire Information for Resource Management System) active fire fetcher.
Processes near-real-time satellite thermal anomaly detections (VIIRS / MODIS).
Operates with graceful degradation: if FIRMS_MAP_KEY is not configured, returns []
without error so that the rest of the application remains fully functional.
"""

import csv
import io
import logging
import os
import urllib.request
from typing import Any, Dict, List, Optional

from AI.disasters.base import BaseFetcher, create_disaster_event

logger = logging.getLogger("ialert.disasters.firms")


def normalize_firms_row(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Normalize one CSV row or dict from FIRMS satellite detection.
    Expected fields: latitude, longitude, acq_date, acq_time, confidence, frp, bright_ti4.
    """
    if not isinstance(row, dict):
        return None

    try:
        lat = float(row.get("latitude", 0))
        lng = float(row.get("longitude", 0))
    except (TypeError, ValueError):
        return None

    acq_date = row.get("acq_date", "")
    acq_time = str(row.get("acq_time", "")).zfill(4)
    time_iso = f"{acq_date}T{acq_time[:2]}:{acq_time[2:4]}:00Z" if acq_date else None

    # FRP (Fire Radiative Power) in MW
    frp_raw = row.get("frp")
    try:
        frp_f = float(frp_raw) if frp_raw is not None else None
    except (ValueError, TypeError):
        frp_f = None

    confidence = str(row.get("confidence", "nominal")).lower()
    if confidence in ("h", "high") or (frp_f and frp_f >= 50.0):
        severity = "high"
    elif confidence in ("l", "low") or (frp_f and frp_f < 10.0):
        severity = "low"
    else:
        severity = "medium"

    brightness = row.get("bright_ti4") or row.get("brightness") or ""
    bright_str = f", Brightness: {brightness}K" if brightness else ""
    frp_str = f", FRP: {frp_f}MW" if frp_f is not None else ""

    sat = row.get("satellite") or "VIIRS"
    title = f"Active Wildfire Hotspot ({sat})"
    desc = f"Satellite thermal anomaly detection. Confidence: {confidence}{bright_str}{frp_str}."

    event_id = f"firms-{lat:.3f}-{lng:.3f}-{acq_date}-{acq_time}"

    return create_disaster_event(
        id=event_id,
        title=title,
        description=desc,
        category="wildfires",
        lat=lat,
        lng=lng,
        date=time_iso,
        link="https://firms.modaps.eosdis.nasa.gov/",
        source="firms",
        severity=severity,
        magnitude=frp_f,
    )


def parse_firms_csv(csv_text: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Parse FIRMS CSV response into canonical event dicts."""
    results = []
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    for row in reader:
        norm = normalize_firms_row(row)
        if norm:
            results.append(norm)
        if len(results) >= limit:
            break
    return results


class FIRMSFetcher(BaseFetcher):
    """
    Fetches real-time active wildfire observations from NASA FIRMS.
    Requires FIRMS_MAP_KEY or FIRMS_API_KEY environment variable.
    Fails closed/gracefully when key is omitted.
    """

    source_name: str = "firms"

    def __init__(self, api_key: Optional[str] = None, timeout: int = 12):
        self.api_key = api_key or os.environ.get("FIRMS_MAP_KEY") or os.environ.get("FIRMS_API_KEY")
        self.timeout = timeout
        self._logged_missing_key = False

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def fetch(self, limit: int = 100, days: int = 1) -> List[Dict[str, Any]]:
        if not self.api_key:
            if not self._logged_missing_key:
                logger.info("FIRMS API key not configured; skipping NASA FIRMS active fire layer.")
                self._logged_missing_key = True
            return []

        # FIRMS limits day range to 1..10
        bounded_days = min(max(1, days), 5)
        # Global VIIRS NRT endpoint
        url = (
            f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
            f"{self.api_key}/VIIRS_SNPP_NRT/world/{bounded_days}"
        )

        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "iAlert-DisasterMonitoring/1.0",
                    "Accept": "text/csv",
                },
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                csv_content = resp.read().decode("utf-8", errors="ignore")
                results = parse_firms_csv(csv_content, limit=limit)
                logger.info(f"FIRMS: Loaded {len(results)} active fire detections")
                return results
        except Exception as exc:
            logger.warning(f"FIRMS fetch failed: {exc}")
            return []
