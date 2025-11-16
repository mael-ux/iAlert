import { useRouter, Redirect } from "expo-router";
import { Pressable, View, Text, ActivityIndicator, StyleSheet, Dimensions, StatusBar } from "react-native";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { useAuth } from "@clerk/clerk-expo"; 
import { COLORS } from "../constants/colors";
import { API_URL } from "../constants/api";

const { width, height } = Dimensions.get("window");

const errorPlaceholder = require('../assets/images/placeholder.png'); 

// Static fallback APOD data for when the API is down
const FALLBACK_APOD = {
  title: "Horsehead Nebula",
  url: "https://apod.nasa.gov/apod/image/2301/Horsehead_Hubble_1225.jpg",
  explanation: "The Horsehead Nebula is one of the most identifiable nebulae in the sky, located in the constellation Orion. This iconic shape is sculpted from dense clouds of molecular gas and dust.",
  copyright: "NASA, ESA, Hubble Heritage Team"
};

export default function PhotoOfTheDay() {
  const router = useRouter();
  // We still need these hooks to know *when* to fetch data
  const { isSignedIn, isLoaded } = useAuth(); 

  const [dataLoading, setDataLoading] = useState(true);
  const [apodData, setApodData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Only fetch data if Clerk is loaded AND the user is signed in
    if (isLoaded && isSignedIn) {
      const fetchApodFromMyDb = async () => {
        try {
          const response = await fetch(`${API_URL}/photoOfTheDay`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch from DB');
          }
          
          const data = await response.json();
          setApodData(data); 

        } catch (err) {
          console.error("Error fetching APOD:", err);
          console.log("Using fallback APOD data");
          // Use fallback data instead of showing error
          setApodData(FALLBACK_APOD);
        } finally {
          setDataLoading(false);
        }
      };

      fetchApodFromMyDb();
    } else if (isLoaded) {
      // If Clerk is loaded but user is not signed in,
      // the _layout.jsx will handle the redirect.
      // We don't need to do anything here.
      setDataLoading(false); // Stop loading, as there's nothing to fetch
    }
  }, [isLoaded, isSignedIn]); // Re-run when these change

  const handleContinue = () => {
    router.replace("/(tabs)"); 
  };

  // --- This is the new, simpler loading state ---
  // The _layout.jsx handles the main Clerk loading
  if (dataLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // --- This redirect logic was REMOVED ---
  // The _layout.jsx is now responsible for this
  // if (!isLoaded) { ... }
  // if (!isSignedIn) { ... }

  const imageSource = !apodData 
    ? errorPlaceholder 
    : { uri: apodData.url };

  const title = !apodData
    ? "Could not load photo"
    : apodData.title;

  return (
    <Pressable style={styles.container} onPress={handleContinue}>
      <StatusBar hidden />
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
  image: { width, height: height * 0.75 },
  footer: { padding: 16, backgroundColor: COLORS.background, flex: 1, alignItems: "center", justifyContent: "flex-start" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6, textAlign: "center", color: COLORS.primary },
  prompt: { marginTop: 10, color: COLORS.primary, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
});
