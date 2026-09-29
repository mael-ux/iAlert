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
from AI.disasters.usgs import USGSFetcher, normalize_usgs

__all__ = [
    "BaseFetcher",
    "CANONICAL_CATEGORIES",
    "create_disaster_event",
    "validate_coords",
    "EONETFetcher",
    "normalize_eonet",
    "USGSFetcher",
    "normalize_usgs",
]
