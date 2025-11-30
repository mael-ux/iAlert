// mobile/app/index.jsx
// Photo of the Day - Homepage
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import SafeAreaWrapper from './components/safeAreaWrapper';
import { COLORS } from '../constants/colors';
import { API_URL } from '../constants/api';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRandomPhoto();
  }, []);

  const fetchRandomPhoto = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/photoOfTheDay`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch photo');
      }
      
      const data = await response.json();
      setPhoto(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching photo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Photo of the Day...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (error || !photo) {
    return (
      <SafeAreaWrapper style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Failed to load photo</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRandomPhoto}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: photo.url }} 
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Gradient overlay for text readability */}
        <View style={styles.gradient} />
        
        {/* Content overlay */}
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.badge}>Photo of the Day</Text>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.title}>{photo.title}</Text>
            {photo.description && (
              <Text style={styles.description} numberOfLines={3}>
                {photo.description}
              </Text>
            )}
            {photo.credits && (
              <Text style={styles.credits}>📷 {photo.credits}</Text>
            )}
            
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => router.push('/nasa')}
            >
              <Text style={styles.exploreText}>Explore Gallery →</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: width,
    height: height,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    alignItems: 'flex-start',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
    backdropFilter: 'blur(10px)',
  },
  footer: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  description: {
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 24,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  credits: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  exploreText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});