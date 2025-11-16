import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { API_URL } from '../constants/api'; // Your API config file

// OpenWeatherMap API Key (from .env or a constants file)
// We will move this to a secure place later, for now, we'll use a placeholder
// BUT, we will do this on the backend to keep it secure!
const OPENWEATHER_GEO_API_KEY = 'YOUR_OPENWEATHER_API_KEY'; // This is just for the search

export default function ZonesScreen() {
  const { user } = useUser();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [savedZones, setSavedZones] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const MAX_ZONES = 5;

  // --- 1. Fetch Saved Zones on Load ---
  useEffect(() => {
    if (user) {
      fetchSavedZones();
    }
  }, [user]);

  const fetchSavedZones = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/interestZone/${user.id}`);
      const data = await response.json();
      setSavedZones(data);
    } catch (error) {
      console.error("Failed to fetch zones:", error);
      Alert.alert("Error", "Could not load your saved zones.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Search for a New City ---
  const handleSearch = async () => {
    if (searchQuery.trim().length < 3) return;
    
    setIsSearching(true);
    setSearchResults([]);
    Keyboard.dismiss();
    
    try {
      // We will replace this with a backend call to keep the key secret
      // For now, this is how the API works
      const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${searchQuery}&limit=5&appid=${OPENWEATHER_GEO_API_KEY}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Could not complete search.");
    } finally {
      setIsSearching(false);
    }
  };

  // --- 3. Add a City from Search Results ---
  const handleAddZone = async (result) => {
    if (savedZones.length >= MAX_ZONES) {
      Alert.alert("Limit Reached", "You can only save up to 5 zones.");
      return;
    }
    
    // Construct the data to save with proper lat/lon fields
    const newZone = {
      userId: user.id,
      title: `${result.name}, ${result.country}`,
      latitude: result.lat,
      longitude: result.lon,
    };
    
    try {
      const response = await fetch(`${API_URL}/interestZone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newZone),
      });

      if (!response.ok) {
        throw new Error("Failed to save zone");
      }
      
      const savedZone = await response.json();
      
      // Add to UI and clear search
      setSavedZones([...savedZones, savedZone]);
      setSearchQuery('');
      setSearchResults([]);
      
    } catch (error) {
      console.error("Add zone error:", error);
      Alert.alert("Error", "Could not save the new zone.");
    }
  };

  // --- 4. Delete a Saved Zone ---
  const handleDeleteZone = async (zone) => {
    Alert.alert(
      "Delete Zone",
      `Are you sure you want to delete ${zone.title}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              // Use the DB id for deletion
              const response = await fetch(`${API_URL}/interestZone/${zone.userId}/${zone.id}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error("Failed to delete");
              }
              
              // Remove from UI
              setSavedZones(savedZones.filter(z => z.id !== zone.id));
              
            } catch (error) {
              console.error("Delete zone error:", error);
              Alert.alert("Error", "Could not delete the zone.");
            }
          }
        }
      ]
    );
  };
  
  // --- UI Components ---

  const renderSavedZone = ({ item }) => (
    <View style={styles.zoneCard}>
      <View>
        <Text style={styles.zoneTitle}>{item.title}</Text>
        <Text style={styles.zoneCoords}>Lat: {item.latitude}, Lon: {item.longitude}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteZone(item)}>
        <Ionicons name="trash-outline" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => handleAddZone(item)}
    >
      <Text style={styles.resultTitle}>{item.name}, {item.country}</Text>
      <Text style={styles.resultState}>{item.state || ''}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* --- Back Button and Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zones of Interest</Text>
        <View style={styles.backButton} />
      </View>

      {/* --- Search Bar --- */}
      {savedZones.length < MAX_ZONES ? (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a city..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.limitText}>You have reached your 5 zone limit.</Text>
      )}

      {/* --- Search Results --- */}
      {isSearching && <ActivityIndicator color={COLORS.primary} />}
      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.lat.toString() + item.lon.toString()}
          style={styles.resultsList}
        />
      )}

      {/* --- Saved Zones List --- */}
      <Text style={styles.listTitle}>My Saved Zones ({savedZones.length}/{MAX_ZONES})</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={savedZones}
          renderItem={renderSavedZone}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No zones saved yet.</Text>
          )}
        />
      )}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitText: {
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    paddingHorizontal: 16,
  },
  resultsList: {
    maxHeight: 200,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  resultState: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  zoneCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  zoneCoords: {
    color: COLORS.textLight,
    fontSize: 14,
    marginTop: 4,
  },
  emptyText: {
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 20,
  },
});