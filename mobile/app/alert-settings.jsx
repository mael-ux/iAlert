// mobile/app/alert-settings.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Switch, ScrollView, 
  TouchableOpacity, ActivityIndicator, Alert 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { API_URL } from '../constants/api';
import Slider from '@react-native-community/slider'; // Necesitarás instalar esto

const DISASTER_CATEGORIES = {
  wildfires: { name: 'Incendios Forestales', icon: 'flame', severity: 'high' },
  volcanoes: { name: 'Volcanes', icon: 'warning', severity: 'high' },
  severeStorms: { name: 'Tormentas Severas', icon: 'thunderstorm', severity: 'medium' },
  floods: { name: 'Inundaciones', icon: 'water', severity: 'medium' },
  drought: { name: 'Sequías', icon: 'sunny', severity: 'low' },
  earthquakes: { name: 'Terremotos', icon: 'pulse', severity: 'high' },
  landslides: { name: 'Deslizamientos', icon: 'triangle', severity: 'medium' },
};

export default function AlertSettingsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [config, setConfig] = useState({
    selectedTypes: [],
    vibrateEnabled: true,
    soundEnabled: true,
    flashEnabled: false,
    soundLevel: 80,
    notifyCurrentLocation: true,
    notifyOnlySelectedZones: false
  });

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/alerts/config/${user.id}`);
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/alerts/config/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        Alert.alert('Éxito', 'Configuración guardada correctamente');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDisasterType = (type) => {
    setConfig(prev => ({
      ...prev,
      selectedTypes: prev.selectedTypes.includes(type)
        ? prev.selectedTypes.filter(t => t !== type)
        : [...prev.selectedTypes, type]
    }));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración de Alertas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Tipos de Desastre */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipos de Desastre</Text>
          {Object.entries(DISASTER_CATEGORIES).map(([id, info]) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.disasterCard,
                config.selectedTypes.includes(id) && styles.disasterCardActive
              ]}
              onPress={() => toggleDisasterType(id)}
            >
              <Ionicons
                name={info.icon}
                size={24}
                color={config.selectedTypes.includes(id) ? COLORS.white : COLORS.primary}
              />
              <Text
                style={[
                  styles.disasterName,
                  config.selectedTypes.includes(id) && styles.disasterNameActive
                ]}
              >
                {info.name}
              </Text>
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: info.severity === 'high' ? '#ff4444' : info.severity === 'medium' ? '#ffaa00' : '#44ff44' }
                ]}
              >
                <Text style={styles.severityText}>
                  {info.severity === 'high' ? 'Alta' : info.severity === 'medium' ? 'Media' : 'Baja'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Configuración de Hardware */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="phone-portrait" size={20} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Vibración</Text>
            </View>
            <Switch
              value={config.vibrateEnabled}
              onValueChange={(value) => setConfig({...config, vibrateEnabled: value})}
              trackColor={{ false: '#767577', true: COLORS.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={20} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Sonido</Text>
            </View>
            <Switch
              value={config.soundEnabled}
              onValueChange={(value) => setConfig({...config, soundEnabled: value})}
              trackColor={{ false: '#767577', true: COLORS.primary }}
            />
          </View>

          {config.soundEnabled && (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Volumen: {config.soundLevel}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={10}
                value={config.soundLevel}
                onValueChange={(value) => setConfig({...config, soundLevel: value})}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor="#ddd"
              />
            </View>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="flashlight" size={20} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Flash</Text>
            </View>
            <Switch
              value={config.flashEnabled}
              onValueChange={(value) => setConfig({...config, flashEnabled: value})}
              trackColor={{ false: '#767577', true: COLORS.primary }}
            />
          </View>
        </View>

        {/* Ubicaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicaciones</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Ubicación actual</Text>
            </View>
            <Switch
              value={config.notifyCurrentLocation}
              onValueChange={(value) => setConfig({...config, notifyCurrentLocation: value})}
              trackColor={{ false: '#767577', true: COLORS.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="map" size={20} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Solo zonas guardadas</Text>
            </View>
            <Switch
              value={config.notifyOnlySelectedZones}
              onValueChange={(value) => setConfig({...config, notifyOnlySelectedZones: value})}
              trackColor={{ false: '#767577', true: COLORS.primary }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={saveConfig}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  disasterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disasterCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disasterName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  disasterNameActive: {
    color: COLORS.white,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  sliderContainer: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});