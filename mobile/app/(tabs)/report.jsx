import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useTheme } from "../ThemeContext";
import { API_URL } from "../../constants/api";

const CATEGORIES = [
  { id: "wildfires", name: "Wildfire", icon: "flame", color: "#ff4500" },
  { id: "floods", name: "Flood", icon: "water", color: "#1e90ff" },
  { id: "earthquakes", name: "Earthquake", icon: "pulse", color: "#8b4513" },
  { id: "severeStorms", name: "Severe Storm", icon: "thunderstorm", color: "#4169e1" },
  { id: "volcanoes", name: "Volcano", icon: "triangle", color: "#dc143c" },
  { id: "landslides", name: "Landslide", icon: "trending-down", color: "#a0522d" },
  { id: "cyclone", name: "Cyclone / Hurricane", icon: "sync", color: "#00ced1" },
  { id: "manmade", name: "Other / Hazard", icon: "warning", color: "#ffa500" },
];

export default function ReportDisasterScreen() {
  const { theme } = useTheme();
  const { userId } = useAuth();
  const { user } = useUser();

  const [selectedCategory, setSelectedCategory] = useState("wildfires");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Automatically request GPS location on mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Permission to access location was denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (loc && loc.coords) {
        setCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setManualLat(loc.coords.latitude.toFixed(6));
        setManualLng(loc.coords.longitude.toFixed(6));
      }
    } catch (err) {
      console.warn("Error getting location:", err);
      setLocationError("Could not detect GPS location automatically");
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Permission to access photos is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (err) {
      console.warn("Error picking image:", err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Permission to access the camera is required.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (err) {
      console.warn("Error taking photo:", err);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const lat = coords ? coords.latitude : parseFloat(manualLat);
    const lng = coords ? coords.longitude : parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert("Invalid Location", "Please provide valid coordinates or tap 'Detect GPS'.");
      return;
    }

    try {
      setSubmitting(true);
      setSuccessMessage(null);

      const endpoint = `${API_URL}/reports`;
      const payload = {
        userId: userId || user?.id || "anonymous",
        category: selectedCategory,
        latitude: lat,
        longitude: lng,
        description: description.trim(),
        photos: photos,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const resData = await response.json();
      const isNew = resData.isNewIncident;
      const msg = isNew
        ? "New disaster incident registered and broadcasted to emergency feed."
        : "Report successfully linked to an existing active incident in your area.";

      setSuccessMessage(msg);
      setDescription("");
      setPhotos([]);

      if (Platform.OS !== "web") {
        Alert.alert("Report Submitted", msg);
      }
    } catch (err) {
      console.error("Submit error:", err);
      Alert.alert("Submission Failed", err.message || "Failed to submit report. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Ionicons name="megaphone" size={32} color={theme.primary} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Report a Disaster</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textLight }]}>
          Share verified field observations with your community and emergency services.
        </Text>
      </View>

      {successMessage && (
        <View style={[styles.successBanner, { borderColor: theme.primary }]}>
          <Ionicons name="checkmark-circle" size={24} color="#2e7d32" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      {/* Category selector */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Hazard Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected ? cat.color + "25" : theme.card,
                  borderColor: isSelected ? cat.color : theme.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon}
                size={18}
                color={isSelected ? cat.color : theme.textLight}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? cat.color : theme.text, fontWeight: isSelected ? "700" : "500" },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Location capture */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Incident Location</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.locationHeader}>
          <Ionicons name="location" size={20} color={theme.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {coords
              ? `${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°`
              : "Location not pinned yet"}
          </Text>
          <TouchableOpacity
            style={[styles.detectBtn, { backgroundColor: theme.primary }]}
            onPress={fetchCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.detectBtnText}>Detect GPS</Text>
            )}
          </TouchableOpacity>
        </View>

        {locationError && (
          <Text style={styles.errorHint}>{locationError}</Text>
        )}

        <View style={styles.coordsInputRow}>
          <TextInput
            style={[styles.coordInput, { color: theme.text, borderColor: theme.border }]}
            placeholder="Latitude"
            placeholderTextColor={theme.textLight}
            keyboardType="numeric"
            value={manualLat}
            onChangeText={(t) => {
              setManualLat(t);
              setCoords(null);
            }}
          />
          <TextInput
            style={[styles.coordInput, { color: theme.text, borderColor: theme.border }]}
            placeholder="Longitude"
            placeholderTextColor={theme.textLight}
            keyboardType="numeric"
            value={manualLng}
            onChangeText={(t) => {
              setManualLng(t);
              setCoords(null);
            }}
          />
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Observations & Details</Text>
      <TextInput
        style={[
          styles.textArea,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholder="Describe what you see: intensity, landmarks, damages, evacuation needs..."
        placeholderTextColor={theme.textLight}
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      {/* Photo attachments */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Field Photos</Text>
      <View style={styles.photoActions}>
        <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handleTakePhoto}>
          <Ionicons name="camera" size={20} color={theme.primary} />
          <Text style={[styles.photoBtnText, { color: theme.text }]}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handlePickImage}>
          <Ionicons name="images" size={20} color={theme.primary} />
          <Text style={[styles.photoBtnText, { color: theme.text }]}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 && (
        <ScrollView horizontal style={styles.photoPreviewRow}>
          {photos.map((uri, idx) => (
            <View key={idx} style={styles.previewContainer}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.deletePhotoBtn}
                onPress={() => removePhoto(idx)}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: theme.primary, opacity: submitting ? 0.7 : 1 },
        ]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Emergency Report</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#e8f5e9",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  successText: {
    color: "#2e7d32",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginLeft: 8,
  },
  detectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detectBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  errorHint: {
    color: "#d32f2f",
    fontSize: 12,
  },
  coordsInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  coordInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  photoActions: {
    flexDirection: "row",
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  photoPreviewRow: {
    marginTop: 12,
  },
  previewContainer: {
    position: "relative",
    marginRight: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deletePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#d32f2f",
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
