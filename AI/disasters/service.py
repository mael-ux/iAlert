"""
Unified disaster aggregation service with per-source caching,
parallel fetching, and partial failure resilience.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import logging
import threading
from typing import Any, Dict, List, Optional, Set

from AI.disasters.base import BaseFetcher
from AI.disasters.eonet import EONETFetcher
from AI.disasters.firms import FIRMSFetcher
from AI.disasters.gdacs import GDACSFetcher
from AI.disasters.usgs import USGSFetcher

logger = logging.getLogger("ialert.disasters.service")

CACHE_TTL_SECONDS = 300  # 5 minutes per source


class _SourceCacheEntry:
    def __init__(self, events: List[Dict[str, Any]], timestamp: float):
        self.events = events
        self.timestamp = timestamp


class DisasterService:
    """Coordinates fetching from multiple disaster data sources with caching and resilience."""

    def __init__(self, cache_ttl: int = CACHE_TTL_SECONDS):
        self.cache_ttl = cache_ttl
        self._lock = threading.Lock()
        self._caches: Dict[str, _SourceCacheEntry] = {}
        self.fetchers: Dict[str, BaseFetcher] = {
            "eonet": EONETFetcher(),
            "gdacs": GDACSFetcher(),
            "usgs": USGSFetcher(),
            "firms": FIRMSFetcher(),
        }

    def register_fetcher(self, name: str, fetcher: BaseFetcher) -> None:
        """Register a custom or additional fetcher."""
        self.fetchers[name] = fetcher

    def available_sources(self) -> List[str]:
        return list(self.fetchers.keys())

    def _get_cached(self, source: str, force_refresh: bool) -> Optional[List[Dict[str, Any]]]:
        if force_refresh:
            return None
        with self._lock:
            entry = self._caches.get(source)
            if entry is None:
                return None
            age = datetime.now(timezone.utc).timestamp() - entry.timestamp
            if age < self.cache_ttl:
                return entry.events
        return None

    def _get_stale(self, source: str) -> Optional[List[Dict[str, Any]]]:
        with self._lock:
            entry = self._caches.get(source)
            return entry.events if entry else None

    def _set_cache(self, source: str, events: List[Dict[str, Any]]) -> None:
        with self._lock:
            self._caches[source] = _SourceCacheEntry(
                events=events,
                timestamp=datetime.now(timezone.utc).timestamp(),
            )

    def fetch_source(
        self,
        source: str,
        limit: int = 100,
        days: int = 30,
        force_refresh: bool = False,
    ) -> List[Dict[str, Any]]:
        """Fetch a single source with cache lookup and stale fallback."""
        cached = self._get_cached(source, force_refresh)
        if cached is not None:
            logger.debug(f"Serving cached data for source: {source}")
            return cached

        fetcher = self.fetchers.get(source)
        if not fetcher:
            logger.warning(f"Unknown disaster source requested: {source}")
            return []

        try:
            events = fetcher.fetch(limit=limit, days=days)
            if events:
                self._set_cache(source, events)
                return events
            # Empty results: try serving stale cache if available
            stale = self._get_stale(source)
            if stale:
                logger.info(f"Source {source} returned empty; serving {len(stale)} stale events.")
                return stale
            return []
        except Exception as exc:
            logger.error(f"Error fetching source {source}: {exc}")
            stale = self._get_stale(source)
            if stale:
                logger.info(f"Serving stale cache for {source} after error.")
                return stale
            return []

    def fetch_all(
        self,
        sources: Optional[List[str]] = None,
        limit: int = 150,
        days: int = 30,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Fetch from all requested or available sources concurrently.
        Tolerates partial failures: returns whatever sources succeed.
        """
        requested_sources: List[str] = []
        if sources:
            requested_sources = [s.strip().lower() for s in sources if s.strip().lower() in self.fetchers]
        if not requested_sources:
            requested_sources = list(self.fetchers.keys())

        # Allocate per-source limits
        per_source_limit = max(30, (limit // len(requested_sources)) + 15)

        all_events: List[Dict[str, Any]] = []
        counts_by_source: Dict[str, int] = {}
        active_sources: Set[str] = set()

        # Concurrent fan-out
        with ThreadPoolExecutor(max_workers=min(4, len(requested_sources))) as executor:
            future_to_source = {
                executor.submit(
                    self.fetch_source,
                    src,
                    per_source_limit,
                    days,
                    force_refresh,
                ): src
                for src in requested_sources
            }

            for future in as_completed(future_to_source):
                src = future_to_source[future]
                try:
                    events = future.result()
                    if events:
                        all_events.extend(events)
                        counts_by_source[src] = len(events)
                        active_sources.add(src)
                    else:
                        counts_by_source[src] = 0
                except Exception as exc:
                    logger.error(f"Worker failed for source {src}: {exc}")
                    counts_by_source[src] = 0

        # Sort events by date descending (safely handling None dates)
        def _sort_key(evt: Dict[str, Any]) -> str:
            return evt.get("date") or ""

        all_events.sort(key=_sort_key, reverse=True)

        # Truncate to overall limit
        final_events = all_events[:limit]

        return {
            "status": "ok",
            "count": len(final_events),
            "events": final_events,
            "sources": sorted(list(active_sources)),
            "counts_by_source": counts_by_source,
            "cached": not force_refresh,
        }
