import React, { useEffect } from "react";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Slot, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { View, Text, ActivityIndicator } from "react-native";
import { useAuth } from "@clerk/clerk-expo"; 

// --- 1. This is the new, correct way to make the token cache ---
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
// -----------------------------------------------------------------

// Load the publishable key from your .env file
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
}

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // This logic moves your user around the app
    if (isSignedIn) {
      // If you are signed in, go to the "index" (Photo of the Day) screen
      router.replace("/");
    } else {
      // If you are not signed in, go to the sign-in screen
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn]);

  // Show a loading spinner while Clerk checks if you're signed in
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Slot renders the "child" route (either index.jsx or sign-in.jsx)
  return <Slot />;
}

export default function RootLayout() {
  return (
    // --- 2. Pass the new, correct tokenCache to the provider ---
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={CLERK_PUBLISHABLE_KEY}
    >
      <InitialLayout />
    </ClerkProvider>
  );
}