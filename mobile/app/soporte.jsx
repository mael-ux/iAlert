import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useTheme } from './ThemeContext'; 

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
    <ScrollView style={{ backgroundColor: theme.background }}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Soporte iAlert — Contactos</Text>
        <Text style={[styles.subtitle, { color: theme.textLight }]}>
          Presiona cualquier correo electrónico para iniciar un mensaje.
        </Text>

        {/* Mapeo de las categorías de contacto */}
        {contacts.map((group, index) => (
          <View key={index} style={styles.contactGroup}>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
  },
  contactGroup: {
    marginBottom: 25,
    paddingHorizontal: 10,
    borderLeftWidth: 3, // Línea decorativa
    borderLeftColor: '#007aff', // Usar un color fijo o theme.primary
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    paddingLeft: 10,
  },
  personRow: {
    marginBottom: 10,
    paddingLeft: 10,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emailText: {
    fontSize: 14,
    textDecorationLine: 'underline', // Subrayado para indicar que es clickeable
    marginTop: 2,
  }
});