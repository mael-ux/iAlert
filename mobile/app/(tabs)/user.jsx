import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 
import { useTheme } from '../ThemeContext';

export default function UserScreen() {
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();
  const { theme } = useTheme();
  const router = useRouter(); 
  
  const [isEnglish, setIsEnglish] = useState(false);

  const handleSignOut = async () => {
    if (!isSignedIn) return;
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const toggleLanguage = () => {
    setIsEnglish(prev => !prev);
  };

  // Helper component for settings buttons
  const SettingsButton = ({ href, title, icon }) => (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => router.push(href)}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        <Ionicons name={icon} size={24} color={theme.primary} />
        <Text style={[styles.buttonText, { color: theme.text }]}>{title}</Text>
        <Ionicons name="chevron-forward-outline" size={20} color={theme.textLight || '#ccc'} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. SECCIÓN DE USUARIO */}
        <View style={styles.headerSection}>
          <TouchableOpacity 
            style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/editusuario')}
            activeOpacity={0.8}
          >
            <View style={styles.profileInfo}>
              {user?.imageUrl ? (
                <Image 
                  source={{ uri: user.imageUrl }} 
                  style={[styles.realProfileImage, { borderColor: theme.primary }]} 
                />
              ) : (
                <Ionicons name="person-circle-outline" size={60} color={theme.primary} />
              )}
              
              <View style={styles.profileDetails}>
                <Text style={[styles.profileName, { color: theme.text }]}>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (isEnglish ? 'User' : 'Usuario')}
                </Text>
                <Text style={[styles.profileEmail, { color: theme.textLight }]}>
                  {user?.primaryEmailAddress?.emailAddress || (isEnglish ? 'No email' : 'Sin correo')}
                </Text>
                <Text style={[styles.editProfileText, { color: theme.primary }]}>
                  {isEnglish ? 'Edit Profile' : 'Editar perfil'}
                </Text>
              </View>
              
              <Ionicons name="chevron-forward-outline" size={20} color={theme.textLight || '#ccc'} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 2. App Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textLight }]}>
            {isEnglish ? 'App Settings' : 'Configuración'}
          </Text>
          
          <SettingsButton
            href="/zones"
            title={isEnglish ? "Manage Zones" : "Zonas de Interés"}
            icon="map-outline"
          />
          
          <SettingsButton
            href="/alert-settings"
            title={isEnglish ? "Alert Settings" : "Configurar Alertas"}
            icon="notifications-outline"
          />
          
          {/* TOGGLE DE IDIOMA */}
          <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.buttonContent}>
              <Ionicons name="language-outline" size={24} color={theme.primary} />
              <Text style={[styles.buttonText, { color: theme.text }]}>
                {isEnglish ? "Language: English" : "Idioma: Español"}
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: theme.primary }}
              thumbColor={isEnglish ? "#f4f3f4" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleLanguage}
              value={isEnglish}
            />
          </View>
          
          <SettingsButton
            href="/personalizar"
            title={isEnglish ? "Customize App" : "Personalizar App"}
            icon="color-palette-outline"
          />
        </View>

        {/* 3. NASA & Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textLight }]}>
            {isEnglish ? 'More' : 'Más'}
          </Text>
          
          <SettingsButton
            href="/Nasa"
            title={isEnglish ? "NASA Gallery" : "Galería NASA"}
            icon="planet-outline"
          />
          
          <SettingsButton
            href="/dudas"
            title={isEnglish ? "FAQ" : "Preguntas Frecuentes (FAQ)"}
            icon="help-circle-outline"
          />
          
          <SettingsButton
            href="/soporte"
            title={isEnglish ? "Support" : "Soporte"}
            icon="mail-outline"
          />
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.button, styles.signOutButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
          onPress={handleSignOut}
        >
          <View style={[styles.buttonContent, { justifyContent: 'center' }]}>
            <Ionicons name="log-out-outline" size={24} color={theme.primary} />
            <Text style={[styles.buttonText, styles.signOutText, { color: theme.primary, flex: 0, marginLeft: 8 }]}>
              {isEnglish ? "Sign Out" : "Cerrar Sesión"}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Espacio extra al final */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  headerSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 1,
  },
  // Button container style
  button: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
  },
  // Inner content to enforce row layout
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allows space for sibling elements (like Switch)
  },
  toggleRow: {
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
    flex: 1, // Pushes the arrow/content to the far right
  },
  signOutButton: {
    marginTop: 10,
  },
  signOutText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  profileCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  profileInfo: {
    flexDirection: 'row', // Ensures horizontal layout for profile
    alignItems: 'center',
  },
  realProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '600',
  },
});