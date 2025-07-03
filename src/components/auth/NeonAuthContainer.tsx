import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NeonColors } from '../../../constants/NeonColors';

interface NeonAuthContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  topicColor?: string;
}

export const NeonAuthContainer: React.FC<NeonAuthContainerProps> = ({
  children,
  style,
  topicColor
}) => {
  const primaryColor = topicColor || NeonColors.dark.primary;

  return (
    <View style={[styles.container, style]}>
      {/* Full screen gradient background */}
      <LinearGradient
        colors={[
          '#0a0f1c', // Dark blue-black
          '#1a1a2e', // Slightly lighter
          '#16213e', // Medium dark blue
          '#0a0f1c'  // Back to dark
        ]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.backgroundGradient}
      />
      
      {/* Full screen content container */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  contentContainer: {
    flex: 1,
    zIndex: 10,
  },
}); 