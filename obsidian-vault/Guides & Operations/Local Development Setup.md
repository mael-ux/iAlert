# Local Development Setup

Follow this guide to run the complete iAlert ecosystem (AI Service, Backend API, and Mobile client) locally.

---

## Prerequisites
- **Node.js**: v20+ and npm.
- **Python**: 3.11+ and pip.
- **Git**.
- **Expo Go App** (SDK 57) on your mobile device (or an Android emulator / web browser).

---

## 1. AI Service Setup (Terminal 1)

1. Navigate to repo root:
   ```bash
   cd /home/leo/projects/iAlert
   ```
2. Install Python dependencies:
   ```bash
   pip install -r AI/requirements.txt python-dotenv
   ```
3. Configure `AI/.env`:
   ```bash
   cat << 'EOF' > AI/.env
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-3.1-flash-lite
   EOF
   ```
4. Start the server on port `8000`:
   ```bash
   uvicorn AI.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 2. Backend API Setup (Terminal 2)

1. Navigate to `backend`:
   ```bash
   cd /home/leo/projects/iAlert/backend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Configure `backend/.env`:
   ```bash
   cat << 'EOF' > backend/.env
   PORT=5001
   NODE_ENV=development
   DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
   EOF
   ```
4. Start the backend server on port `5001`:
   ```bash
   npm run dev
   ```

---

## 3. Mobile Client Setup (Terminal 3)

1. Navigate to `mobile`:
   ```bash
   cd /home/leo/projects/iAlert/mobile
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Configure `mobile/.env.local`:
   ```bash
   cat << 'EOF' > mobile/.env.local
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   EXPO_PUBLIC_AI_API_URL=http://<YOUR_LOCAL_IP>:8000
   EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5001/api
   EOF
   ```
4. Start the Metro bundler:
   ```bash
   npx expo start -c
   ```
5. Open in:
   - **Browser**: Press `w` or visit `http://localhost:8081`.
   - **Phone**: Scan QR code with Expo Go.

---

## Related Notes
- [[Guides & Operations/Environment Variables Guide|Environment Variables Guide]]
- [[Guides & Operations/Troubleshooting & FAQs|Troubleshooting & FAQs]]
- [[Guides & Operations/Testing & CI Workflow|Testing & CI Workflow]]
