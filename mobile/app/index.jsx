import { useRouter } from "expo-router";
import { Pressable, View, Text, ActivityIndicator, StyleSheet, Dimensions, StatusBar, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { useAuth } from "@clerk/clerk-expo"; 
import { COLORS } from "../constants/colors";
import { API_URL } from "../constants/api";

const { width, height } = Dimensions.get("window");
const errorPlaceholder = require('../assets/images/placeholder.png'); 

// Fallback if DB is empty or fails
const FALLBACK_APOD = {
  title: "Horsehead Nebula",
  image: "https://apod.nasa.gov/apod/image/2301/Horsehead_Hubble_1225.jpg",
  description: "The Horsehead Nebula is one of the most identifiable nebulae in the sky. This iconic shape is sculpted from dense clouds of molecular gas and dust.",
  credits: "NASA, ESA, Hubble Heritage Team"
};

export default function PhotoOfTheDay() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth(); 
  const [dataLoading, setDataLoading] = useState(true);
  const [apodData, setApodData] = useState(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchApod();
    } else if (isLoaded) {
      setDataLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const fetchApod = async () => {
    try {
      const response = await fetch(`${API_URL}/photoOfTheDay`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setApodData(data); 
    } catch (err) {
      console.log("Using fallback data");
      setApodData(FALLBACK_APOD);
    } finally {
      setDataLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace("/(tabs)"); 
  };

  if (dataLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Handle different key names (DB vs API)
  const imageUri = apodData?.image || apodData?.url;
  const imageSource = !imageUri ? errorPlaceholder : { uri: imageUri };
  const title = apodData?.title || "Cosmic View";
  // Logic to find credits or default to NASA
  const credits = apodData?.credits || apodData?.copyright || "NASA";
  // Logic to find description
  const description = apodData?.description || apodData?.explanation || "";

  return (
    <Pressable style={styles.container} onPress={handleContinue}>
      <StatusBar hidden />
      
      {/* The Image Background */}
      <Image 
        source={imageSource} 
        style={styles.image} 
        contentFit="cover" 
        transition={500}
      />
      
      {/* The Info Footer */}
      <View style={styles.footer}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          
          {/* CREDITS DISPLAY */}
          <Text style={styles.credits}>© {credits}</Text>
          
          {/* DESCRIPTION DISPLAY (Limited to 4 lines) */}
          <Text style={styles.description} numberOfLines={4}>
            {description}
          </Text>
          
          <Text style={styles.prompt}>Tap anywhere to continue</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },

  // 1. INCREASED HEIGHT (Changed 0.65 to 0.75)
  // Now the image takes up 75% of the screen height
  image: { width, height: height * 0.75 }, 

  footer: { 
    flex: 1, 
    backgroundColor: COLORS.background,
    // 2. ALIGN TO TOP (Changed "center" to "flex-start")
    // This pushes the text up against the bottom of the image
    justifyContent: "flex-start", 
    paddingHorizontal: 20,
    // Added a little padding at the top so text isn't glued to the image edge
    paddingTop: 25,
    paddingBottom: 10,
    // Removed the border as it might look weird now that they are touching
    // borderTopWidth: 1,
    // borderTopColor: '#333'
  },
  textContainer: { alignItems: "center" },
  // ... rest of styles remain the same
  title: { 
    fontSize: 22, 
    fontWeight: "700", 
    textAlign: "center", 
    color: COLORS.primary,
    marginBottom: 4 
  },
  credits: {
    fontSize: 12,
    color: '#888', 
    marginBottom: 12,
    fontStyle: 'italic'
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 20,
  },
  prompt: { 
    color: COLORS.primary, 
    fontWeight: "600",
    opacity: 0.8,
    marginTop: 5
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
});