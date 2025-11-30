// SettingsScreen.jsx (o CustomizeScreen.jsx)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { THEME_NAMES, THEMES } from '../constants/colors';

const SettingsScreen = () => {
  const { theme, setTheme, currentThemeName } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Elige tu Tema 🎨
      </Text>
      
      <View style={styles.themeSelector}>
      {Object.keys(THEMES).map((name) => (
          <TouchableOpacity
            key={name}
            style={[
              styles.themeOption,
              { backgroundColor: THEMES[name].primary }, // Usa el color primary del tema
              name === currentThemeName && { borderColor: theme.primary, borderWidth: 4 } // Destaca el seleccionado
            ]}
            onPress={() => setTheme(name)}
          >
            <Text style={styles.themeText}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  themeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  themeOption: {
    width: 100, // Ajusta el tamaño
    height: 100,
    borderRadius: 15,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // Sombra simple (ejemplo para React Native)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  themeText: {
    color: 'white', // Generalmente el texto sobre el color primario es blanco o muy claro
    fontWeight: 'bold',
  },
});

export default SettingsScreen;