# Clerk Authentication

**Clerk** handles authentication, user session tokens, and user identity across mobile and backend services.

---

## 1. Mobile Integration (`@clerk/clerk-expo`)

- **Root Provider**: In `mobile/app/_layout.jsx`, `<ClerkProvider>` wraps the entire application with `tokenCache` backed by `expo-secure-store`.
- **Public Key**: Loaded via `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **Format Requirement**:
  - Development key: `pk_test_<base64>$` (e.g. `pk_test_aW1tdW5lLWJvYmNhdC00My5jbGVyay5hY2NvdW50cy5kZXYk`).
  - Base64 payload must end in `$` representing the Clerk frontend instance URL.

---

## 2. Backend Webhook Synchronization

- **Route**: `POST /api/webhooks` in `backend/src/routes/webhooks.js`.
- **Signature Verification**: Verified using the `svix` library with secret `CLERK_WEBHOOK_SECRET`.
- **Events Handled**:
  - `user.created` / `user.updated`: Upserts into `usersTable` (`user_id`, `name`, `email`, `location`).
  - `user.deleted`: Removes user row.
- **Contract Resilience**: `email` is nullable in `usersTable` to tolerate users created with phone numbers, OAuth, or missing emails.

---

## Related Notes
- [[Architecture/Database Schema & ERD|Database Schema]]
- [[Services/Mobile App (Expo SDK 57)|Mobile App]]
