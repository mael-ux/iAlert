// mobile/app/components/safeAreaWrapper.jsx
// Universal safe area wrapper for all screens
import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SafeAreaWrapper({ 
  children, 
  style, 
  edges = ['top', 'bottom', 'left', 'right'],
  statusBarStyle = 'light-content',
  backgroundColor = 'transparent'
}) {
  const insets = useSafeAreaInsets();
  
  const paddingStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <>
      <StatusBar 
        barStyle={statusBarStyle}
        backgroundColor={backgroundColor}
        translucent={Platform.OS === 'android'}
      />
      <View style={[styles.container, paddingStyle, style]}>
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