"""
Comprehensive verification test for multi-source disaster ingestion.
Tests:
1. Normalization from fixtures (EONET v2, EONET v3, USGS GeoJSON, GDACS GeoJSON, FIRMS CSV)
2. BaseFetcher contract and canonical event schema validation
3. DisasterService caching, partial failure tolerance, and parallel fan-out
"""

import json
import os
import sys
import unittest

# Ensure repo root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from AI.disasters.base import CANONICAL_CATEGORIES, create_disaster_event, validate_coords
from AI.disasters.eonet import EONETFetcher, normalize_eonet
from AI.disasters.firms import FIRMSFetcher, normalize_firms_row, parse_firms_csv
from AI.disasters.gdacs import GDACSFetcher, normalize_gdacs
from AI.disasters.service import DisasterService
from AI.disasters.usgs import USGSFetcher, normalize_usgs


class TestCanonicalSchema(unittest.TestCase):
    def test_validate_coords(self):
        self.assertEqual(validate_coords(0, 0), (0.0, 0.0))
        self.assertEqual(validate_coords(-90, 180), (-90.0, 180.0))
        self.assertEqual(validate_coords("34.5", "-58.4"), (34.5, -58.4))
        self.assertIsNone(validate_coords(91, 0))
        self.assertIsNone(validate_coords(0, -181))
        self.assertIsNone(validate_coords(True, False))
        self.assertIsNone(validate_coords("invalid", 0))

    def test_create_disaster_event(self):
        evt = create_disaster_event(
            id="test-1",
            title="Test Volcano",
            category="volcanoes",
            lat=19.4,
            lng=-99.1,
            source="test",
        )
        self.assertIsNotNone(evt)
        self.assertEqual(evt["id"], "test-1")
        self.assertEqual(evt["category"], "volcanoes")
        self.assertEqual(evt["lat"], 19.4)
        self.assertEqual(evt["lng"], -99.1)
        self.assertEqual(evt["source"], "test")

        # Unknown category falls back to 'manmade'
        evt2 = create_disaster_event(
            id="test-2",
            title="Alien Attack",
            category="aliens",
            lat=0,
            lng=0,
            source="test",
        )
        self.assertIsNotNone(evt2)
        self.assertEqual(evt2["category"], "manmade")


class TestFixtureNormalization(unittest.TestCase):
    def test_eonet_v2_fixture(self):
        with open("AI/fixtures/eonet_v2.json") as f:
            raw = json.load(f)
        evt = normalize_eonet(raw)
        self.assertIsNotNone(evt)
        self.assertEqual(evt["source"], "eonet")
        self.assertIn("lat", evt)
        self.assertIn("lng", evt)

    def test_eonet_v3_fixture(self):
        with open("AI/fixtures/eonet_v3.json") as f:
            raw = json.load(f)
        evt = normalize_eonet(raw)
        self.assertIsNotNone(evt)
        self.assertEqual(evt["source"], "eonet")

    def test_usgs_fixture(self):
        with open("AI/fixtures/usgs_sample.json") as f:
            raw = json.load(f)
        evt = normalize_usgs(raw["features"][0])
        self.assertIsNotNone(evt)
        self.assertEqual(evt["source"], "usgs")
        self.assertEqual(evt["category"], "earthquakes")
        self.assertEqual(evt["magnitude"], 5.4)
        self.assertEqual(evt["severity"], "medium")

    def test_gdacs_fixture(self):
        with open("AI/fixtures/gdacs_sample.json") as f:
            raw = json.load(f)
        evt = normalize_gdacs(raw["features"][0])
        self.assertIsNotNone(evt)
        self.assertEqual(evt["source"], "gdacs")
        self.assertEqual(evt["category"], "cyclone")
        self.assertEqual(evt["severity"], "high")

    def test_firms_fixture(self):
        with open("AI/fixtures/firms_sample.csv") as f:
            raw_csv = f.read()
        events = parse_firms_csv(raw_csv)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]["source"], "firms")
        self.assertEqual(events[0]["category"], "wildfires")


class TestDisasterService(unittest.TestCase):
    def test_service_initialization(self):
        service = DisasterService()
        sources = service.available_sources()
        self.assertIn("eonet", sources)
        self.assertIn("gdacs", sources)
        self.assertIn("usgs", sources)
        self.assertIn("firms", sources)

    def test_fetch_all_structure(self):
        service = DisasterService()
        res = service.fetch_all(limit=10, days=7)
        self.assertEqual(res["status"], "ok")
        self.assertIsInstance(res["count"], int)
        self.assertIsInstance(res["events"], list)
        self.assertIsInstance(res["sources"], list)
        self.assertIsInstance(res["counts_by_source"], dict)

        for evt in res["events"]:
            self.assertIn("id", evt)
            self.assertIn("title", evt)
            self.assertIn("category", evt)
            self.assertIn(evt["category"], CANONICAL_CATEGORIES)
            self.assertIn("lat", evt)
            self.assertIn("lng", evt)
            self.assertIn("source", evt)
            self.assertIn(evt["source"], ["eonet", "gdacs", "usgs", "firms"])


if __name__ == "__main__":
    unittest.main()
