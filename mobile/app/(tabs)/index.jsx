// mobile/app/(tabs)/globe.jsx
import React from "react";
import { View, StyleSheet } from "react-native";
import GlobeMap from "../components/globeMap";

export default function GlobeScreen() {
  return (
    <View style={styles.container}>
      <GlobeMap style={styles.globe} /> 
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
});