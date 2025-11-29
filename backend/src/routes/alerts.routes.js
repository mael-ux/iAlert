// backend/src/routes/alerts.routes.js
import express from 'express';
import { db } from '../config/db.js';
import { userAlertConfigTable, disasterTypeTable } from '../dataBase/schema.js';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';

const router = express.Router();

// Mapeo de categorías EONET a tus typeId en la base de datos
const EONET_TO_DB_MAPPING = {
  // EONET category ID → Tu typeId en disaster_type
  'wildfires': 1,           // Incendios forestales
  'volcanoes': 2,           // Volcanes
  'severeStorms': 3,        // Tormentas severas
  'floods': 4,              // Inundaciones
  'earthquakes': 5,         // Terremotos
  'landslides': 6,          // Deslizamientos de tierra
  'drought': 7,             // Sequías
  'dustHaze': 8,            // Polvo y neblina
  'tempExtremes': 9,        // Extremos de temperatura
  'seaLakeIce': 10,         // Hielo de mar y lagos
  'snow': 11,               // Nieve
  'waterColor': 12,         // Cambios en el color del agua
  'manmade': 13,            // Eventos causados por humanos
};

// ============================================================================
// CONFIGURACIÓN DE ALERTAS
// ============================================================================

// GET - Obtener configuración de alertas del usuario
router.get('/config/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [config] = await db
      .select()
      .from(userAlertConfigTable)
      .where(eq(userAlertConfigTable.userId, userId))
      .limit(1);
    
    if (!config) {
      // Devolver configuración por defecto
      return res.json({
        selectedTypes: ['wildfires', 'volcanoes', 'severeStorms', 'floods', 'earthquakes'],
        vibrateEnabled: true,
        soundEnabled: true,
        flashEnabled: false,
        soundLevel: 80,
        notifyCurrentLocation: true,
        notifyOnlySelectedZones: false
      });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error getting alert config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Guardar/actualizar configuración de alertas
router.post('/config/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const config = req.body;
    
    // Verificar si ya existe una configuración
    const [existing] = await db
      .select()
      .from(userAlertConfigTable)
      .where(eq(userAlertConfigTable.userId, userId))
      .limit(1);
    
    if (existing) {
      // Actualizar
      const [updated] = await db
        .update(userAlertConfigTable)
        .set({
          ...config,
          updatedAt: new Date()
        })
        .where(eq(userAlertConfigTable.userId, userId))
        .returning();
      
      return res.json(updated);
    } else {
      // Crear nueva
      const [created] = await db
        .insert(userAlertConfigTable)
        .values({
          userId,
          ...config
        })
        .returning();
      
      return res.json(created);
    }
  } catch (error) {
    console.error('Error saving alert config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// RECOMENDACIONES (Usando tu tabla disasterTypeTable)
// ============================================================================

// GET - Obtener recomendación por tipo de desastre EONET
router.get('/recommendations/:disasterType', async (req, res) => {
  try {
    const { disasterType } = req.params; // ej: 'wildfires'
    
    // Mapear el tipo EONET a tu typeId
    const typeId = EONET_TO_DB_MAPPING[disasterType];
    
    if (!typeId) {
      return res.status(404).json({ 
        error: 'Unknown disaster type',
        recommendation: 'Manténgase informado y siga las instrucciones de las autoridades locales.'
      });
    }
    
    // Buscar en tu tabla disaster_type
    const [disasterInfo] = await db
      .select()
      .from(disasterTypeTable)
      .where(eq(disasterTypeTable.typeId, typeId))
      .limit(1);
    
    if (!disasterInfo) {
      return res.status(404).json({ 
        error: 'No recommendation found',
        recommendation: 'Manténgase informado y siga las instrucciones de las autoridades locales.'
      });
    }
    
    res.json({
      typeId: disasterInfo.typeId,
      title: disasterInfo.title,
      description: disasterInfo.description,
      recommendation: disasterInfo.recommendations,
      riskLevel: disasterInfo.averageRiskLevel
    });
    
  } catch (error) {
    console.error('Error getting recommendation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Obtener todos los tipos de desastre con recomendaciones
router.get('/disaster-types', async (req, res) => {
  try {
    const disasterTypes = await db
      .select()
      .from(disasterTypeTable)
      .orderBy(disasterTypeTable.typeId);
    
    res.json(disasterTypes);
  } catch (error) {
    console.error('Error getting disaster types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// EVENTOS EONET
// ============================================================================

// GET - Obtener eventos activos de EONET
router.get('/events', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Obtener eventos de EONET
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=7');
    const data = await response.json();
    
    // Si el usuario está autenticado, filtrar por su configuración
    if (userId) {
      const [config] = await db
        .select()
        .from(userAlertConfigTable)
        .where(eq(userAlertConfigTable.userId, userId))
        .limit(1);
      
      if (config && config.selectedTypes) {
        // Filtrar eventos por tipos seleccionados
        const filteredEvents = data.events.filter(event => {
          const category = event.categories?.[0]?.id;
          return config.selectedTypes.includes(category);
        });
        
        return res.json({ events: filteredEvents });
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching EONET events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Verificar nuevos eventos para un usuario (para notificaciones en tiempo real)
router.get('/check-new/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { lastCheckTime, latitude, longitude } = req.query;
    
    // Obtener configuración del usuario
    const [config] = await db
      .select()
      .from(userAlertConfigTable)
      .where(eq(userAlertConfigTable.userId, userId))
      .limit(1);
    
    if (!config) {
      return res.json({ newEvents: [] });
    }
    
    // Obtener zonas de interés del usuario
    const userZones = await db
      .select()
      .from(interestZonesTable)
      .where(eq(interestZonesTable.userId, userId));
    
    // Obtener eventos de EONET
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=1');
    const data = await response.json();
    
    // Filtrar por tipos seleccionados
    let relevantEvents = data.events.filter(event => {
      const category = event.categories?.[0]?.id;
      return config.selectedTypes.includes(category);
    });
    
    // Filtrar por ubicación si está configurado
    if (config.notifyCurrentLocation && latitude && longitude) {
      relevantEvents = relevantEvents.filter(event => {
        if (!event.geometry || !event.geometry.length) return false;
        
        const eventLat = event.geometry[0].coordinates[1];
        const eventLon = event.geometry[0].coordinates[0];
        
        // Calcular distancia aproximada (500km de radio)
        const distance = calculateDistance(
          parseFloat(latitude), 
          parseFloat(longitude), 
          eventLat, 
          eventLon
        );
        
        return distance <= 500;
      });
    }
    
    // Filtrar por zonas de interés si está configurado
    if (config.notifyOnlySelectedZones && userZones.length > 0) {
      relevantEvents = relevantEvents.filter(event => {
        if (!event.geometry || !event.geometry.length) return false;
        
        const eventLat = event.geometry[0].coordinates[1];
        const eventLon = event.geometry[0].coordinates[0];
        
        return userZones.some(zone => {
          const distance = calculateDistance(
            parseFloat(zone.latitude),
            parseFloat(zone.longitude),
            eventLat,
            eventLon
          );
          return distance <= 500;
        });
      });
    }
    
    // Filtrar solo eventos nuevos si hay timestamp
    let newEvents = relevantEvents;
    if (lastCheckTime) {
      const checkDate = new Date(lastCheckTime);
      newEvents = relevantEvents.filter(event => {
        const eventDate = new Date(event.geometry?.[0]?.date);
        return eventDate > checkDate;
      });
    }
    
    // Agregar recomendaciones a cada evento
    const eventsWithRecommendations = await Promise.all(
      newEvents.map(async (event) => {
        const category = event.categories?.[0]?.id;
        const typeId = EONET_TO_DB_MAPPING[category];
        
        if (typeId) {
          const [disasterInfo] = await db
            .select()
            .from(disasterTypeTable)
            .where(eq(disasterTypeTable.typeId, typeId))
            .limit(1);
          
          return {
            ...event,
            recommendation: disasterInfo?.recommendations || 'Manténgase informado.',
            disasterTitle: disasterInfo?.title,
            riskLevel: disasterInfo?.averageRiskLevel
          };
        }
        
        return event;
      })
    );
    
    res.json({ 
      newEvents: eventsWithRecommendations, 
      count: newEvents.length 
    });
    
  } catch (error) {
    console.error('Error checking new events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Función auxiliar para calcular distancia (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;