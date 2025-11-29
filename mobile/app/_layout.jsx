// mobile/app/_layout.jsx
import React, { useEffect } from "react";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Slot, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useAlertPolling } from "./hooks/useAlertPolling"; 

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

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  
  // ← NUEVO: Activar polling de alertas
  const { startPolling, stopPolling } = useAlertPolling();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      router.replace("/");
      // Iniciar polling cuando el usuario esté autenticado
      startPolling();
    } else {
      router.replace("/(auth)/sign-in");
      // Detener polling si el usuario cierra sesión
      stopPolling();
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={CLERK_PUBLISHABLE_KEY}
    >
      <InitialLayout />
    </ClerkProvider>
  );
}