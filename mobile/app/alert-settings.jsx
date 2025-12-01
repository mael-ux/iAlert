// mobile/app/alert-settings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Switch, ScrollView, 
  TouchableOpacity, ActivityIndicator, Alert,
  Vibration, Platform, Linking
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import SafeAreaWrapper from './components/safeAreaWrapper';
import CustomHeader from './components/customHeader';
import { useTheme } from './ThemeContext';
import { API_URL } from '../constants/api';
import * as Notifications from 'expo-notifications';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  const { theme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sound, setSound] = useState(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  
  const soundRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [config, setConfig] = useState({
    selectedTypes: [],
    vibrateEnabled: true,
    soundEnabled: true,
    flashEnabled: false,
    soundLevel: 80,
    alarmMode: true,
    notifyCurrentLocation: true,
    notifyOnlySelectedZones: false
  });

  useEffect(() => {
    if (user) {
      loadConfig();
    }
    
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [user]);

  const loadConfig = async () => {
    try {
      const userId = user?.id || 'default-user'; 
      const response = await fetch(`${API_URL}/alerts/config/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const userId = user?.id || 'default-user'; 
      const response = await fetch(`${API_URL}/alerts/config/${userId}`, {
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

  const stopAlarm = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      setSound(null);
    } catch (err) {
      console.log('Error stopping sound', err);
    }
    Vibration.cancel();
    setFlashEnabled(false);
    setIsAlarmPlaying(false);
    console.log('🛑 Alarm stopped');
  };

  const playAlarmSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound: alarmSound } = await Audio.Sound.createAsync(
        require('../assets/sounds/alert.mp3'),
        { 
          shouldPlay: true,
          isLooping: true, 
          volume: config.soundLevel / 100,
        }
      );
      
      setSound(alarmSound);
      soundRef.current = alarmSound;
      setIsAlarmPlaying(true);
      console.log('🔊 Alarm sound playing');

      setTimeout(() => {
        if (soundRef.current) {
          stopAlarm();
          console.log('🔕 Auto-stopped after 30s');
        }
      }, 30000);

    } catch (error) {
      console.error('Error playing alarm:', error);
      if (config.vibrateEnabled) {
         Vibration.vibrate([0, 500, 200, 500], true);
         setIsAlarmPlaying(true);
      }
      Alert.alert('Error', 'No se pudo reproducir el sonido. Verifica que "alert.mp3" exista en assets/sounds.');
    }
  };

  const testAlert = async () => {
    try {
      console.log('🧪 Testing alert...');
      console.log('Config:', { 
        flash: config.flashEnabled, 
        sound: config.soundEnabled, 
        vibrate: config.vibrateEnabled,
        alarmMode: config.alarmMode 
      });

      // 1. Handle flash if enabled
      if (config.flashEnabled && Platform.OS !== 'web') {
        console.log('📸 Flash is enabled in config');
        console.log('Permission status:', permission);
        
        if (!permission?.granted) {
          console.log('❌ Permission not granted, requesting...');
          const result = await requestPermission();
          console.log('Permission result:', result);
          
          if (!result?.granted) {
            Alert.alert(
              'Permiso Necesario',
              'Necesitas activar el permiso de cámara para usar el flash.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Configuración', onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }}
              ]
            );
            return;
          }
        }
        
        console.log('✅ Permission granted, enabling flash...');
        setFlashEnabled(true);
        console.log('🔦 Flash state set to true');
      } else {
        console.log('Flash not enabled or platform is web');
      }

      // 2. Get location
      let locationText = 'tu ubicación';
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const address = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          locationText = address[0]?.city || address[0]?.region || 'tu área';
        }
      } catch (e) {
        console.log('Location error:', e);
      }

      // 3. Alarm Mode vs Single Notification
      if (config.alarmMode) {
        if (config.vibrateEnabled) {
          Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
        }

        if (config.soundEnabled) {
          await playAlarmSound();
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚨 ALERTA DE EMERGENCIA",
            body: `Incendio Forestal detectado cerca de ${locationText}.\n\n⚠️ Evacúa inmediatamente.`,
            sound: config.soundEnabled,
            priority: Notifications.AndroidNotificationPriority.MAX,
            color: '#FF0000',
          },
          trigger: null,
        });

        Alert.alert(
          '🚨 ALARMA ACTIVADA',
          `La alarma está sonando.\n\n• Vibración: ${config.vibrateEnabled ? 'Sí' : 'No'}\n• Sonido: ${config.soundEnabled ? 'Sí' : 'No'} (${config.soundLevel}%)\n• Flash: ${flashEnabled ? 'Sí ✅' : config.flashEnabled ? 'Activando...' : 'No'}`,
          [
            {
              text: 'DETENER ALARMA',
              onPress: stopAlarm,
              style: 'destructive'
            }
          ],
          { cancelable: false }
        );

      } else {
        if (config.vibrateEnabled) {
          Vibration.vibrate([0, 500, 200, 500]);
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🔥 Alerta de Incendio Forestal",
            body: `Se ha detectado un incendio forestal cerca de ${locationText}.`,
            sound: config.soundEnabled,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });

        Alert.alert('✅ Alerta Enviada', 'Notificación de prueba enviada.');
        
        if (flashEnabled) {
          setTimeout(() => {
            setFlashEnabled(false);
            console.log('🔦 Flash disabled (single mode)');
          }, 5000);
        }
      }

    } catch (error) {
      console.error('Error testing alert:', error);
      Alert.alert('Error', 'No se pudo enviar la alerta de prueba.\n\n' + error.message);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <CustomHeader title="Configuración de Alertas" backTo="/(tabs)/user" />

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tipos de Desastre</Text>
          {Object.entries(DISASTER_CATEGORIES).map(([id, info]) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.disasterCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                config.selectedTypes.includes(id) && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => toggleDisasterType(id)}
            >
              <Ionicons
                name={info.icon}
                size={24}
                color={config.selectedTypes.includes(id) ? theme.white : theme.primary}
              />
              <Text
                style={[
                  styles.disasterName,
                  { color: theme.text },
                  config.selectedTypes.includes(id) && { color: theme.white }
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notificaciones</Text>
          
          <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="alarm" size={20} color={theme.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Modo Alarma</Text>
                <Text style={[styles.settingHint, { color: theme.textLight }]}>
                  Sonido continuo hasta detener
                </Text>
              </View>
            </View>
            <Switch
              value={config.alarmMode}
              onValueChange={(value) => setConfig({...config, alarmMode: value})}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="phone-portrait" size={20} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Vibración</Text>
            </View>
            <Switch
              value={config.vibrateEnabled}
              onValueChange={(value) => setConfig({...config, vibrateEnabled: value})}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={20} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Sonido</Text>
            </View>
            <Switch
              value={config.soundEnabled}
              onValueChange={(value) => setConfig({...config, soundEnabled: value})}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          {config.soundEnabled && (
            <View style={[styles.sliderContainer, { backgroundColor: theme.card }]}>
              <Text style={[styles.sliderLabel, { color: theme.text }]}>Volumen: {config.soundLevel}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={10}
                value={config.soundLevel}
                onValueChange={(value) => setConfig({...config, soundLevel: value})}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.border}
              />
            </View>
          )}

          <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="flashlight" size={20} color={theme.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Flash</Text>
                <Text style={[styles.settingHint, { color: theme.textLight }]}>
                  {flashEnabled ? '🔦 Activo' : 'Requiere permiso de cámara'}
                </Text>
              </View>
            </View>
            <Switch
              value={config.flashEnabled}
              onValueChange={(value) => setConfig({...config, flashEnabled: value})}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ubicaciones</Text>
          <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="location" size={20} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Ubicación actual</Text>
            </View>
            <Switch
              value={config.notifyCurrentLocation}
              onValueChange={(value) => setConfig({...config, notifyCurrentLocation: value})}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
          <View style={[styles.settingRow, { backgroundColor: theme.card }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="map" size={20} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Solo zonas guardadas</Text>
            </View>
            <Switch
              value={config.notifyOnlySelectedZones}
              onValueChange={(value) => setConfig({...config, notifyOnlySelectedZones: value})}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }, isSaving && styles.saveButtonDisabled]}
          onPress={saveConfig}
          disabled={isSaving}
        >
          <Text style={[styles.saveButtonText, { color: theme.white }]}>
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
          onPress={testAlert}
          disabled={isAlarmPlaying}
        >
          <Ionicons name="notifications" size={24} color={theme.primary} />
          <Text style={[styles.testButtonText, { color: theme.primary }]}>
            {isAlarmPlaying ? 'Alarma Activa...' : 'Probar Alerta'}
          </Text>
        </TouchableOpacity>

        {isAlarmPlaying && (
          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: '#ff4444' }]}
            onPress={stopAlarm}
          >
            <Ionicons name="stop-circle" size={24} color="#ffffff" />
            <Text style={[styles.stopButtonText, { color: '#ffffff' }]}>
              DETENER ALARMA
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Flash Camera - Positioned off-screen */}
      {flashEnabled && permission?.granted && (
        <View style={styles.flashCamera}>
          <CameraView 
            style={styles.flashCameraView}
            torch="on"
            facing="back"
          />
        </View>
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  disasterCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  disasterName: { flex: 1, marginLeft: 12, fontSize: 16 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  severityText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingLabel: { marginLeft: 12, fontSize: 16 },
  settingHint: { marginLeft: 12, fontSize: 12, marginTop: 2 },
  sliderContainer: { padding: 16, borderRadius: 12, marginBottom: 8 },
  sliderLabel: { fontSize: 14, marginBottom: 8 },
  slider: { width: '100%', height: 40 },
  saveButton: { padding: 16, borderRadius: 12, margin: 16, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '600' },
  testButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, margin: 16, marginTop: 8, borderWidth: 2, gap: 12 },
  testButtonText: { fontSize: 16, fontWeight: '600' },
  stopButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, margin: 16, marginTop: 0, gap: 12 },
  stopButtonText: { fontSize: 16, fontWeight: '700' },
  flashCamera: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 200,
    height: 200,
  },
  flashCameraView: {
    width: 200,
    height: 200,
  },
});