// mobile/app/(tabs)/user.jsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { COLORS } from '../../constants/colors';

// Reusable navigation button component
const SettingsButton = ({ href, title, icon }) => (
  <Link href={href} asChild>
    <TouchableOpacity style={styles.button}>
      <Ionicons name={icon} size={24} color={COLORS.primary} />
      <Text style={styles.buttonText}>{title}</Text>
      <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
  </Link>
);

export default function UserScreen() {
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();
  
  // Estado para el toggle de idioma (Lógica visual por ahora)
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
    setIsEnglish(previousState => !previousState);
    // Aquí iría la lógica real para cambiar el contexto de idioma más adelante
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. SECCIÓN DE USUARIO (MovidA AL PRINCIPIO) */}
        <View style={styles.headerSection}>
          <Link href="/editusuario" asChild>
            <TouchableOpacity style={styles.profileCard}>
              <View style={styles.profileInfo}>
                {/* Lógica para mostrar FOTO REAL o ICONO por defecto */}
                {user?.imageUrl ? (
                  <Image 
                    source={{ uri: user.imageUrl }} 
                    style={styles.realProfileImage} 
                  />
                ) : (
                  <Ionicons name="person-circle-outline" size={60} color={COLORS.primary} />
                )}
                
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Usuario'}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {user?.primaryEmailAddress?.emailAddress || 'No email'}
                  </Text>
                  <Text style={styles.editProfileText}>Editar perfil</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          </Link>
        </View>

        {/* 2. App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isEnglish ? 'App Settings' : 'Configuración'}</Text>
          
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
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowLeft}>
              <Ionicons name="language-outline" size={24} color={COLORS.primary} />
              <Text style={styles.buttonText}>
                {isEnglish ? "Language: English" : "Idioma: Español"}
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: COLORS.primary }}
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
          <Text style={styles.sectionTitle}>{isEnglish ? 'More' : 'Más'}</Text>
          
          <SettingsButton
            href="/Nasa"
            title="Galería NASA"
            icon="planet-outline"
          />
          
          <SettingsButton
            href="/dudas"
            title="Preguntas Frecuentes (FAQ)"
            icon="help-circle-outline"
          />
          
          <SettingsButton
            href="/soporte"
            title="Soporte"
            icon="mail-outline"
          />
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.buttonText, styles.signOutText]}>
            {isEnglish ? "Sign Out" : "Cerrar Sesión"}
          </Text>
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
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 60, // Espacio para el header seguro
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
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 1,
  },
  button: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16, // Bordes más redondeados
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)', // Borde muy sutil
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  // Estilo específico para la fila del toggle
  toggleRow: {
    backgroundColor: COLORS.card,
    padding: 12, // Un poco menos de padding vertical para el switch
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary,
    marginTop: 10,
    justifyContent: 'center',
  },
  signOutText: {
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginLeft: 8, // Ajuste pequeño
  },
  profileCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Estilo para la imagen real
  realProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30, // Circular
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileEmail: {
    color: COLORS.textLight,
    fontSize: 14,
    marginBottom: 4,
  },
  editProfileText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});