// mobile/app/event-details.jsx
import React from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, Linking, Platform 
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext'; 
import SafeAreaWrapper from './components/safeAreaWrapper';
import CustomHeader from './components/customHeader';

export default function EventDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme(); // Use Theme Hook

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
    <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Replaced manual header with CustomHeader */}
      <CustomHeader title="Detalles del Evento" />

      <ScrollView style={styles.content}>
        {/* Alerta - Red background usually stays red even in dark mode for importance */}
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={32} color="#fff" />
          <Text style={styles.alertTitle}>¡Alerta Activa!</Text>
        </View>

        {/* Título del Evento */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>{title}</Text>
          {disasterTitle && (
            <Text style={[styles.disasterType, { color: theme.textLight }]}>{disasterTitle}</Text>
          )}
        </View>

        {/* Nivel de Riesgo */}
        {riskLevel && (
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Nivel de Riesgo</Text>
            <View style={[styles.riskContainer, { backgroundColor: theme.card }]}>
              <View
                style={[
                  styles.riskBar,
                  { width: `${parseFloat(riskLevel) * 10}%` }
                ]}
              />
              <Text style={[styles.riskText, { color: theme.text }]}>{riskLevel}/10</Text>
            </View>
          </View>
        )}

        {/* Recomendaciones */}
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recomendaciones</Text>
          </View>
          {/* Warning card usually stays yellow/orange, but we ensure text is readable */}
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={[styles.section, { borderBottomColor: 'transparent' }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Acciones</Text>
          
          {coordinates && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.primary }]} 
              onPress={openMap}
            >
              <Ionicons name="map-outline" size={20} color={theme.white} />
              <Text style={[styles.actionButtonText, { color: theme.white }]}>Ver en Mapa</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.secondaryButton, 
              { borderColor: theme.primary, backgroundColor: theme.card } // Adapted for dark mode
            ]}
            onPress={() => Linking.openURL('tel:911')}
          >
            <Ionicons name="call-outline" size={20} color={theme.primary} />
            <Text style={[styles.actionButtonText, { color: theme.primary }]}>
              Llamar a Emergencias
            </Text>
          </TouchableOpacity>
        </View>

        {/* Información Adicional */}
        <View style={styles.section}>
          <Text style={[styles.infoText, { color: theme.textLight }]}>
            ID del Evento: {eventId}
          </Text>
          <Text style={[styles.infoText, { color: theme.textLight }]}>
            Recibido: {new Date().toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  alertBanner: {
    backgroundColor: '#ff4444', // Always red for danger
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
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  disasterType: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  riskContainer: {
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
  },
  recommendationCard: {
    backgroundColor: '#fff3cd', // Light yellow background
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
  },
  recommendationText: {
    fontSize: 16,
    color: '#856404', // Dark brownish text ensures readability on yellow
    lineHeight: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
});