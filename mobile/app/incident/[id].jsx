import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { API_URL } from "../../constants/api";

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/incidents/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setIncident)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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
        <Text style={{ color: theme.textLight, marginTop: 8 }}>
          {error || "Incident not found"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>{incident.title}</Text>
      <Text style={[styles.meta, { color: theme.textLight }]}>
        {incident.category} · {incident.severity} · {new Date(incident.startedAt).toLocaleString()}
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Sources ({incident.sources.length})</Text>
      {incident.sources.length === 0 ? (
        <Text style={{ color: theme.textLight }}>No linked sources yet.</Text>
      ) : (
        incident.sources.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => s.url && Linking.openURL(s.url)}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>{s.sourceName}</Text>
            {s.url && <Text style={{ color: theme.primary, fontSize: 12 }}>{s.url}</Text>}
          </TouchableOpacity>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Reports ({incident.reports.length})</Text>
      {incident.reports.length === 0 ? (
        <Text style={{ color: theme.textLight }}>No community reports yet.</Text>
      ) : (
        incident.reports.map((r) => (
          <View key={r.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ color: theme.text }}>{r.description || "(no description)"}</Text>
            <Text style={{ color: theme.textLight, fontSize: 12, marginTop: 4 }}>
              {new Date(r.createdAt).toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "bold" },
  meta: { fontSize: 13, marginTop: 4, marginBottom: 20, textTransform: "capitalize" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  cardTitle: { fontWeight: "600" },
});