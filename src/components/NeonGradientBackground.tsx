import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NeonCategoryColors, getCategoryColor } from '@/constants/NeonColors';
import { useTheme } from '@/src/context/ThemeContext';

interface NeonGradientBackgroundProps {
  topic: string;
  style?: object;
}

export const NeonGradientBackground: React.FC<NeonGradientBackgroundProps> = ({
  topic,
  style
}) => {
  const { isNeonTheme } = useTheme();
  
  // Get the neon colors for this topic, or use default if not found
  const getTopicColors = () => {
    // If not in neon theme, return empty colors (will be transparent)
    if (!isNeonTheme) return { primary: 'transparent', secondary: 'transparent' };
    
    // Use the helper function to get topic color
    const colorInfo = getCategoryColor(topic);
    
    // Convert to the format expected by this component
    return { 
      primary: colorInfo.hex,
      secondary: adjustHexBrightness(colorInfo.hex, -15) // Create a slightly darker secondary color
    };
  };
  
  const { primary, secondary } = getTopicColors();
  
  // Create colors for the background gradient
  const topicPrimary = addAlphaToColor(primary, 1.0);
  const topicSecondary = addAlphaToColor(secondary, 0.9);
  
  // Dark background colors with topics' hue influence
  const darkened = adjustHexBrightness(secondary, -80); // Very dark version of the topic color
  
  // Different implementations for iOS, Android, and web for best compatibility
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <View style={[styles.container, style]}>
        {/* Full coverage gradient - extends from top to bottom */}
        <LinearGradient
          colors={[
            topicPrimary, 
            topicSecondary, 
            darkened
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.35, 1.0]}
          style={styles.fullGradient}
        />
        
        {/* Diagonal accent gradient for additional visual flair */}
        <LinearGradient
          colors={[
            addAlphaToColor(primary, 0.7), 
            'transparent'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.accentGradient}
        />
      </View>
    );
  } else {
    // For web, use a more direct approach with explicit linear gradients
    return (
      <View style={[styles.container, style]}>
        {/* Primary full-page gradient */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(to bottom, ${topicPrimary} 0%, ${topicSecondary} 35%, ${darkened} 100%)`,
            zIndex: 1
          } as any}
        />
        
        {/* Diagonal accent overlay */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${addAlphaToColor(primary, 0.7)} 0%, transparent 70%)`,
            zIndex: 2
          } as any}
        />
      </View>
    );
  }
};

// Helper function to add alpha to hex color
const addAlphaToColor = (hexColor: string, alpha: number): string => {
  // Remove the # if it exists
  const hex = hexColor.replace('#', '');
  
  // Parse the hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Return rgba color
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper function to adjust hex color brightness
const adjustHexBrightness = (hex: string, percent: number): string => {
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const adjustBrightness = (value: number) => {
    return Math.max(0, Math.min(255, value + (value * percent / 100)));
  };
  
  const newR = Math.round(adjustBrightness(r)).toString(16).padStart(2, '0');
  const newG = Math.round(adjustBrightness(g)).toString(16).padStart(2, '0');
  const newB = Math.round(adjustBrightness(b)).toString(16).padStart(2, '0');
  
  return `#${newR}${newG}${newB}`;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  fullGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  accentGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  }
});

export default NeonGradientBackground; 