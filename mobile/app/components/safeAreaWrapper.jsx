// mobile/app/components/safeAreaWrapper.jsx
import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext'; // Going up one level to app/ThemeContext

export default function SafeAreaWrapper({ 
  children, 
  style, 
  edges = ['top', 'bottom', 'left', 'right'],
  statusBarStyle,
  statusBarColor
}) {
  const insets = useSafeAreaInsets();
  const { theme, currentThemeName } = useTheme();
  
  // 1. Calculate Safe Area Padding
  const paddingStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  // 2. Determine Status Bar Text Color
  // If no prop passed, assume 'midnight' needs light text, others need dark text
  const dynamicBarStyle = statusBarStyle || (currentThemeName === 'midnight' ? 'light-content' : 'dark-content');

  // 3. Determine Status Bar Background (for Android)
  const dynamicStatusBarColor = statusBarColor || theme.background;

  return (
    <>
      <StatusBar 
        barStyle={dynamicBarStyle}
        backgroundColor={dynamicStatusBarColor}
        translucent={Platform.OS === 'android'}
      />
      {/* 4. Apply Theme Background to Container */}
      <View style={[styles.container, { backgroundColor: theme.background }, paddingStyle, style]}>
        {children}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});