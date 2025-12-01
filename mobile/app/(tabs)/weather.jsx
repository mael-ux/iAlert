// mobile/app/(tabs)/weather.jsx
// Enhanced weather view with detailed information
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import SafeAreaWrapper from '../components/safeAreaWrapper';
import { COLORS } from '../../constants/colors';
import { API_URL } from '../../constants/api';

const { width } = Dimensions.get('window');

export default function WeatherScreen() {
  const { user } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [locations, setLocations] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadLocations();
  }, [user]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let currentLoc = null;
      
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({});
        const address = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        
        currentLoc = {
          id: 'current',
          title: '📍 Ubicación Actual',
          subtitle: address[0]?.city || address[0]?.region || 'Tu Ubicación',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }

      // Get saved zones
      let zones = [];
      if (user) {
        const response = await fetch(`${API_URL}/interestZone/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          zones = data.map(zone => ({
            id: zone.id,
            title: zone.title,
            subtitle: 'Zona Guardada',
            latitude: parseFloat(zone.latitude),
            longitude: parseFloat(zone.longitude),
          }));
        }
      }

      const allLocations = currentLoc ? [currentLoc, ...zones] : zones;
      setLocations(allLocations);
      await fetchAllWeather(allLocations);
      
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllWeather = async (locs) => {
    const weatherPromises = locs.map(async (loc) => {
      try {
        const response = await fetch(`${API_URL}/get-weather`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: loc.latitude,
            longitude: loc.longitude,
          }),
        });
        
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error(`Error fetching weather for ${loc.title}:`, error);
        return null;
      }
    });

    const results = await Promise.all(weatherPromises);
    setWeatherData(results);
  };

  const navigateToLocation = (index) => {
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const handleScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': 'sunny',
      '01n': 'moon',
      '02d': 'partly-sunny',
      '02n': 'cloudy-night',
      '03d': 'cloud',
      '03n': 'cloud',
      '04d': 'cloudy',
      '04n': 'cloudy',
      '09d': 'rainy',
      '09n': 'rainy',
      '10d': 'rainy',
      '10n': 'rainy',
      '11d': 'thunderstorm',
      '11n': 'thunderstorm',
      '13d': 'snow',
      '13n': 'snow',
      '50d': 'water',
      '50n': 'water',
    };
    return iconMap[iconCode] || 'cloud';
  };

  const renderWeatherCard = (location, weather, index) => {
    if (!weather) {
      return (
        <View key={index} style={[styles.card, { width }]}>
          <Text style={styles.errorText}>Datos no disponibles</Text>
        </View>
      );
    }

    const temp = Math.round(weather.main?.temp || 0);
    const feelsLike = Math.round(weather.main?.feels_like || 0);
    const description = weather.weather?.[0]?.description || '';
    const icon = weather.weather?.[0]?.icon || '01d';
    const humidity = weather.main?.humidity || 0;
    const pressure = weather.main?.pressure || 0;
    const windSpeed = weather.wind?.speed || 0;
    const windDeg = weather.wind?.deg || 0;
    const visibility = weather.visibility ? (weather.visibility / 1000).toFixed(1) : 0;
    const clouds = weather.clouds?.all || 0;
    const sunrise = weather.sys?.sunrise ? new Date(weather.sys.sunrise * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const sunset = weather.sys?.sunset ? new Date(weather.sys.sunset * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    const getWindDirection = (deg) => {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const index = Math.round(deg / 45) % 8;
      return directions[index];
    };

    return (
      <ScrollView key={index} style={[styles.card, { width }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.locationTitle}>{location.title}</Text>
            <Text style={styles.locationSubtitle}>{location.subtitle}</Text>
          </View>
          {location.id !== 'current' && (
            <TouchableOpacity onPress={() => deleteZone(location.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>

        {/* Main Temperature */}
        <View style={styles.mainWeather}>
          <Ionicons name={getWeatherIcon(icon)} size={80} color={COLORS.primary} />
          <Text style={styles.temperature}>{temp}°C</Text>
          <Text style={styles.description}>{description}</Text>
          <Text style={styles.feelsLike}>Sensación térmica: {feelsLike}°C</Text>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="water-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{humidity}%</Text>
            <Text style={styles.statLabel}>Humedad</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{windSpeed} m/s</Text>
            <Text style={styles.statLabel}>Viento {getWindDirection(windDeg)}</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="eye-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{visibility} km</Text>
            <Text style={styles.statLabel}>Visibilidad</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cloud-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{clouds}%</Text>
            <Text style={styles.statLabel}>Nubosidad</Text>
          </View>
        </View>

        {/* Detailed Info */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Información Detallada</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="compress-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.detailLabel}>Presión</Text>
            </View>
            <Text style={styles.detailValue}>{pressure} hPa</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="sunrise-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.detailLabel}>Amanecer</Text>
            </View>
            <Text style={styles.detailValue}>{sunrise}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="sunset-outline" size={20} color={COLORS.textLight} />
              <Text style={styles.detailLabel}>Atardecer</Text>
            </View>
            <Text style={styles.detailValue}>{sunset}</Text>
          </View>

          {weather.main?.temp_min && weather.main?.temp_max && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="thermometer-outline" size={20} color={COLORS.textLight} />
                <Text style={styles.detailLabel}>Rango</Text>
              </View>
              <Text style={styles.detailValue}>
                {Math.round(weather.main.temp_min)}° - {Math.round(weather.main.temp_max)}°
              </Text>
            </View>
          )}
        </View>

        {/* Coordinates */}
        <View style={styles.coordsSection}>
          <Text style={styles.coordsText}>
            📍 {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
          </Text>
        </View>
      </ScrollView>
    );
  };

  const deleteZone = async (zoneId) => {
    // Same delete function from zones screen
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/interestZone/${user.id}/${zoneId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        loadLocations();
      }
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando clima...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (locations.length === 0) {
    return (
      <SafeAreaWrapper style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="location-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No hay ubicaciones</Text>
          <Text style={styles.emptySubtext}>Agrega zonas de interés para ver el clima</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={styles.container}>
      {/* Location tabs */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContent}
        >
          {locations.map((loc, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.tab, currentIndex === index && styles.activeTab]}
              onPress={() => navigateToLocation(index)}
            >
              <Text style={[styles.tabText, currentIndex === index && styles.activeTabText]}>
                {loc.id === 'current' ? '📍' : loc.title.split(',')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Weather cards */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {locations.map((loc, index) => renderWeatherCard(loc, weatherData[index], index))}
      </ScrollView>

      {/* Page indicator */}
      <View style={styles.pageIndicator}>
        {locations.map((_, index) => (
          <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
        ))}
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  tabBar: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.white,
  },
  card: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  locationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  locationSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  mainWeather: {
    alignItems: 'center',
    marginBottom: 32,
  },
  temperature: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  description: {
    fontSize: 18,
    color: COLORS.textLight,
    textTransform: 'capitalize',
    marginTop: 8,
  },
  feelsLike: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  detailsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  coordsSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  coordsText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
});