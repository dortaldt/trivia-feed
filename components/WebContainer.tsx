import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';

interface WebContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
}

/**
 * A container component that applies max-width and centering only on web platforms
 * On mobile platforms, it simply renders children without constraints
 */
export function WebContainer({ children, style, maxWidth = 800 }: WebContainerProps) {
  // Only apply max-width constraints on web platform
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { maxWidth }, style]}>
        {children}
      </View>
    );
  }

  // On mobile platforms, just render children without constraints
  return <View style={[styles.fullWidth, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: '100%', 
    alignSelf: 'center',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    // Add subtle box shadow only on web
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.05)',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
    } : {}),
  },
  fullWidth: {
    width: '100%',
    flex: 1,
  },
});