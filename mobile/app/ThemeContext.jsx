// ThemeContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { THEMES } from '../constants/colors'; // <-- Asegura esta ruta
// Si ThemeContext.jsx está en el mismo nivel que constants, usa:
// import { THEMES } from './constants/colors';

const THEME_STORAGE_KEY = '@MyApp:themeName';

// 1. Crea el Contexto
const ThemeContext = createContext();

// Hook personalizado para usar el tema fácilmente en cualquier componente
export const useTheme = () => useContext(ThemeContext);

// 2. Componente Proveedor
export const ThemeProvider = ({ children }) => {
  const [currentThemeName, setCurrentThemeName] = useState('coffee'); 
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // Carga el tema guardado al iniciar la app
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedThemeName = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedThemeName && THEMES[storedThemeName]) {
          setCurrentThemeName(storedThemeName);
        }
      } catch (error) {
        console.warn("Error cargando el tema:", error);
      } finally {
        setIsThemeLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Función para cambiar el tema y guardarlo
  const setTheme = async (themeName) => {
    if (THEMES[themeName]) {
      setCurrentThemeName(themeName);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, themeName);
      } catch (error) {
        console.warn("Error guardando el tema:", error);
      }
    }
  };

  const theme = THEMES[currentThemeName]; 
  const contextValue = { theme, currentThemeName, setTheme };

  // Retorna nulo o un componente de carga si el tema aún no se ha cargado
  if (!isThemeLoaded) {
    return null; 
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};