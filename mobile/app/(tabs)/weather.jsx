import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator, 
  FlatList,
  TouchableOpacity
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo'; // To get user ID
import * as Location from 'expo-location';
import { API_URL } from '../../constants/api'; // Our new API config

// --- (Helper function, same as before) ---
const getWeatherIcon = (iconCode) => {
  switch (iconCode) {
    case '01d': return 'sunny-outline';
    case '01n': return 'moon-outline';
    case '02d': return 'partly-sunny-outline';
    // ... (add all other cases from the template)
    default: return 'cloudy-outline';
  }
};

// This will be our "Current Location" object
const CURRENT_LOCATION_ZONE = {
  id: 'current',
  title: 'Current',
  latitude: null,
  longitude: null,
};

export default function WeatherScreen() {
  const { user } = useUser(); // Get the logged-in user

  // --- State Management ---
  const [weatherData, setWeatherData] = useState(null); // Holds the displayed weather
  const [savedZones, setSavedZones] = useState([]); // Holds the list from DB
  const [activeZone, setActiveZone] = useState(CURRENT_LOCATION_ZONE); // Tracks which zone is selected
  
  const [isLoading, setIsLoading] = useState(true); // For the main weather display
  const [isFetching, setIsFetching] = useState(false); // For subsequent fetches
  const [error, setError] = useState(null);

  // --- Data Fetching on Load ---
  useEffect(() => {
    if (user) {
      // Run both functions on load
      fetchDataForCurrentLocation();
      fetchSavedZones();
    }
  }, [user]); // Re-run if user changes

  // --- Logic Function 1: Get Weather by Coordinates ---
  const getWeather = async (latitude, longitude) => {
    if (!latitude || !longitude) return;
    
    setIsFetching(true); // Show a small spinner
    setError(null);
    try {
      const response = await fetch(`${API_URL}/get-weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!response.ok) throw new Error('Failed to fetch weather');
      
      const data = await response.json();
      setWeatherData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false); // Hide big spinner
      setIsFetching(false); // Hide small spinner
    }
  };

  // --- Logic Function 2: Get Current Location Weather ---
  const fetchDataForCurrentLocation = async () => {
    setIsLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access location was denied');
      setIsLoading(false);
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    
    // Store coords in our "Current" object
    CURRENT_LOCATION_ZONE.latitude = latitude;
    CURRENT_LOCATION_ZONE.longitude = longitude;
    
    setActiveZone(CURRENT_LOCATION_ZONE); // Set "Current" as default
    await getWeather(latitude, longitude); // Fetch weather
  };

  // --- Logic Function 3: Get Saved Zones from DB ---
  const fetchSavedZones = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/interestZone/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch zones');
      const zones = await response.json();
      setSavedZones(zones);
    } catch (err)
      { console.error("Failed to fetch zones:", err);
    }
  };

  // --- Logic Function 4: Handle Zone Button Press ---
  const handleZonePress = async (zone) => {
    setActiveZone(zone); // Highlight the new button
    
    let lat, lng;
    if (zone.id === 'current') {
      lat = zone.latitude;
      lng = zone.longitude;
    } else {
      // Saved zones have latitude/longitude as strings from DB
      lat = parseFloat(zone.latitude);
      lng = parseFloat(zone.longitude);
    }
    
    await getWeather(lat, lng); // Fetch weather for the selected zone
  };

  // --- Render Functions ---
  
  const renderWeatherContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={COLORS.primary} style={styles.icon} />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    if (weatherData) {
      return (
        <View style={styles.weatherContainer}>
          <Text style={styles.location}>{weatherData.name}</Text>
          <Ionicons 
            name={getWeatherIcon(weatherData.weather[0].icon)} 
            size={100} 
            color={COLORS.primary} 
            style={styles.icon}
          />
          <Text style={styles.temp}>{Math.round(weatherData.main.temp)}°C</Text>
          <Text style={styles.description}>
            {weatherData.weather[0].description}
          </Text>
          
          {/* Additional Weather Info */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailCard}>
              <Ionicons name="water-outline" size={24} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Humidity</Text>
              <Text style={styles.detailValue}>{weatherData.main.humidity}%</Text>
            </View>
            
            <View style={styles.detailCard}>
              <Ionicons name="speedometer-outline" size={24} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Pressure</Text>
              <Text style={styles.detailValue}>{weatherData.main.pressure} hPa</Text>
            </View>
            
            <View style={styles.detailCard}>
              <Ionicons name="analytics-outline" size={24} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Feels Like</Text>
              <Text style={styles.detailValue}>{Math.round(weatherData.main.feels_like)}°C</Text>
            </View>
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailCard}>
              <Ionicons name="arrow-up-outline" size={24} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Max Temp</Text>
              <Text style={styles.detailValue}>{Math.round(weatherData.main.temp_max)}°C</Text>
            </View>
            
            <View style={styles.detailCard}>
              <Ionicons name="arrow-down-outline" size={24} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Min Temp</Text>
              <Text style={styles.detailValue}>{Math.round(weatherData.main.temp_min)}°C</Text>
            </View>
            
            <View style={styles.detailCard}>
              <Ionicons name="flag-outline" size={24} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Wind</Text>
              <Text style={styles.detailValue}>{Math.round(weatherData.wind.speed)} m/s</Text>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderZoneSelector = () => {
    const allZones = [CURRENT_LOCATION_ZONE, ...savedZones];
    
    return (
      <View style={styles.zoneContainer}>
        <FlatList
          data={allZones}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()} // Use id for saved, 'current' for current
          renderItem={({ item }) => {
            const isActive = item.id === activeZone.id;
            return (
              <TouchableOpacity
                style={[styles.zoneButton, isActive && styles.zoneButtonActive]}
                onPress={() => handleZonePress(item)}
              >
                <Text style={[styles.zoneText, isActive && styles.zoneTextActive]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {activeZone.id === 'current' ? "Current Weather" : `Weather for ${activeZone.title}`}
      </Text>
      
      {/* This will show the big spinner on load, or the weather */}
      {renderWeatherContent()}
      
      {/* This is the small spinner for when you tap a new zone */}
      {isFetching && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 10 }} />}
      
      {/* This is the new horizontal list of buttons */}
      {renderZoneSelector()}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 40,
    minHeight: 30, // Reserve space
  },
  weatherContainer: {
    alignItems: 'center',
    minHeight: 250,
    width: '100%',
    paddingHorizontal: 20,
  },
  location: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 10,
  },
  icon: {
    marginVertical: 20,
  },
  temp: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  description: {
    fontSize: 18,
    color: COLORS.text,
    textTransform: 'capitalize',
    marginTop: 10,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.primary,
    textAlign: 'center',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  detailCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 90,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  // --- Zone Selector Styles ---
  zoneContainer: {
    marginTop: 'auto', // Pushes this to the bottom
    marginBottom: 40,
    width: '100%',
    height: 60,
  },
  zoneButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  zoneText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  zoneTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  }
});