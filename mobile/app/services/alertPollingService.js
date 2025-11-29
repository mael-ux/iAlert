// mobile/app/services/alertPollingService.js
import { API_URL } from '../../constants/api';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class AlertPollingService {
  constructor() {
    this.pollingInterval = null;
    this.lastCheckTime = new Date().toISOString();
    this.isPolling = false;
    this.userId = null;
    this.POLLING_INTERVAL = 60000; // 1 minuto (ajustar según necesidades)
  }

  // Inicializar el servicio
  async initialize(userId) {
    this.userId = userId;
    
    // Solicitar permisos de notificaciones
    await this.requestNotificationPermissions();
    
    // Solicitar permisos de ubicación
    await this.requestLocationPermissions();
  }

  // Solicitar permisos de notificaciones
  async requestNotificationPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }
      
      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'Disaster Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
          sound: 'default',
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Solicitar permisos de ubicación
  async requestLocationPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permissions not granted');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Obtener ubicación actual
  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  // Iniciar polling
  async startPolling() {
    if (this.isPolling) {
      console.log('Polling already active');
      return;
    }

    if (!this.userId) {
      console.error('User ID not set. Call initialize() first.');
      return;
    }

    console.log('Starting alert polling service...');
    this.isPolling = true;

    // Primera verificación inmediata
    await this.checkForNewEvents();

    // Configurar intervalo de polling
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewEvents();
    }, this.POLLING_INTERVAL);
  }

  // Detener polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('Alert polling service stopped');
  }

  // Verificar nuevos eventos
  async checkForNewEvents() {
    try {
      // Obtener ubicación actual
      const location = await this.getCurrentLocation();
      
      if (!location) {
        console.warn('Could not get location for event check');
        return;
      }

      // Llamar al endpoint de verificación
      const url = `${API_URL}/alerts/check-new/${this.userId}?` + 
        `lastCheckTime=${encodeURIComponent(this.lastCheckTime)}` +
        `&latitude=${location.latitude}` +
        `&longitude=${location.longitude}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Actualizar timestamp de última verificación
      this.lastCheckTime = new Date().toISOString();

      // Si hay nuevos eventos, mostrar notificaciones
      if (data.newEvents && data.newEvents.length > 0) {
        console.log(`Found ${data.count} new event(s)`);
        await this.showNotificationsForEvents(data.newEvents);
      }

    } catch (error) {
      console.error('Error checking for new events:', error);
    }
  }

  // Mostrar notificaciones para eventos
  async showNotificationsForEvents(events) {
    for (const event of events) {
      await this.showNotification(event);
    }
  }

  // Mostrar una notificación individual
  async showNotification(event) {
    try {
      const category = event.categories?.[0];
      const categoryName = category?.title || 'Desastre Natural';
      
      // Obtener configuración de alertas del usuario
      const configResponse = await fetch(`${API_URL}/alerts/config/${this.userId}`);
      const config = await configResponse.json();

      // Preparar contenido de la notificación
      const notification = {
        title: `🚨 ${categoryName}`,
        body: event.title || 'Nuevo evento detectado en tu área',
        data: {
          eventId: event.id,
          category: category?.id,
          title: event.title,
          coordinates: event.geometry?.[0]?.coordinates,
          recommendation: event.recommendation,
          disasterTitle: event.disasterTitle,
          riskLevel: event.riskLevel,
        },
        sound: config.soundEnabled ? 'default' : null,
        priority: Notifications.AndroidNotificationPriority.MAX,
        badge: 1,
      };

      // Configurar canal específico para Android
      if (Platform.OS === 'android') {
        notification.channelId = 'alerts';
      }

      // Programar notificación
      await Notifications.scheduleNotificationAsync({
        content: notification,
        trigger: null, // Mostrar inmediatamente
      });

      // Disparar vibración si está habilitada
      if (config.vibrateEnabled) {
        const { Vibration } = await import('react-native');
        Vibration.vibrate([0, 500, 200, 500]);
      }

      console.log('Notification sent:', event.title);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Limpiar recursos
  cleanup() {
    this.stopPolling();
    this.userId = null;
    this.lastCheckTime = new Date().toISOString();
  }
}

// Exportar una instancia singleton
export const alertPollingService = new AlertPollingService();