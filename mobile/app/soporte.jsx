// mobile/app/support.jsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useTheme } from './ThemeContext'; 
import SafeAreaWrapper from './components/safeAreaWrapper'; // Added
import CustomHeader from './components/customHeader';       // Added

// Datos de contacto estructurados
const contacts = [
  {
    category: 'Soporte Técnico',
    people: [
      { name: 'Rodrigo Vizcarra', email: 'rodrigo.vizcarra0209@alumnos.udg.mx' },
      { name: 'Cristian Márquez', email: 'cristian.marquez6704@alumnos.udg.mx' },
    ],
  },
  {
    category: 'Consultas Generales',
    people: [
      { name: 'Francisco Encarnación', email: 'francisco.encarnacion9995@alumnos.udg.mx' },
    ],
  },
  {
    category: 'Contacto de Emergencia',
    people: [
      { name: 'Ana Esparza', email: 'ana.esparza8533@alumnos.udg.mx' },
    ],
  },
  {
    category: 'Equipo de Datos',
    people: [
      { name: 'Irma Valdez', email: 'irma.valdez0296@alumnos.udg.mx' },
    ],
  },
];

// Función para abrir la aplicación de correo
const handleEmailPress = (email) => {
  Linking.openURL(`mailto:${email}`);
};

export default function SupportScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Implementation */}
      <CustomHeader title="Soporte iAlert" backTo="/(tabs)/user" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: theme.textLight }]}>
          Presiona cualquier correo electrónico para iniciar un mensaje.
        </Text>

        {/* Mapeo de las categorías de contacto */}
        {contacts.map((group, index) => (
          <View 
            key={index} 
            style={[
              styles.contactGroup, 
              { borderLeftColor: theme.primary || '#007aff' } // Dynamic theme color
            ]}
          >
            <Text style={[styles.categoryTitle, { color: theme.primary || '#007aff' }]}>
              {group.category}
            </Text>
            {group.people.map((person, personIndex) => (
              <View key={personIndex} style={styles.personRow}>
                <Text style={[styles.nameText, { color: theme.text }]}>
                  {person.name}
                </Text>
                {/* TouchableOpacity para hacer el email interactivo */}
                <TouchableOpacity onPress={() => handleEmailPress(person.email)}>
                  <Text style={[styles.emailText, { color: theme.textLight }]}>
                    📧 {person.email}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
        
        {/* Extra space at bottom */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Removed paddingTop: 50 (handled by CustomHeader/SafeArea)
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  // Removed 'title' style (handled by CustomHeader)
  subtitle: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactGroup: {
    marginBottom: 25,
    paddingHorizontal: 16,
    borderLeftWidth: 4, // Slightly thicker for better visibility
    // Color is handled dynamically inline
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  personRow: {
    marginBottom: 12,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 2,
    opacity: 0.8,
  }
});