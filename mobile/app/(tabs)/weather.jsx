// mobile/app/(tabs)/weather.jsx
// Weather view with swipe navigation between current location and interest zones
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
  PanResponder,
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
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadLocations();
  }, [user]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      
      // 1. Get current location
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
          title: '📍 Current Location',
          subtitle: address[0]?.city || 'Your Location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }

      // 2. Get saved interest zones
      let zones = [];
      if (user) {
        const response = await fetch(`${API_URL}/interestZone/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          zones = data.map(zone => ({
            id: zone.id,
            title: zone.title,
            subtitle: 'Saved Location',
            latitude: parseFloat(zone.latitude),
            longitude: parseFloat(zone.longitude),
          }));
        }
      }

      // 3. Combine all locations
      const allLocations = currentLoc ? [currentLoc, ...zones] : zones;
      setLocations(allLocations);

      // 4. Fetch weather for all locations
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

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const navigateToLocation = (index) => {
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const renderWeatherCard = (location, weather, index) => {
    if (!weather) {
      return (
        <View key={index} style={[styles.card, { width }]}>
          <Text style={styles.errorText}>Weather data unavailable</Text>
        </View>
      );
    }

    const temp = Math.round(weather.main?.temp || 0);
    const feelsLike = Math.round(weather.main?.feels_like || 0);
    const description = weather.weather?.[0]?.description || '';
    const icon = weather.weather?.[0]?.icon || '01d';

    return (
      <View key={index} style={[styles.card, { width }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.locationTitle}>{location.title}</Text>
            <Text style={styles.locationSubtitle}>{location.subtitle}</Text>
          </View>
          {location.id !== 'current' && (
            <TouchableOpacity
              onPress={() => deleteZone(location.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.mainWeather}>
          <Text style={styles.temperature}>{temp}°</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Ionicons name="thermometer-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.detailText}>Feels like {feelsLike}°</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.detailText}>{weather.main?.humidity}% humidity</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.detailText}>{weather.wind?.speed} m/s wind</Text>
          </View>
        </View>
      </View>
    );
  };

  const deleteZone = async (zoneId) => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URL}/interestZone/${user.id}/${zoneId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Reload locations
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
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (locations.length === 0) {
    return (
      <SafeAreaWrapper style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="location-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No locations found</Text>
          <Text style={styles.emptySubtext}>
            Add interest zones to see weather
          </Text>
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
              style={[
                styles.tab,
                currentIndex === index && styles.activeTab,
              ]}
              onPress={() => navigateToLocation(index)}
            >
              <Text
                style={[
                  styles.tabText,
                  currentIndex === index && styles.activeTabText,
                ]}
              >
                {loc.id === 'current' ? '📍' : loc.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Swipeable weather cards */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {locations.map((loc, index) =>
          renderWeatherCard(loc, weatherData[index], index)
        )}
      </ScrollView>

      {/* Page indicator */}
      <View style={styles.pageIndicator}>
        {locations.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Swipe hint */}
      {locations.length > 1 && currentIndex === 0 && (
        <View style={styles.swipeHint}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          <Text style={styles.swipeText}>Swipe for more locations</Text>
        </View>
      )}
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
    fontSize: 72,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  description: {
    fontSize: 18,
    color: COLORS.textLight,
    textTransform: 'capitalize',
    marginTop: 8,
  },
  details: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 16,
    color: COLORS.text,
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
  swipeHint: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    opacity: 0.8,
  },
  swipeText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});