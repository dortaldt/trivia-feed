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
    if (!isNeonTheme) return { primary: 'transparent', secondary: 'transparent', bright: 'transparent', complementary: 'transparent' };
    
    // Use the helper function to get topic color
    const colorInfo = getCategoryColor(topic);
    const primaryColor = colorInfo.hex || '#00BBFF'; // Fallback to a default cyan if hex is undefined
    
    // Convert to the format expected by this component
    return { 
      primary: primaryColor,
      secondary: adjustHexBrightness(primaryColor, -15), // Create a slightly darker secondary color
      bright: adjustHexBrightness(primaryColor, 30),     // Create a brighter version for glow effects
      complementary: getComplementaryColor(primaryColor) // Add complementary color for organic feel
    };
  };
  
  const { primary, secondary, bright, complementary } = getTopicColors();
  
  // Create colors for the background gradient with more organic alpha values
  const topicPrimary = addAlphaToColor(primary, 0.85);
  const topicSecondary = addAlphaToColor(secondary, 0.7);
  const topicBright = addAlphaToColor(bright, 0.65);
  const topicComplementary = addAlphaToColor(complementary, 0.4);
  
  // Very dark background colors with a hint of the topic's hue
  const darkened = adjustHexBrightness(secondary, -90);
  const darkerBackground = '#0A0A14'; // Slightly blue-tinted dark background
  const darkestBackground = '#050510'; // Almost black with slight blue tint
  
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
        
        {/* Main diagonal organic gradient */}
        <LinearGradient
          colors={[
            topicPrimary, 
            'transparent',
            topicComplementary
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 0.9]}
          style={styles.diagonalGradient}
        />
        
        {/* Secondary corner gradients for organic feel */}
        <LinearGradient
          colors={[
            'transparent',
            topicSecondary
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0.7 }}
          locations={[0.5, 1.0]}
          style={styles.cornerGradient}
        />
        
        {/* Soft vertical gradient for added dimension */}
        <LinearGradient
          colors={[
            addAlphaToColor(topicBright, 0.2),
            'transparent',
            addAlphaToColor(topicComplementary, 0.3)
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 0.5, 1.0]}
          style={styles.verticalGradient}
        />
        
        {/* Blurred glow accent */}
        <LinearGradient
          colors={[
            'transparent',
            addAlphaToColor(topicBright, 0.2),
            'transparent'
          ]}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
          locations={[0.2, 0.5, 0.8]}
          style={[styles.glowGradient, { opacity: 0.7 }]}
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
        
        {/* Main diagonal gradient with organic feel */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${topicPrimary} 0%, transparent 50%, ${topicComplementary} 90%)`,
            opacity: 0.8,
            zIndex: 2,
            filter: 'blur(30px)'
          } as any}
        />
        
        {/* Secondary gradient from opposite corner */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(45deg, transparent 50%, ${topicSecondary} 100%)`,
            opacity: 0.6,
            zIndex: 3,
            filter: 'blur(40px)'
          } as any}
        />
        
        {/* Soft vertical gradient for added dimension */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(to bottom, ${addAlphaToColor(topicBright, 0.2)} 0%, transparent 50%, ${addAlphaToColor(topicComplementary, 0.3)} 100%)`,
            opacity: 0.7,
            zIndex: 4,
            filter: 'blur(25px)'
          } as any}
        />
        
        {/* Central soft glow */}
        <View 
          style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            right: '10%',
            bottom: '10%',
            background: `radial-gradient(ellipse at center, ${addAlphaToColor(topicBright, 0.2)} 0%, transparent 70%)`,
            opacity: 0.6,
            zIndex: 5,
            filter: 'blur(50px)'
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

// Helper function to get a complementary color
const getComplementaryColor = (hex: string): string => {
  // If no hex is provided, return a default color
  if (!hex) return '#00BBFF';
  
  hex = hex.replace('#', '');
  
  // Parse the hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate complementary color (simple method)
  const compR = Math.round((255 - r) * 0.8 + r * 0.2); // Soften the contrast
  const compG = Math.round((255 - g) * 0.8 + g * 0.2);
  const compB = Math.round((255 - b) * 0.8 + b * 0.2);
  
  const newR = compR.toString(16).padStart(2, '0');
  const newG = compG.toString(16).padStart(2, '0');
  const newB = compB.toString(16).padStart(2, '0');
  
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
  cornerGradient: {
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
  },
  glowGradient: {
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