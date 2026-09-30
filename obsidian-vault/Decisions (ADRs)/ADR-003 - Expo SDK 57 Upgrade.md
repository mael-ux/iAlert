# ADR-003: Expo SDK 57 & React 19 Upgrade

- **Status**: Accepted
- **Deciders**: Core Engineering Team
- **Date**: 2026-09-28 / 2026-09-29

---

## Context & Problem Statement
Developers and users downloading the latest **Expo Go** application from Google Play / Apple App Store were locked out of running the project locally due to version mismatch errors (`SDK 54 required, but client is SDK 57`).

## Decision Outcome
Upgraded the mobile client from Expo SDK 54 to **Expo SDK 57**:
- `expo`: `^57.0.25`
- `react`: `19.2.3` / `react-native`: `0.86.3`
- `expo-router`: `~57.0.23`
- Migrated navigation imports from `@react-navigation/native` to native `expo-router` hooks (`useNavigation`, `useRouter`).
- Added `@expo/ngrok` for reliable tunnel connection.

### Consequences
- **Positive**: App loads directly on latest Expo Go devices without custom binary building; benefited from React 19 compiler optimizations and Hermes enhancements.
- **Negative**: Required migrating deprecated `react-navigation` imports.

---

## Related Notes
- [[Services/Mobile App (Expo SDK 57)|Mobile App Details]]
- [[Guides & Operations/Troubleshooting & FAQs|Troubleshooting]]
