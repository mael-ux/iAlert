import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import SafeAreaWrapper from '../components/safeAreaWrapper';
import { API_URL } from '../../constants/api';
import { useTheme } from '../ThemeContext';

const { width } = Dimensions.get('window');

const WEATHER_BACKGROUNDS = {
  clearDay: require('../../assets/weather/clear-day.jpeg'),
  clearNight: require('../../assets/weather/clear-night.jpg'),
  cloudy: require('../../assets/weather/cloudy.jpg'),
  mist: require('../../assets/weather/mist.jpg'),
  rain: require('../../assets/weather/rain.jpg'),
  storm: require('../../assets/weather/storm.jpg'),
};

export default function WeatherScreen() {
  const { user } = useUser();
  const { theme } = useTheme();

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

      // Obtener ubicación actual
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      let currentLoc = null;

      if (status === 'granted') {
        const position =
          await Location.getCurrentPositionAsync({});

        const address =
          await Location.reverseGeocodeAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

        currentLoc = {
          id: 'current',
          title: '📍 Ubicación Actual',
          subtitle:
            address[0]?.city ||
            address[0]?.region ||
            'Tu Ubicación',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }

      // Obtener zonas guardadas
      let zones = [];

      if (user) {
        const response = await fetch(
          `${API_URL}/interestZone/${user.id}`
        );

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

      const allLocations = currentLoc
        ? [currentLoc, ...zones]
        : zones;

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
        const response = await fetch(
          `${API_URL}/get-weather`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude: loc.latitude,
              longitude: loc.longitude,
            }),
          }
        );

        if (response.ok) {
          return await response.json();
        }

        return null;

      } catch (error) {
        console.error(
          `Error fetching weather for ${loc.title}:`,
          error
        );

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
    const offsetX =
      event.nativeEvent.contentOffset.x;

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

  const getWeatherBackground = (iconCode) => {
    if (!iconCode) {
      return WEATHER_BACKGROUNDS.cloudy;
    }

    if (iconCode === '01d') {
      return WEATHER_BACKGROUNDS.clearDay;
    }

    if (iconCode === '01n') {
      return WEATHER_BACKGROUNDS.clearNight;
    }

    if (
      iconCode === '02d' ||
      iconCode === '02n' ||
      iconCode === '03d' ||
      iconCode === '03n' ||
      iconCode === '04d' ||
      iconCode === '04n'
    ) {
      return WEATHER_BACKGROUNDS.cloudy;
    }

    if (
      iconCode === '09d' ||
      iconCode === '09n' ||
      iconCode === '10d' ||
      iconCode === '10n'
    ) {
      return WEATHER_BACKGROUNDS.rain;
    }

    if (
      iconCode === '11d' ||
      iconCode === '11n'
    ) {
      return WEATHER_BACKGROUNDS.storm;
    }

    if (
      iconCode === '50d' ||
      iconCode === '50n'
    ) {
      return WEATHER_BACKGROUNDS.mist;
    }

    return WEATHER_BACKGROUNDS.cloudy;
  };

  const renderWeatherCard = (
    location,
    weather,
    index
  ) => {
    if (!weather) {
      return (
        <View
          key={index}
          style={[
            styles.card,
            {
              width,
              backgroundColor: theme.background,
            },
          ]}
        >
          <Text
            style={[
              styles.errorText,
              { color: theme.textLight },
            ]}
          >
            Datos no disponibles
          </Text>
        </View>
      );
    }

    const temp = Math.round(
      weather.main?.temp || 0
    );

    const feelsLike = Math.round(
      weather.main?.feels_like || 0
    );

    const description =
      weather.weather?.[0]?.description || '';

    const icon =
      weather.weather?.[0]?.icon || '01d';

    const backgroundImage =
      getWeatherBackground(icon);

    const humidity =
      weather.main?.humidity || 0;

    const pressure =
      weather.main?.pressure || 0;

    const windSpeed =
      weather.wind?.speed || 0;

    const windDeg =
      weather.wind?.deg || 0;

    const visibility = weather.visibility
      ? (weather.visibility / 1000).toFixed(1)
      : 0;

    const clouds =
      weather.clouds?.all || 0;

    const sunrise = weather.sys?.sunrise
      ? new Date(
          weather.sys.sunrise * 1000
        ).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--';

    const sunset = weather.sys?.sunset
      ? new Date(
          weather.sys.sunset * 1000
        ).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--';

    const getWindDirection = (deg) => {
      const directions = [
        'N',
        'NE',
        'E',
        'SE',
        'S',
        'SW',
        'W',
        'NW',
      ];

      const directionIndex =
        Math.round(deg / 45) % 8;

      return directions[directionIndex];
    };

    return (
      <ScrollView
        key={index}
        style={[
          styles.card,
          {
            width,
            backgroundColor: theme.background,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* HERO DEL CLIMA */}
        <ImageBackground
          source={backgroundImage}
          style={styles.weatherHero}
          imageStyle={styles.weatherBackground}
        >
          {/* Overlay oscuro */}
          <View style={styles.weatherOverlay}>

            {/* Header */}
            <View style={styles.cardHeader}>
              <View>
                <Text
                  style={[
                    styles.locationTitle,
                    {
                      color: '#FFFFFF',
                    },
                  ]}
                >
                  {location.title}
                </Text>

                <Text
                  style={[
                    styles.locationSubtitle,
                    {
                      color: 'rgba(255,255,255,0.8)',
                    },
                  ]}
                >
                  {location.subtitle}
                </Text>
              </View>

              <Ionicons
                name={getWeatherIcon(icon)}
                size={34}
                color="#FFFFFF"
              />
            </View>

            {/* Temperatura */}
            <View style={styles.mainWeather}>

              <Text
                style={[
                  styles.temperature,
                  {
                    color: '#FFFFFF',
                  },
                ]}
              >
                {temp}°
              </Text>

              <Text
                style={[
                  styles.description,
                  {
                    color: '#FFFFFF',
                  },
                ]}
              >
                {description}
              </Text>

              <Text
                style={[
                  styles.feelsLike,
                  {
                    color: 'rgba(255,255,255,0.85)',
                  },
                ]}
              >
                Sensación térmica: {feelsLike}°
              </Text>

            </View>

          </View>
        </ImageBackground>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            <Ionicons
              name="water-outline"
              size={24}
              color={theme.primary}
            />

            <Text
              style={[
                styles.statValue,
                { color: theme.text },
              ]}
            >
              {humidity}%
            </Text>

            <Text
              style={[
                styles.statLabel,
                { color: theme.textLight },
              ]}
            >
              Humedad
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            <Ionicons
              name="speedometer-outline"
              size={24}
              color={theme.primary}
            />

            <Text
              style={[
                styles.statValue,
                { color: theme.text },
              ]}
            >
              {windSpeed} m/s
            </Text>

            <Text
              style={[
                styles.statLabel,
                { color: theme.textLight },
              ]}
            >
              Viento {getWindDirection(windDeg)}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            <Ionicons
              name="eye-outline"
              size={24}
              color={theme.primary}
            />

            <Text
              style={[
                styles.statValue,
                { color: theme.text },
              ]}
            >
              {visibility} km
            </Text>

            <Text
              style={[
                styles.statLabel,
                { color: theme.textLight },
              ]}
            >
              Visibilidad
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.card,
              },
            ]}
          >
            <Ionicons
              name="cloud-outline"
              size={24}
              color={theme.primary}
            />

            <Text
              style={[
                styles.statValue,
                { color: theme.text },
              ]}
            >
              {clouds}%
            </Text>

            <Text
              style={[
                styles.statLabel,
                { color: theme.textLight },
              ]}
            >
              Nubosidad
            </Text>
          </View>

        </View>

        {/* Información detallada */}
        <View
          style={[
            styles.detailsSection,
            {
              backgroundColor: theme.card,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.text },
            ]}
          >
            Información Detallada
          </Text>

          <View
            style={[
              styles.detailRow,
              {
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={styles.detailItem}>
              <Ionicons
                name="speedometer-outline"
                size={20}
                color={theme.textLight}
              />

              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.textLight },
                ]}
              >
                Presión
              </Text>
            </View>

            <Text
              style={[
                styles.detailValue,
                { color: theme.text },
              ]}
            >
              {pressure} hPa
            </Text>
          </View>

          <View
            style={[
              styles.detailRow,
              {
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={styles.detailItem}>
              <Ionicons
                name="sunny-outline"
                size={20}
                color={theme.textLight}
              />

              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.textLight },
                ]}
              >
                Amanecer
              </Text>
            </View>

            <Text
              style={[
                styles.detailValue,
                { color: theme.text },
              ]}
            >
              {sunrise}
            </Text>
          </View>

          <View
            style={[
              styles.detailRow,
              {
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View style={styles.detailItem}>
              <Ionicons
                name="moon-outline"
                size={20}
                color={theme.textLight}
              />

              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.textLight },
                ]}
              >
                Atardecer
              </Text>
            </View>

            <Text
              style={[
                styles.detailValue,
                { color: theme.text },
              ]}
            >
              {sunset}
            </Text>
          </View>

          {weather.main?.temp_min &&
            weather.main?.temp_max && (
              <View
                style={[
                  styles.detailRow,
                  {
                    borderBottomColor:
                      'transparent',
                  },
                ]}
              >
                <View style={styles.detailItem}>
                  <Ionicons
                    name="thermometer-outline"
                    size={20}
                    color={theme.textLight}
                  />

                  <Text
                    style={[
                      styles.detailLabel,
                      {
                        color: theme.textLight,
                      },
                    ]}
                  >
                    Rango
                  </Text>
                </View>

                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {Math.round(
                    weather.main.temp_min
                  )}° - {Math.round(
                    weather.main.temp_max
                  )}°
                </Text>
              </View>
            )}
        </View>

        {/* Coordenadas */}
        <View style={styles.coordsSection}>
          <Text
            style={[
              styles.coordsText,
              { color: theme.textLight },
            ]}
          >
            📍 {location.latitude.toFixed(4)}°,{' '}
            {location.longitude.toFixed(4)}°
          </Text>
        </View>

      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaWrapper
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator
            size="large"
            color={theme.primary}
          />

          <Text
            style={[
              styles.loadingText,
              {
                color: theme.textLight,
              },
            ]}
          >
            Cargando clima...
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (locations.length === 0) {
    return (
      <SafeAreaWrapper
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <View style={styles.centerContent}>

          <Ionicons
            name="location-outline"
            size={64}
            color={theme.textLight}
          />

          <Text
            style={[
              styles.emptyText,
              {
                color: theme.text,
              },
            ]}
          >
            No hay ubicaciones
          </Text>

          <Text
            style={[
              styles.emptySubtext,
              {
                color: theme.textLight,
              },
            ]}
          >
            Agrega zonas de interés para ver el clima
          </Text>

        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >

      {/* Location tabs */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.tabContent
          }
        >
          {locations.map((loc, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    theme.background,
                },
                currentIndex === index && {
                  backgroundColor:
                    theme.primary,
                },
              ]}
              onPress={() =>
                navigateToLocation(index)
              }
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: theme.textLight,
                  },
                  currentIndex === index &&
                    styles.activeTabText,
                ]}
              >
                {loc.id === 'current'
                  ? '📍'
                  : loc.title.split(',')[0]}
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
        {locations.map((loc, index) =>
          renderWeatherCard(
            loc,
            weatherData[index],
            index
          )
        )}
      </ScrollView>

      {/* Page indicator */}
      <View style={styles.pageIndicator}>
        {locations.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: theme.border,
              },
              currentIndex === index && {
                backgroundColor:
                  theme.primary,
                width: 24,
              },
            ]}
          />
        ))}
      </View>

    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },

  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  tabBar: {
    borderBottomWidth: 1,
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
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  activeTabText: {
    color: '#FFFFFF',
  },

  card: {
    padding: 20,
  },

  /* NUEVO HERO DEL CLIMA */
  weatherHero: {
    minHeight: 360,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
  },

  weatherBackground: {
    resizeMode: 'cover',
  },

  weatherOverlay: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  locationTitle: {
    fontSize: 23,
    fontWeight: '700',
  },

  locationSubtitle: {
    fontSize: 14,
    marginTop: 5,
  },

  mainWeather: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  temperature: {
    fontSize: 92,
    fontWeight: '200',
    letterSpacing: -4,
  },

  description: {
    fontSize: 21,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 4,
  },

  feelsLike: {
    fontSize: 14,
    marginTop: 8,
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
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },

  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  detailsSection: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  detailLabel: {
    fontSize: 14,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  coordsSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  coordsText: {
    fontSize: 12,
  },

  errorText: {
    fontSize: 16,
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
  },
});