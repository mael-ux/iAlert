// mobile/app/index.jsx
// Photo of the Day - Tap anywhere to continue
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  TouchableOpacity,
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';
import { API_URL } from '../constants/api';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhoto();
  }, []);

  const fetchPhoto = async () => {
    try {
      setLoading(true);
      console.log('📸 Fetching photo from:', `${API_URL}/photoOfTheDay`);
      
      const response = await fetch(`${API_URL}/photoOfTheDay`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Photo loaded:', data.title);
      setPhoto(data);
    } catch (err) {
      console.error('❌ Error fetching photo:', err);
      // Use fallback
      setPhoto({
        title: "Horsehead Nebula",
        image: "https://apod.nasa.gov/apod/image/2301/Horsehead_Hubble_1225.jpg",
        description: "The Horsehead Nebula is one of the most identifiable nebulae in the sky.",
        credits: "NASA, ESA, Hubble Heritage Team"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/(tabs)');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1} 
      onPress={handleContinue}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Full-screen image */}
      <Image 
        source={{ uri: photo?.image }} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Dark overlay for text readability */}
      <View style={styles.overlay} />
      
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{photo?.title}</Text>
          
          {photo?.credits && (
            <Text style={styles.credits}>© {photo.credits}</Text>
          )}
          
          {photo?.description && (
            <Text style={styles.description}>{photo.description}</Text>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.tapText}>Tap anywhere to continue</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  textContainer: {
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  credits: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    alignItems: 'center',
  },
  tapText: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    letterSpacing: 1,
  },
});