import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

// 1. FIX: Capitalized component name and corrected relative path
import GlobeMap from "../components/globeMap";

export default function GlobeScreen() {
  return (
    // 2. FIX: Used your container style to center the map
    <View style={styles.container}>
      {/* You can add a title here if you want */}
      {/* <Text style={styles.title}>Globe</Text> */}

      {/* 3. FIX: Container for the map */}
      <View style={{ height: 400, width: "100%", marginTop: 20 }}>
        <GlobeMap style={{ flex: 1 }} /> 
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    backgroundColor: '#000', 
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: '#fff', 
  },
  subtitle: {
    fontSize: 16,
    color: '#999', 
  },
});