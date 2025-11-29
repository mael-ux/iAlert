// mobile/app/ThemeContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { THEMES } from '../constants/colors';

const THEME_STORAGE_KEY = '@MyApp:themeName';
const ThemeContext = createContext();

// Provider Component - Changed to function declaration
export function ThemeProvider({ children }) {
  const [currentThemeName, setCurrentThemeName] = useState('coffee'); 
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

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

  if (!isThemeLoaded) {
    return null; 
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export default ThemeProvider;