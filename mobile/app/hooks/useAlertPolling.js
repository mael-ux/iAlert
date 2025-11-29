// mobile/app/hooks/useAlertPolling.js
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { alertPollingService } from '../services/alertPollingService';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export function useAlertPolling() {
  const { user } = useUser();
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user) return;

    // Inicializar servicio
    const initService = async () => {
      await alertPollingService.initialize(user.id);
      await alertPollingService.startPolling();
    };

    initService();

    // Configurar listener de notificaciones
    const notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        const eventData = response.notification.request.content.data;
        
        // Navegar a una pantalla de detalles del evento
        if (eventData) {
          router.push({
            pathname: '/event-details',
            params: {
              eventId: eventData.eventId,
              title: eventData.title,
              recommendation: eventData.recommendation,
            }
          });
        }
      }
    );

    // Listener para cambios de estado de la app
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App volvió al foreground, reiniciar polling
        console.log('App has come to the foreground - restarting polling');
        alertPollingService.startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        // App va al background, detener polling para ahorrar batería
        console.log('App going to background - stopping polling');
        alertPollingService.stopPolling();
      }

      appState.current = nextAppState;
    });

    // Cleanup
    return () => {
      alertPollingService.cleanup();
      notificationListener.remove();
      responseListener.remove();
      appStateSubscription.remove();
    };
  }, [user]);

  return {
    startPolling: () => alertPollingService.startPolling(),
    stopPolling: () => alertPollingService.stopPolling(),
    checkNow: () => alertPollingService.checkForNewEvents(),
  };
}