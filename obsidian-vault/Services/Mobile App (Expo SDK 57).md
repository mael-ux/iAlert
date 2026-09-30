# Mobile App (Expo SDK 57)

The mobile client is a universal React Native application powered by **Expo SDK 57**, React 19.2, and `expo-router`.

---

## Technical Stack

| Component | Library / Version | Purpose |
|---|---|---|
| Framework | Expo `^57.0.25` | Universal runtime across Android, iOS, and Web. |
| Router | `expo-router` `~57.0.23` | File-based routing with deep linking. |
| UI & Graphics | React Native `0.86.3` / Three.js `^0.180.0` | 3D interactive Globe with custom shaders and markers. |
| Authentication | `@clerk/clerk-expo` `^2.19.1` | User login, session management, secure storage. |
| Hardware APIs | `expo-location`, `expo-image-picker`, `expo-notifications`, `expo-haptics` | Device GPS, camera capture, push alerts. |
| Storage | `expo-secure-store`, `@react-native-async-storage` | Token caching, local preferences, dark/light themes. |

---

## App Screens & Navigation Structure

```
app/
├── _layout.jsx             # Root layout with ClerkProvider, ThemeProvider & alert polling
├── index.jsx               # Welcome screen with NASA Photo of the Day
├── (auth)/                 # Authentication routes (Sign In, Sign Up, Verify Email)
└── (tabs)/                 # Main bottom tab bar
    ├── weather.jsx         # Current weather & forecast with city search
    ├── index.jsx           # 3D Interactive Disaster Globe (GlobeMap)
    ├── report.jsx          # Citizen Disaster Reporting screen (Camera, GPS, category)
    ├── chatbot.jsx         # iAlert GenAI weather & disaster conversational assistant
    └── user.jsx            # User profile, alert preferences, and account settings
```

---

## Key Features

### 1. Interactive 3D Disaster Globe (`components/globeMap.jsx`)
- Built with **Three.js** inside a WebView (on mobile) or an `<iframe>` (on web).
- Plots real-time markers colored by disaster category.
- Shows telemetry badges (`NASA EONET`, `GDACS`, `USGS`, `ReliefWeb`).
- Clicking any marker opens an inspection card with nearby corroborating telemetry (~200 km) and a CTA button to report from that zone.

### 2. Citizen Disaster Reporting (`(tabs)/report.jsx`)
- Automatic device location capture via `expo-location` with manual coordinate fallback.
- Photo attachment via camera capture or gallery selection via `expo-image-picker`.
- Submits directly to the backend `POST /api/reports`.

### 3. Conversational AI Assistant (`(tabs)/chatbot.jsx`)
- Connects to the FastAPI service at `POST /api/chat`.
- Maintains conversation history across turns.
- Injects mandatory OpenWeather attribution when weather data is referenced.

---

## Development Scripts

```bash
cd mobile
npm install               # Install dependencies
npx expo start -c         # Start Metro bundler with cleared cache
npx tsc --noEmit          # Typecheck TypeScript files
npm run lint              # Run ESLint validation
```

---

## Related Notes
- [[Architecture/Overview|System Architecture Overview]]
- [[Guides & Operations/Local Development Setup|Local Development Setup]]
- [[Decisions (ADRs)/ADR-003 - Expo SDK 57 Upgrade|ADR-003: Expo SDK 57 Upgrade]]
