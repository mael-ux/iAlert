# Troubleshooting & FAQs

Common issues encountered during local development and their solutions.

---

## 1. Expo Go: "Project is incompatible with this version of Expo Go (SDK 54 vs SDK 57)"
- **Cause**: The Expo Go app on your phone was updated to SDK 57 from the app store while the project was previously locked to SDK 54.
- **Solution**: The project is now upgraded to **Expo SDK 57** (`expo@^57.0.25`, `react-native@0.86.3`). Run `cd mobile && npm install` and restart Metro with `npx expo start -c`.

---

## 2. React Native Web: "Rendered more hooks than during the previous render"
- **Cause**: `useMemo` or other hooks placed after an early return (`if (loading) return ...`) in React.
- **Solution**: All hooks must be declared unconditionally at the top of the component. In `components/globeMap.jsx`, `topDisasters` and `corroboratingSources` are computed before the loading guard.

---

## 3. Expo Router: "expo-router is no longer compatible with react-navigation"
- **Cause**: Expo SDK 57 no longer supports importing from `@react-navigation/native` directly inside `expo-router` projects.
- **Solution**: Import hooks directly from `expo-router`:
  ```javascript
  // Bad
  import { useNavigation } from '@react-navigation/native';
  // Good
  import { useNavigation, useRouter } from 'expo-router';
  ```

---

## 4. Backend: "Error: No database connection string was provided to neon()"
- **Cause**: Missing `DATABASE_URL` in `backend/.env`.
- **Solution**: Create `backend/.env` with your Neon connection string (`DATABASE_URL=postgresql://...`).

---

## 5. Web: "CORS error / NetworkError when attempting to fetch resource"
- **Cause**: The browser enforces Same-Origin Policy when making requests from `http://localhost:8081` to `http://localhost:5001`.
- **Solution**: Ensure `app.use(cors())` is enabled in `backend/src/server.js`.

---

## 6. AI: "[Errno 98] Address already in use"
- **Cause**: An existing `uvicorn` process is already listening on port `8000`.
- **Solution**: Kill the existing process:
  ```bash
  fuser -k 8000/tcp
  ```

---

## 7. AI: "429 RESOURCE_EXHAUSTED / quota exceeded" on Gemini
- **Cause**: `gemini-3.8-flash` free tier daily quota exhausted.
- **Solution**: Use `gemini-3.1-flash-lite` by setting `GEMINI_MODEL=gemini-3.1-flash-lite` in `AI/.env`.

---

## Related Notes
- [[Guides & Operations/Local Development Setup|Local Development Setup]]
- [[Guides & Operations/Environment Variables Guide|Environment Variables Guide]]
