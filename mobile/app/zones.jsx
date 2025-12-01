// mobile/app/zones.jsx
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
import SafeAreaWrapper from './components/safeAreaWrapper';
import { API_URL } from '../constants/api';
import { useTheme } from './ThemeContext'; // Import context
import CustomHeader from './components/customHeader'; // Import header

export default function ZonesScreen() {
  const { user } = useUser();
  const { theme } = useTheme(); // Use Theme hook
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
      console.log(`📍 Fetching zones for user: ${user.id}`);
      const response = await fetch(`${API_URL}/interestZone/${user.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Loaded ${data.length} zones`);
      setSavedZones(data);
    } catch (error) {
      console.error("❌ Failed to fetch zones:", error);
      Alert.alert("Error", "Could not load your saved zones.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Search for a New City (using backend endpoint) ---
  const handleSearch = async () => {
    if (searchQuery.trim().length < 3) {
      Alert.alert("Search", "Please enter at least 3 characters");
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    Keyboard.dismiss();
    
    try {
      console.log(`🔍 Searching for: ${searchQuery}`);
      // Use backend endpoint (keeps API key secure)
      const response = await fetch(`${API_URL}/search-city?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Found ${data.length} results`);
      setSearchResults(data);
    } catch (error) {
      console.error("❌ Search error:", error);
      Alert.alert("Error", "Could not complete search. Check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  // --- 3. Add a City from Search Results ---
  const handleAddZone = async (result) => {
    if (savedZones.length >= MAX_ZONES) {
      Alert.alert("Limit Reached", `You can only save up to ${MAX_ZONES} zones.`);
      return;
    }
    
    const newZone = {
      userId: user.id,
      title: `${result.name}, ${result.country}`,
      latitude: result.lat,
      longitude: result.lon,
    };
    
    try {
      console.log(`➕ Adding zone: ${newZone.title}`);
      const response = await fetch(`${API_URL}/interestZone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newZone),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save zone");
      }
      
      const savedZone = await response.json();
      console.log(`✅ Zone saved with ID: ${savedZone.id}`);
      
      // Add to UI and clear search
      setSavedZones([...savedZones, savedZone]);
      setSearchQuery('');
      setSearchResults([]);
      
      Alert.alert("Success", `Added ${newZone.title}`);
      
    } catch (error) {
      console.error("❌ Add zone error:", error);
      Alert.alert("Error", error.message || "Could not save the zone.");
    }
  };

  // --- 4. Delete a Saved Zone ---
  const handleDeleteZone = async (zone) => {
    Alert.alert(
      "Delete Zone",
      `Remove ${zone.title}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              console.log(`🗑️ Deleting zone: ${zone.id}`);
              const response = await fetch(`${API_URL}/interestZone/${user.id}/${zone.id}`, {
                method: 'DELETE',
              });
              
              if (!response.ok) {
                throw new Error("Failed to delete");
              }
              
              console.log(`✅ Zone deleted: ${zone.id}`);
              setSavedZones(savedZones.filter(z => z.id !== zone.id));
              
            } catch (error) {
              console.error("❌ Delete zone error:", error);
              Alert.alert("Error", "Could not delete the zone.");
            }
          }
        }
      ]
    );
  };
  
  // --- UI Components ---

  const renderSavedZone = ({ item }) => (
    <View style={[styles.zoneCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.zoneInfo}>
        <Text style={[styles.zoneTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.zoneCoords, { color: theme.textLight }]}>
          📍 {parseFloat(item.latitude).toFixed(2)}°, {parseFloat(item.longitude).toFixed(2)}°
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteZone(item)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleAddZone(item)}
    >
      <View>
        <Text style={[styles.resultTitle, { color: theme.text }]}>{item.name}, {item.country}</Text>
        {item.state && <Text style={[styles.resultState, { color: theme.textLight }]}>{item.state}</Text>}
      </View>
      <Ionicons name="add-circle" size={24} color={theme.primary} />
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: theme.text }]}>Please sign in to manage zones</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* --- Header --- */}
      <CustomHeader title="Interest Zones" backTo="/(tabs)/user" />

      {/* --- Search Bar --- */}
      {savedZones.length < MAX_ZONES ? (
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput, 
              { 
                backgroundColor: theme.card, 
                color: theme.text, 
                borderColor: theme.border 
              }
            ]}
            placeholder="Search for a city..."
            placeholderTextColor={theme.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={[
              styles.searchButton, 
              { backgroundColor: theme.primary },
              isSearching && styles.searchButtonDisabled
            ]} 
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={theme.white} />
            ) : (
              <Ionicons name="search" size={20} color={theme.white} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.limitContainer, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.limitText, { color: theme.primary }]}>
            ✓ You've reached the maximum of {MAX_ZONES} zones
          </Text>
        </View>
      )}

      {/* --- Search Results --- */}
      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Search Results:</Text>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
            style={styles.resultsList}
          />
        </View>
      )}

      {/* --- Saved Zones List --- */}
      <View style={styles.zonesContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          My Zones ({savedZones.length}/{MAX_ZONES})
        </Text>
        
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : savedZones.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color={theme.textLight} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No zones saved yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textLight }]}>Search for cities above to add them</Text>
          </View>
        ) : (
          <FlatList
            data={savedZones}
            renderItem={renderSavedZone}
            keyExtractor={(item) => item.id.toString()}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  searchButton: {
    width: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  limitContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultState: {
    fontSize: 14,
    marginTop: 4,
  },
  zonesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  zoneCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  zoneCoords: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});