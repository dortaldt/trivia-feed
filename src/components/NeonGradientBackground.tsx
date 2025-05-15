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
  // Increase alpha for more vivid colors in key areas, but use darker base
  const topicPrimary = addAlphaToColor(primary, 1.0);
  const topicSecondary = addAlphaToColor(secondary, 0.85);
  
  // Very dark background colors with a hint of the topic's hue
  const darkened = adjustHexBrightness(secondary, -90); // Very dark version of the topic color
  const darkerBackground = '#080810'; // Very dark blue-black
  const darkestBackground = '#030305'; // Almost black
  
  // Different implementations for iOS, Android, and web for best compatibility
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <View style={[styles.container, style]}>
        {/* Base dark gradient - full coverage from corner to corner */}
        <LinearGradient
          colors={[
            darkerBackground, 
            darkestBackground
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.baseGradient}
        />
        
        {/* Diagonal topic color gradient - more pronounced */}
        <LinearGradient
          colors={[
            topicPrimary, 
            'transparent',
            'transparent'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.4, 1.0]}
          style={styles.diagonalGradient}
        />
        
        {/* Secondary diagonal from bottom left */}
        <LinearGradient
          colors={[
            'transparent',
            'transparent',
            addAlphaToColor(topicSecondary, 0.6)
          ]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.7, 1.0]}
          style={styles.accentGradient}
        />
        
        {/* Optional vertical fade to add depth */}
        <LinearGradient
          colors={[
            addAlphaToColor(topicPrimary, 0.2),
            'transparent',
            darkened
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 0.3, 1.0]}
          style={styles.verticalGradient}
        />
      </View>
    );
  } else {
    // For web, use a more direct approach with explicit linear gradients
    return (
      <View style={[styles.container, style]}>
        {/* Dark base layer */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${darkerBackground} 0%, ${darkestBackground} 100%)`,
            zIndex: 1
          } as any}
        />
        
        {/* Diagonal primary gradient */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${topicPrimary} 0%, transparent 50%)`,
            opacity: 0.9,
            zIndex: 2
          } as any}
        />
        
        {/* Secondary diagonal accent */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(315deg, ${addAlphaToColor(topicSecondary, 0.8)} 0%, transparent 40%)`,
            zIndex: 3
          } as any}
        />
        
        {/* Vertical darkening gradient */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(to bottom, ${addAlphaToColor(topicPrimary, 0.1)} 0%, transparent 30%, ${darkened} 100%)`,
            zIndex: 4
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
  baseGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  diagonalGradient: {
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
  },
  verticalGradient: {
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