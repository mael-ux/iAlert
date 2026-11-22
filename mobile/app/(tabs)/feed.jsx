import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
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
import * as Location from "expo-location";
import { CATEGORY_META, TIER_META, timeAgo } from "../../lib/incidentMeta";

const TABS = [
  { key: "near", label: "Cerca" },
  { key: "explore", label: "Explorar" },
  { key: "official", label: "Oficial" },
];

function IncidentCard({ incident, theme, onPress }) {
  const meta = CATEGORY_META[incident.category] || { icon: "alert-circle", color: theme.primary, label: incident.category };
  const tier = TIER_META[incident.trustTier] || TIER_META.unverified;
  const community = incident.origin === "community";
  const heading = community ? `${meta.label} reportado` : incident.title;
  const snippet = incident.latestReport?.description || (community ? "" : meta.label);
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.stripe, { backgroundColor: meta.color }]} />
      <View style={{ flex: 1, padding: 14 }}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: meta.color + "22" }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{heading}</Text>
            <Text style={[styles.cardMeta, { color: theme.textLight }]}>
              {timeAgo(incident.startedAt)}
              {incident.distanceKm != null ? ` · a ${Math.round(incident.distanceKm)} km` : ""}
              {incident.severity ? ` · ${incident.severity}` : ""}
            </Text>
          </View>
          <View style={[styles.tierPill, { backgroundColor: tier.color + "22" }]}>
            <Ionicons name={tier.icon} size={13} color={tier.color} />
            <Text style={{ color: tier.color, fontSize: 11, fontWeight: "700" }}>{tier.label}</Text>
          </View>
        </View>

        {!!snippet && (
          <Text style={{ color: theme.text, marginTop: 10, opacity: 0.85 }} numberOfLines={2}>{snippet}</Text>
        )}
        {incident.latestReport?.photo && (
          <Image source={{ uri: incident.latestReport.photo }} style={styles.thumb} />
        )}

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="shield-checkmark-outline" size={14} color={theme.textLight} />
            <Text style={[styles.footerText, { color: theme.textLight }]}>
              {incident.sources?.length || 0} fuente{incident.sources?.length === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="people-outline" size={14} color={theme.textLight} />
            <Text style={[styles.footerText, { color: theme.textLight }]}>
              {incident.reportCount || 0} reporte{incident.reportCount === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="thumbs-up-outline" size={14} color={theme.textLight} />
            <Text style={[styles.footerText, { color: theme.textLight }]}>{incident.upvotes || 0}</Text>
          </View>
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
  const [tab, setTab] = useState("near");
  const [pos, setPos] = useState(null);
  const [locDenied, setLocDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return setLocDenied(true);
        const last = await Location.getLastKnownPositionAsync();
        const cur = last || (await Location.getCurrentPositionAsync({}));
        setPos({ lat: cur.coords.latitude, lng: cur.coords.longitude });
      } catch (e) {
        setLocDenied(true);
      }
    })();
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      let qs = "status=active&limit=50";
      if (tab === "near" && pos) qs += `&lat=${pos.lat}&lng=${pos.lng}&radiusKm=500`;
      if (tab === "explore") qs += "&sort=trust";
      if (tab === "official") qs += "&origin=official";
      const res = await fetch(`${API_URL}/incidents?${qs}`);
      const data = await res.json();
      setIncidents(data.incidents || []);
    } catch (err) {
      console.warn("Error loading incident feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, pos]);

  useEffect(() => {
    setLoading(true);
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
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tabBtn, { backgroundColor: tab === t.key ? theme.primary : theme.card, borderColor: theme.border }]}
          >
            <Text style={{ color: tab === t.key ? "#fff" : theme.text, fontWeight: "600" }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === "near" && !pos && (
        <Text style={{ color: theme.textLight, textAlign: "center", marginHorizontal: 16 }}>
          {locDenied ? "Activa tu ubicación para ver incidentes cercanos." : "Obteniendo tu ubicación…"}
        </Text>
      )}
      {__DEV__ && (
        <Text style={{ color: theme.textLight, fontSize: 10, textAlign: "center" }}>
          API: {API_URL} · {incidents.length} incidentes
        </Text>
      )}
      <FlatList
        data={incidents}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="checkmark-circle-outline" size={48} color={theme.textLight} />
            <Text style={{ color: theme.textLight, marginTop: 8 }}>No hay incidentes activos</Text>
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
  listContent: { padding: 16, paddingTop: 12, paddingBottom: 100 },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, flexDirection: "row", overflow: "hidden" },
  stripe: { width: 5 },
  tierPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  thumb: { width: "100%", height: 140, borderRadius: 10, marginTop: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
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