import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { COLORS } from '../../constants/colors';

// This is a wrapper for a navigation button
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

  // --- THIS FUNCTION WAS MISSING ---
  const handleSignOut = async () => {
    if (!isSignedIn) return;
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };
  // ---------------------------------

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. Our Custom "Manage Zones" Button */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <SettingsButton
            href="/zones" // We will create this page next
            title="Manage Zones of Interest"
            icon="map-outline"
          />
        </View>

        {/* 2. User Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.profileCard}>
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
            </View>
          </View>
        </View>

        {/* 3. Our Custom "Sign Out" Button */}
        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={handleSignOut}
        >
          {/* --- THIS CONTENT WAS MISSING --- */}
          <Ionicons name="log-out-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.buttonText, styles.signOutText]}>
            Sign Out
          </Text>
          {/* --------------------------------- */}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Use your theme color
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
    flex: 1, // Pushes chevron to the end
  },
  signOutButton: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary,
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
