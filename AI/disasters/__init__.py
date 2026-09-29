"""
iAlert disaster ingestion package.
Provides modular fetchers for global real-time disaster APIs.
"""

from AI.disasters.base import (
    BaseFetcher,
    CANONICAL_CATEGORIES,
    create_disaster_event,
    validate_coords,
)
from AI.disasters.eonet import EONETFetcher, normalize_eonet
from AI.disasters.firms import FIRMSFetcher, normalize_firms_row, parse_firms_csv
from AI.disasters.gdacs import GDACSFetcher, normalize_gdacs
from AI.disasters.service import DisasterService
from AI.disasters.usgs import USGSFetcher, normalize_usgs

__all__ = [
    "BaseFetcher",
    "CANONICAL_CATEGORIES",
    "create_disaster_event",
    "validate_coords",
    "EONETFetcher",
    "normalize_eonet",
    "FIRMSFetcher",
    "normalize_firms_row",
    "parse_firms_csv",
    "GDACSFetcher",
    "normalize_gdacs",
    "USGSFetcher",
    "normalize_usgs",
    "DisasterService",
]
