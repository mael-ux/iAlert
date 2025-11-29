// backend/src/config/eonetCron.js
import cron from 'cron';
import fetch from 'node-fetch';
import { db } from './db.js';
import { userAlertConfigTable, usersTable } from '../dataBase/schema.js';
import { eq } from 'drizzle-orm';

// Este cron job se ejecutará cada 5 minutos
export const eonetCheckJob = new cron.CronJob('*/5 * * * *', async () => {
  console.log('🔍 Checking EONET for new events...');
  
  try {
    // Obtener eventos de EONET
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=1');
    const data = await response.json();
    
    if (!data.events || data.events.length === 0) {
      console.log('No new events found');
      return;
    }

    // Obtener todos los usuarios con configuración de alertas
    const users = await db.select().from(usersTable);
    
    for (const user of users) {
      const [config] = await db
        .select()
        .from(userAlertConfigTable)
        .where(eq(userAlertConfigTable.userId, user.userId))
        .limit(1);
      
      if (!config) continue;

      // Filtrar eventos relevantes para este usuario
      const relevantEvents = data.events.filter(event => {
        const category = event.categories?.[0]?.id;
        return config.selectedTypes.includes(category);
      });

      if (relevantEvents.length > 0) {
        console.log(`Found ${relevantEvents.length} relevant events for user ${user.userId}`);
        // Aquí podrías enviar notificaciones push usando Expo Push Notifications
        // o simplemente almacenar en caché para que el polling las recoja
      }
    }

  } catch (error) {
    console.error('Error in EONET cron job:', error);
  }
});