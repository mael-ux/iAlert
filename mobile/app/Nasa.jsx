// mobile/app/nasa.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeAreaWrapper from './components/safeAreaWrapper';
import CustomHeader from './components/customHeader';
import { API_URL } from '../constants/api';
import { useTheme } from './ThemeContext'; // Import context

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function NASAGalleryScreen() {
  const router = useRouter();
  const { theme } = useTheme(); // Use the hook
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/photos`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      
      const data = await response.json();
      setPhotos(data);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const openPhoto = (photo) => {
    setSelectedPhoto(photo);
    setModalVisible(true);
  };

  const closePhoto = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedPhoto(null), 300);
  };

  const renderPhotoCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.card }]} // Dynamic card color
      onPress={() => openPhoto(item)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.url }} 
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardOverlay}>
        {/* Title stays white because it is on a dark overlay */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
        <CustomHeader title="NASA Gallery" backTo="/(tabs)/user" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textLight }]}>Loading gallery...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomHeader title="NASA Gallery" backTo="/(tabs)/user" />
      
      <FlatList
        data={photos}
        renderItem={renderPhotoCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />

      {/* Full Screen Photo Modal */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closePhoto}
      >
        {selectedPhoto && (
          // Modal background adapts to theme
          <SafeAreaWrapper style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closePhoto} style={[styles.closeButton, { backgroundColor: theme.card }]}>
                <Ionicons name="close" size={32} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <Image 
                source={{ uri: selectedPhoto.url }} 
                style={styles.fullImage}
                resizeMode="contain"
              />
              
              <View style={styles.photoInfo}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedPhoto.title}
                </Text>
                
                {selectedPhoto.date && (
                  <Text style={[styles.photoDate, { color: theme.textLight }]}>
                    📅 {new Date(selectedPhoto.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                )}
                
                {selectedPhoto.description && (
                  <Text style={[styles.photoDescription, { color: theme.text }]}>
                    {selectedPhoto.description}
                  </Text>
                )}
                
                {selectedPhoto.credits && (
                  <View style={[styles.creditsContainer, { backgroundColor: theme.card }]}>
                    <Text style={[styles.creditsLabel, { color: theme.textLight }]}>Credits:</Text>
                    <Text style={[styles.creditsText, { color: theme.text }]}>{selectedPhoto.credits}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaWrapper>
        )}
      </Modal>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  grid: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
  },
  cardTitle: {
    color: '#FFFFFF', // Keep white for contrast on overlay
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 16,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    elevation: 2,
  },
  modalContent: {
    paddingBottom: 32,
  },
  fullImage: {
    width: width,
    height: width * 1.2, // Square-ish aspect ratio for better fit
  },
  photoInfo: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  photoDate: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.8,
  },
  photoDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  creditsContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  creditsLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  creditsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});