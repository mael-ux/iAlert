// mobile/app/event-details.jsx
import React from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, Linking 
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function EventDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const {
    eventId,
    title = 'Evento de Desastre',
    recommendation = 'Manténgase informado y siga las instrucciones de las autoridades.',
    disasterTitle,
    riskLevel,
    coordinates,
  } = params;

  const openMap = () => {
    if (coordinates) {
      const [lng, lat] = JSON.parse(coordinates);
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${title})`,
      });
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Evento</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Alerta */}
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={32} color="#fff" />
          <Text style={styles.alertTitle}>¡Alerta Activa!</Text>
        </View>

        {/* Título del Evento */}
        <View style={styles.section}>
          <Text style={styles.eventTitle}>{title}</Text>
          {disasterTitle && (
            <Text style={styles.disasterType}>{disasterTitle}</Text>
          )}
        </View>

        {/* Nivel de Riesgo */}
        {riskLevel && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nivel de Riesgo</Text>
            <View style={styles.riskContainer}>
              <View
                style={[
                  styles.riskBar,
                  { width: `${parseFloat(riskLevel) * 10}%` }
                ]}
              />
              <Text style={styles.riskText}>{riskLevel}/10</Text>
            </View>
          </View>
        )}

        {/* Recomendaciones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Recomendaciones</Text>
          </View>
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          
          {coordinates && (
            <TouchableOpacity style={styles.actionButton} onPress={openMap}>
              <Ionicons name="map-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Ver en Mapa</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => Linking.openURL('tel:911')}
          >
            <Ionicons name="call-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Llamar a Emergencias
            </Text>
          </TouchableOpacity>
        </View>

        {/* Información Adicional */}
        <View style={styles.section}>
          <Text style={styles.infoText}>
            ID del Evento: {eventId}
          </Text>
          <Text style={styles.infoText}>
            Recibido: {new Date().toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  alertBanner: {
    backgroundColor: '#ff4444',
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  disasterType: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  riskContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  riskBar: {
    height: 8,
    backgroundColor: '#ff4444',
    borderRadius: 4,
    marginBottom: 8,
  },
  riskText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  recommendationCard: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
  },
  recommendationText: {
    fontSize: 16,
    color: '#856404',
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
});