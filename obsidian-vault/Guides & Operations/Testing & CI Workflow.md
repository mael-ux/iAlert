# Testing & CI Workflow

iAlert implements automated unit tests, offline contract checks, live endpoint verification, and a continuous integration pipeline via GitHub Actions.

---

## 1. Unified Test Runner (`package.json`)

You can run all three service tests from the repository root with a single command:

```bash
npm test
```

This runs sequentially:
1. `npm run test:ai` $\rightarrow$ `python3 AI/test_disasters.py && python3 AI/test_chat.py`
2. `npm run test:backend` $\rightarrow$ `node backend/test_incidents.js`
3. `npm run test:mobile` $\rightarrow$ `cd mobile && npx tsc --noEmit`

---

## 2. Test Suite Breakdown

### AI Service Tests
- **`AI/test_disasters.py`** (9 tests, offline):
  - Validates WGS84 coordinate boundary rules.
  - Tests canonical event normalization across fixtures (`eonet_v2.json`, `eonet_v3.json`, `usgs_sample.json`, `gdacs_sample.json`, `firms_sample.csv`).
  - Tests `DisasterService` concurrency and cache contracts.
- **`AI/test_chat.py`** (9 tests, offline):
  - Validates tool schema naming, 401 error mapping, cache TTL, per-minute guard trips, and attribution enforcement.
- **`AI/test_api.py --live`** (9 smoke checks, requires running server):
  - Tests live HTTP status across all public endpoints and validates multi-source responses.

### Backend Tests
- **`backend/test_incidents.js`**:
  - Tests the Haversine distance calculations and ensures proximity clustering threshold (~35 km) behaves deterministically.

### Mobile Tests
- **`mobile/package.json` (`npm test`)**:
  - Executes `tsc --noEmit` under strict TypeScript rules to ensure zero type or import regressions across all screens and components.

---

## 3. GitHub Actions CI (`.github/workflows/ci.yml`)

The CI workflow runs on every push and pull request targeting `main`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-ai:       # Runs on Python 3.11 with pip caching
  test-backend:  # Runs on Node.js 20 with npm caching
  test-mobile:   # Runs TypeScript typecheck on Node.js 20
```

---

## Related Notes
- [[Guides & Operations/Local Development Setup|Local Development Setup]]
- [[Services/AI Service (FastAPI & Gemini)|AI Service]]
