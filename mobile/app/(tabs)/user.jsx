// mobile/app/(tabs)/user.jsx - MERGED VERSION
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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

  const handleSignOut = async () => {
    if (!isSignedIn) return;
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <SettingsButton
            href="/zones"
            title="Manage Zones of Interest"
            icon="map-outline"
          />
          
          <SettingsButton
            href="/alert-settings"
            title="Configurar Alertas de Desastre"
            icon="notifications-outline"
          />
          
          <SettingsButton
            href="/idioma"
            title="Language"
            icon="language-outline"
          />
          
          <SettingsButton
            href="/personalizar"
            title="Customize App"
            icon="color-palette-outline"
          />
        </View>

        {/* NASA & Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          
          <SettingsButton
            href="/Nasa"
            title="NASA Gallery"
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

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {/* Profile Card - Tappable to edit */}
          <Link href="/editusuario" asChild>
            <TouchableOpacity style={styles.profileCard}>
              <View style={styles.profileInfo}>
                <Ionicons name="person-circle-outline" size={48} color={COLORS.primary} />
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>
                    {user?.firstName || user?.fullName || 'User'}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {user?.primaryEmailAddress?.emailAddress || 'No email'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.buttonText, styles.signOutText]}>
            Sign Out
          </Text>
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  button: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
  signOutButton: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary,
    marginTop: 12,
  },
  signOutText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    color: COLORS.textLight,
    fontSize: 14,
  },
});