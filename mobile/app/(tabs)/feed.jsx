import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../ThemeContext";
import { API_URL } from "../../constants/api";

const CATEGORY_META = {
  wildfires: { icon: "flame", color: "#ff4500" },
  floods: { icon: "water", color: "#1e90ff" },
  earthquakes: { icon: "pulse", color: "#8b4513" },
  severeStorms: { icon: "thunderstorm", color: "#4169e1" },
  volcanoes: { icon: "triangle", color: "#dc143c" },
  landslides: { icon: "trending-down", color: "#a0522d" },
  cyclone: { icon: "sync", color: "#00ced1" },
  manmade: { icon: "warning", color: "#ffa500" },
};

function IncidentCard({ incident, theme, onPress }) {
  const meta = CATEGORY_META[incident.category] || { icon: "alert-circle", color: theme.primary };
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: meta.color + "22" }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {incident.title}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.textLight }]}>
            {new Date(incident.startedAt).toLocaleString()}
          </Text>
        </View>
        {incident.severity && (
          <View style={[styles.severityPill, { borderColor: meta.color }]}>
            <Text style={[styles.severityText, { color: meta.color }]}>{incident.severity}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="link-outline" size={14} color={theme.textLight} />
          <Text style={[styles.footerText, { color: theme.textLight }]}>
            {incident.sources?.length || 0} source{incident.sources?.length === 1 ? "" : "s"}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="people-outline" size={14} color={theme.textLight} />
          <Text style={[styles.footerText, { color: theme.textLight }]}>
            {incident.reportCount || 0} report{incident.reportCount === 1 ? "" : "s"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/incidents?status=active`);
      const data = await res.json();
      setIncidents(data.incidents || []);
    } catch (err) {
      console.warn("Error loading incident feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadIncidents();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={incidents}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="checkmark-circle-outline" size={48} color={theme.textLight} />
            <Text style={{ color: theme.textLight, marginTop: 8 }}>No active incidents nearby</Text>
          </View>
        }
        renderItem={({ item }) => (
          <IncidentCard
            incident={item}
            theme={theme}
            onPress={() => router.push(`/incident/${item.id}`)}
          />
        )}
      />

      <TouchableOpacity
  style={[styles.fab, { backgroundColor: theme.primary }]}
  onPress={() => router.push("../report")}
  activeOpacity={0.85}
>
  <Ionicons name="add" size={28} color="#fff" />
</TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  listContent: { padding: 16, paddingTop: 60, paddingBottom: 100 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardMeta: { fontSize: 12, marginTop: 2 },
  severityPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  cardFooter: { flexDirection: "row", gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#ccc3" },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 12 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
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
  },
});