import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Linking, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useTheme } from "../ThemeContext";
import { API_URL } from "../../constants/api";
import { CATEGORY_META, TIER_META, timeAgo } from "../../lib/incidentMeta";

const STALE_HOURS = 6; // ask "still there?" when nobody confirmed for this long

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { userId } = useAuth();
  const { user } = useUser();
  const uid = userId || user?.id;

  const [incident, setIncident] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/incidents/${id}${uid ? `?userId=${encodeURIComponent(uid)}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const inc = await res.json();
      setIncident(inc);
      fetch(`${API_URL}/incidents/recommendations?category=${inc.category}&language=en`)
        .then((r) => r.json())
        .then((d) => setRecs(d.recommendations || []))
        .catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, uid]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (path, value) => {
    if (!uid) {
      Alert.alert("Inicia sesión", "Necesitas una cuenta para votar o confirmar.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/incidents/${id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await load();
      setToast(path === "vote" ? "Voto registrado" : path === "still-there" ? "Gracias por confirmar" : "Aviso enviado");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      Alert.alert("No se pudo enviar", `${e.message}\n(${API_URL})`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  if (error || !incident) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.textLight} />
        <Text style={{ color: theme.textLight, marginTop: 8 }}>{error || "Incidente no encontrado"}</Text>
      </View>
    );
  }

  const meta = CATEGORY_META[incident.category] || { icon: "alert-circle", color: theme.primary, label: incident.category };
  const tier = TIER_META[incident.trustTier] || TIER_META.unverified;
  const stale = Date.now() - new Date(incident.lastConfirmedAt || incident.startedAt).getTime() > STALE_HOURS * 3600 * 1000;
  const card = { backgroundColor: theme.card, borderColor: theme.border };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.row}>
        <Ionicons name={meta.icon} size={26} color={meta.color} />
        <Text style={[styles.title, { color: theme.text, flex: 1 }]}>{incident.title}</Text>
      </View>
      <Text style={[styles.meta, { color: theme.textLight }]}>
        {meta.label} · {incident.severity} · {timeAgo(incident.startedAt)}
      </Text>

      <View style={[styles.tierBox, { borderColor: tier.color }]}>
        <Ionicons name={tier.icon} size={18} color={tier.color} />
        <Text style={{ color: tier.color, fontWeight: "700" }}>{tier.label}</Text>
        <Text style={{ color: theme.textLight, marginLeft: "auto" }}>
          {incident.sources.length} fuentes · {incident.reports.length} reportes
        </Text>
      </View>

      {stale && incident.status === "active" && (
        <View style={[styles.card, card, { borderColor: "#e0a100" }]}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>¿Sigue ocurriendo?</Text>
          <View style={[styles.row, { marginTop: 10 }]}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#2e9e5b" }]} onPress={() => send("still-there", 1)}>
              <Text style={styles.btnText}>Sí, sigue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#c0392b" }]} onPress={() => send("still-there", -1)}>
              <Text style={styles.btnText}>Ya terminó</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[styles.row, { marginTop: 14 }]}>
        <TouchableOpacity style={[styles.voteBtn, card, incident.myVotes?.vote === 1 && styles.voteOn]} onPress={() => send("vote", 1)}>
          <Ionicons name={incident.myVotes?.vote === 1 ? "thumbs-up" : "thumbs-up-outline"} size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>{incident.upvotes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.voteBtn, card, incident.myVotes?.vote === -1 && styles.voteOn]} onPress={() => send("vote", -1)}>
          <Ionicons name={incident.myVotes?.vote === -1 ? "thumbs-down" : "thumbs-down-outline"} size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>{incident.downvotes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.voteBtn, card, incident.myVotes?.still_there === 1 && styles.voteOn]} onPress={() => send("still-there", 1)}>
          <Ionicons name={incident.myVotes?.still_there === 1 ? "checkmark-circle" : "checkmark-circle-outline"} size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Confirmar</Text>
        </TouchableOpacity>
      </View>

      {toast && <Text style={{ color: "#2e9e5b", fontWeight: "700", marginTop: 10 }}>{toast}</Text>}

      {recs.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Qué hacer</Text>
          {recs.map((r) => (
            <View key={r.id} style={[styles.card, card]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{r.title}</Text>
              <Text style={{ color: theme.text, marginTop: 4 }}>{r.body}</Text>
              <Text style={{ color: theme.textLight, fontSize: 12, marginTop: 6 }}>Fuente: {r.sourceOrg}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Fuentes oficiales ({incident.sources.length})</Text>
      {incident.sources.length === 0 ? (
        <Text style={{ color: theme.textLight }}>Aún sin fuentes oficiales.</Text>
      ) : (
        incident.sources.map((s) => (
          <TouchableOpacity key={s.id} style={[styles.card, card]} onPress={() => s.url && Linking.openURL(s.url)}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{s.sourceName}</Text>
            {s.url && <Text style={{ color: theme.primary, fontSize: 12 }}>{s.url}</Text>}
          </TouchableOpacity>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Reportes de la comunidad ({incident.reports.length})</Text>
      {incident.reports.length === 0 ? (
        <Text style={{ color: theme.textLight }}>Aún sin reportes.</Text>
      ) : (
        incident.reports.map((r) => (
          <View key={r.id} style={[styles.card, card]}>
            <Text style={{ color: theme.text }}>{r.description || "(sin descripción)"}</Text>
            {(r.media || []).filter((m) => /^https?:/.test(m.url)).map((m, i) => (
              <View key={i} style={{ marginTop: 8 }}>
                <Image source={{ uri: m.url }} style={{ width: "100%", height: 180, borderRadius: 10 }} />
                <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 2 }}>
                  {m.source === "camera" ? "Tomada en la app" : "Subida de galería"}
                </Text>
              </View>
            ))}
            <Text style={{ color: theme.textLight, fontSize: 12, marginTop: 4 }}>{timeAgo(r.createdAt)}</Text>
          </View>
        ))
      )}

      {incident.reports.length > 0 && incident.sources.length > 0 && (
        <TouchableOpacity onPress={() => send("wrong-merge", 1)} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.textLight, textDecorationLine: "underline" }}>
            ¿Estos reportes no pertenecen aquí? Avisar ({incident.mergeFlags || 0})
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 22, fontWeight: "bold" },
  meta: { fontSize: 13, marginTop: 4, marginBottom: 14 },
  tierBox: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 12, padding: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  cardTitle: { fontWeight: "600" },
  btn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  voteOn: { borderColor: "#2e9e5b", borderWidth: 2 },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
});
