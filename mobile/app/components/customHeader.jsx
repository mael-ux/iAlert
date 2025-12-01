// mobile/app/components/CustomHeader.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext'; // Importing from parent directory

export default function CustomHeader({ title, backTo }) {
  const router = useRouter();
  const { theme } = useTheme(); // Access the dynamic theme
  
  const handleBack = () => {
    if (backTo) {
      // Navigate to specific route
      router.push(backTo);
    } else {
      // Go back in history
      router.back();
    }
  };

  return (
    <View 
      style={[
        styles.header, 
        { 
          backgroundColor: theme.background, 
          borderBottomColor: theme.border 
        }
      ]}
    >
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // Colors are now handled inline via theme
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40, // Same width as back button to ensure title is perfectly centered
  },
});