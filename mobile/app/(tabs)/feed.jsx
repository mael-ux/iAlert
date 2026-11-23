import React, { useState, useEffect, useCallback } from "react";
import {
  TextInput,
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
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useTheme } from "../ThemeContext";
import { API_URL } from "../../constants/api";
import * as Location from "expo-location";
import { CATEGORY_META, TIER_META, timeAgo } from "../../lib/incidentMeta";

const TABS = [
  { key: "near", label: "Cerca de mí", icon: "locate" },
  { key: "zones", label: "Mis zonas", icon: "bookmark" },
  { key: "all", label: "Todos", icon: "globe-outline" },
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

        <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {incident.sources?.length > 0 && (
            <View style={[styles.tag, { backgroundColor: "#2e9e5b22" }]}>
              <Text style={[styles.tagText, { color: "#2e9e5b" }]}>Fuente oficial</Text>
            </View>
          )}
          {incident.reportCount > 0 && (
            <View style={[styles.tag, { backgroundColor: "#4285f422" }]}>
              <Text style={[styles.tagText, { color: "#4285f4" }]}>Reporte ciudadano</Text>
            </View>
          )}
          {incident.origin === "community" && !incident.promoted && (
            <View style={[styles.tag, { backgroundColor: "#e0a10022" }]}>
              <Text style={[styles.tagText, { color: "#e0a100" }]}>En revisión · {Math.max(incident.trustScore || 0, 0)}/10</Text>
            </View>
          )}
          {incident.promoted && incident.origin === "community" && (
            <View style={[styles.tag, { backgroundColor: "#2e9e5b22" }]}>
              <Text style={[styles.tagText, { color: "#2e9e5b" }]}>En el globo</Text>
            </View>
          )}
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
  const { userId } = useAuth();
  const { user } = useUser();
  const uid = userId || user?.id;

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("all");
  const [pos, setPos] = useState(null);
  const [locDenied, setLocDenied] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState([]); // type-ahead suggestions
  const [place, setPlace] = useState(null); // chosen place {name, lat, lon}
  const [searching, setSearching] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Type-ahead: suggestions appear while typing, no separate "search view"
  useEffect(() => {
    const q = query.trim();
    if (place || q.length < 3) {
      setPlaces([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`${API_URL}/search-city?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setPlaces(Array.isArray(data) ? data : []);
      } catch (e) {
        setPlaces([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query, place]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return setLocDenied(true);
        const last = await Location.getLastKnownPositionAsync();
        const cur = last || (await Location.getCurrentPositionAsync({}));
        setPos({ lat: cur.coords.latitude, lng: cur.coords.longitude });
        setTab((t) => (t === "all" ? "near" : t)); // default to nearby once we know where the user is
      } catch (e) {
        setLocDenied(true);
      }
    })();
  }, []);

  const fetchList = async (qs) => {
    const res = await fetch(`${API_URL}/incidents?${qs}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.incidents || [];
  };

  const loadIncidents = useCallback(async () => {
    try {
      setLoadError(null);
      const base = "status=active&limit=50";
      let list = [];
      if (place) {
        list = await fetchList(`${base}&lat=${place.lat}&lng=${place.lon}&radiusKm=300`);
      } else if (tab === "near") {
        list = pos ? await fetchList(`${base}&lat=${pos.lat}&lng=${pos.lng}&radiusKm=500`) : [];
      } else if (tab === "zones") {
        if (uid) {
          const zr = await fetch(`${API_URL}/interestZone/${uid}`);
          const zones = zr.ok ? await zr.json() : [];
          const lists = await Promise.all(
            zones.map((z) => fetchList(`${base}&lat=${z.latitude}&lng=${z.longitude}&radiusKm=300`).catch(() => []))
          );
          const seen = new Map();
          lists.flat().forEach((i) => !seen.has(i.id) && seen.set(i.id, i));
          list = [...seen.values()];
        }
      } else {
        list = await fetchList(`${base}&sort=trust`);
      }
      setIncidents(list);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, pos, place, uid]);

  useEffect(() => {
    setLoading(true);
    loadIncidents();
  }, [loadIncidents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadIncidents();
  };

  // If the server never sends a trust tier, it is running the OLD backend code
  const oldBackend = incidents.length > 0 && incidents.every((i) => i.trustTier === undefined);
  const officialCount = incidents.filter((i) => i.origin === "official").length;

  const emptyText = place
    ? `Sin incidentes activos cerca de ${place.name}`
    : tab === "near"
    ? locDenied
      ? "Activa tu ubicación para ver incidentes cercanos."
      : pos
      ? "No hay incidentes cerca de ti. ¡Buena señal!"
      : "Obteniendo tu ubicación…"
    : tab === "zones"
    ? uid
      ? "No hay incidentes en tus zonas de interés (o aún no has guardado zonas)."
      : "Inicia sesión para ver incidentes en tus zonas de interés."
    : "No hay incidentes activos";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textLight} />
          <TextInput
            value={place ? place.name : query}
            onChangeText={(t) => {
              if (place) setPlace(null);
              setQuery(t);
            }}
            placeholder="Buscar incidentes en una ciudad o lugar…"
            placeholderTextColor={theme.textLight}
            autoCorrect={false}
            style={{ flex: 1, color: theme.text, paddingVertical: 11 }}
          />
          {searching && <ActivityIndicator size="small" color={theme.primary} />}
          {(query || place) && (
            <TouchableOpacity onPress={() => { setQuery(""); setPlaces([]); setPlace(null); }}>
              <Ionicons name="close-circle" size={18} color={theme.textLight} />
            </TouchableOpacity>
          )}
        </View>
        {places.length > 0 && (
          <View style={[styles.suggestions, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {places.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.placeRow, { borderColor: theme.border }]}
                onPress={() => {
                  setPlace({ name: `${p.name}${p.state ? ", " + p.state : ""}, ${p.country}`, lat: p.lat, lon: p.lon });
                  setPlaces([]);
                }}
              >
                <Ionicons name="location-outline" size={16} color={theme.primary} />
                <Text style={{ color: theme.text, flex: 1 }}>{p.name}{p.state ? `, ${p.state}` : ""}, {p.country}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {!place && (
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, { backgroundColor: tab === t.key ? theme.primary : theme.card, borderColor: theme.border }]}
            >
              <Ionicons name={t.icon} size={14} color={tab === t.key ? "#fff" : theme.text} />
              <Text style={{ color: tab === t.key ? "#fff" : theme.text, fontWeight: "600" }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {place && (
        <Text style={{ color: theme.textLight, marginHorizontal: 16, marginBottom: 4 }}>
          Mostrando incidentes a 300 km de {place.name}
        </Text>
      )}

      {oldBackend && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            El servidor ({API_URL}) tiene código antiguo: no envía confianza ni filtros. Despliega la rama feed o apunta EXPO_PUBLIC_API_URL a tu backend local.
          </Text>
        </View>
      )}
      {loadError && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>No se pudo cargar ({loadError}) desde {API_URL}</Text>
        </View>
      )}
      {__DEV__ && (
        <Text style={{ color: theme.textLight, fontSize: 10, textAlign: "center" }}>
          API: {API_URL} · {incidents.length} incidentes ({officialCount} oficiales)
        </Text>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.textLight} />
              <Text style={{ color: theme.textLight, marginTop: 8, textAlign: "center", paddingHorizontal: 24 }}>{emptyText}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <IncidentCard incident={item} theme={theme} onPress={() => router.push(`/incident/${item.id}`)} />
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => router.push("/report")}
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
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchWrap: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8, zIndex: 10 },
  suggestions: { borderWidth: 1, borderRadius: 14, marginTop: 6, paddingHorizontal: 12 },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  warn: { backgroundColor: "#c0392b22", borderColor: "#c0392b", borderWidth: 1, borderRadius: 10, marginHorizontal: 16, marginBottom: 8, padding: 10 },
  warnText: { color: "#e74c3c", fontSize: 12, fontWeight: "600" },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, flexDirection: "row", overflow: "hidden" },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: "700" },
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