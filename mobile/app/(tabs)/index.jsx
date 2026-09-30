// mobile/app/(tabs)/index.jsx
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import GlobeMap from "../components/globeMap";
import { useTheme } from "../ThemeContext";

export default function GlobeScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <GlobeMap style={styles.globe} />

      <TouchableOpacity
        style={[styles.chatFab, { backgroundColor: theme.primary }]}
        onPress={() => router.push("/(tabs)/chatbot")}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-outline" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  globe: {
    flex: 1,
  },
  chatFab: {
  position: "absolute",
  top: 60,
  left: 20,
  width: 56,
  height: 56,
  borderRadius: 28,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 5,
  elevation: 5,
  zIndex: 10,
},
});