// mobile/app/settings.jsx (or CustomizeScreen.jsx)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { THEMES } from '../constants/colors';
import SafeAreaWrapper from './components/safeAreaWrapper'; // Added import
import CustomHeader from './components/customHeader';       // Added import

const SettingsScreen = () => {
  const { theme, setTheme, currentThemeName } = useTheme();

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Replaced Text title with CustomHeader */}
      <CustomHeader title="Elige tu Tema 🎨" backTo="/(tabs)/user" />
      
      <View style={styles.themeSelector}>
        {Object.keys(THEMES).map((name) => (
          <TouchableOpacity
            key={name}
            style={[
              styles.themeOption,
              { backgroundColor: THEMES[name].primary }, // Use the theme's primary color
              name === currentThemeName && { borderColor: theme.text, borderWidth: 4 } // Highlight selected
            ]}
            onPress={() => setTheme(name)}
            activeOpacity={0.8}
          >
            <Text style={styles.themeText}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 'title' style removed as CustomHeader handles it now
  themeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // Changed to center for better alignment
    padding: 20,
    gap: 20, // Adds space between items (React Native 0.71+)
  },
  themeOption: {
    width: 140, // Slightly larger for better touch area
    height: 140,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    // Shadow for Android
    elevation: 8,
  },
  themeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // Text shadow for readability
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default SettingsScreen;