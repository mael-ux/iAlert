import { Stack, Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View, ActivityIndicator } from "react-native";
import { COLORS } from "../../constants/colors"; // Make sure path is correct

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // Wait for Clerk to load its state
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // If the user IS signed in, redirect them away from
  // the auth screens and back to the app's entry point (POTD screen).
  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  // If the user is NOT signed in, show the auth screens
  // (sign-in, sign-up)
  return <Stack screenOptions={{ headerShown: false }} />;
}