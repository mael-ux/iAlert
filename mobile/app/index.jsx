import { useRouter, Redirect } from "expo-router";
import { Pressable, View, Text, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { useAuth } from "@clerk/clerk-expo"; // Import Clerk's useAuth hook
import { COLORS } from "../constants/colors";

const { width, height } = Dimensions.get("window");

const errorPlaceholder = require('../assets/images/placeholder.png'); 

export default function PhotoOfTheDay() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth(); // Get auth state from Clerk

  // We need two loading states:
  // 1. dataLoading: for fetching your photo from Neon
  // 2. isLoaded: from Clerk, for checking auth status
  const [dataLoading, setDataLoading] = useState(true);
  const [apodData, setApodData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Only fetch data if the user is signed in
    if (isSignedIn) {
      const fetchApodFromMyDb = async () => {
        try {
          // --- IMPORTANT: Change this to YOUR backend API endpoint ---
          const response = await fetch('https://your-backend.com/api/apod');
          
          if (!response.ok) {
            throw new Error('Failed to fetch from DB');
          }
          
          const data = await response.json();
          // Assuming data is { url, title, description }
          setApodData(data); 

        } catch (err) {
          console.error("Error fetching APOD:", err);
          setError(true); // Set error state
        } finally {
          setDataLoading(false); // Stop data loading
        }
      };

      fetchApodFromMyDb();
    }
  }, [isSignedIn]); // Re-run if isSignedIn changes

  const handleContinue = () => {
    router.replace("/(tabs)"); // go to tabs
  };

  // --- 1. Wait for Clerk to load ---
  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // --- 2. If Clerk is loaded and user is NOT signed in, redirect ---
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // --- 3. If Clerk is loaded AND user IS signed in, show the screen ---
  // Show loading indicator while fetching from your DB
  if (dataLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // --- 4. Data is loaded (or failed), show the pressable screen ---
  
  // Decide what image to show:
  // - If error: show placeholder
  // - If success: show the URL from your database
  const imageSource = (error || !apodData) 
    ? errorPlaceholder 
    : { uri: apodData.url };

  const title = (error || !apodData)
    ? "Could not load photo"
    : apodData.title;

  return (
    <Pressable style={styles.container} onPress={handleContinue}>
      <Image 
        source={imageSource} 
        style={styles.image} 
        contentFit="cover" 
      />
      <View style={styles.footer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.prompt}>Tap anywhere to continue</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  image: { width, height: height * 0.72 },
  footer: { padding: 16, backgroundColor: COLORS.white, flex: 1, alignItems: "center", justifyContent: "flex-start" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6, textAlign: "center", color: COLORS.primary },
  prompt: { marginTop: 10, color: COLORS.primary, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.white },
});