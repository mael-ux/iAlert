import React, { useEffect } from "react";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Slot, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ThemeProvider } from "./ThemeContext";
// import { useAlertPolling } from "./hooks/useAlertPolling";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const tokenCache = {
  async getToken(key) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

function InitialLayout() {
  const router = useRouter();
  
  // ⚠️ ALERT POLLING TEMPORARILY DISABLED
  // Reason: Backend /api/alerts/check-new endpoint doesn't exist yet
  // Will re-enable after implementing database user sync
  // useAlertPolling();

  return <Slot />;
}

export default function RootLayout() {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error("Missing Clerk Publishable Key");
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={CLERK_PUBLISHABLE_KEY}>
      {/* ✅ CRITICAL FIX: ThemeProvider must wrap EVERYTHING including SignedIn/SignedOut */}
      <ThemeProvider>
        <SignedIn>
          <InitialLayout />
        </SignedIn>
        <SignedOut>
          <Slot />
        </SignedOut>
      </ThemeProvider>
    </ClerkProvider>
  );
}
