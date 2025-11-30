// mobile/app/nasa.jsx
// NASA Photo Gallery - Accessible from user tab
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
import { COLORS } from '../constants/colors';
import { API_URL } from '../constants/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function NASAGalleryScreen() {
  const router = useRouter();
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
      style={styles.card}
      onPress={() => openPhoto(item)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.url }} 
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardOverlay}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaWrapper style={styles.container}>
        <CustomHeader title="NASA Gallery" backTo="/(tabs)/user" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={styles.container}>
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
          <SafeAreaWrapper style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closePhoto} style={styles.closeButton}>
                <Ionicons name="close" size={32} color={COLORS.white} />
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
                <Text style={styles.modalTitle}>{selectedPhoto.title}</Text>
                
                {selectedPhoto.date && (
                  <Text style={styles.photoDate}>
                    📅 {new Date(selectedPhoto.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                )}
                
                {selectedPhoto.description && (
                  <Text style={styles.photoDescription}>
                    {selectedPhoto.description}
                  </Text>
                )}
                
                {selectedPhoto.credits && (
                  <View style={styles.creditsContainer}>
                    <Text style={styles.creditsLabel}>Credits:</Text>
                    <Text style={styles.creditsText}>{selectedPhoto.credits}</Text>
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
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
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
    backgroundColor: COLORS.card,
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
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    padding: 16,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  modalContent: {
    paddingBottom: 32,
  },
  fullImage: {
    width: width,
    height: width * 1.2,
  },
  photoInfo: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  photoDate: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: 16,
  },
  photoDescription: {
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 24,
    marginBottom: 16,
    opacity: 0.9,
  },
  creditsContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  creditsLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.7,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  creditsText: {
    fontSize: 14,
    color: COLORS.white,
    fontStyle: 'italic',
  },
});