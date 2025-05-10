import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NeonCategoryColors } from '@/constants/NeonColors';
import { useTheme } from '@/src/context/ThemeContext';

interface NeonGradientBackgroundProps {
  category: string;
  style?: object;
}

export const NeonGradientBackground: React.FC<NeonGradientBackgroundProps> = ({
  category,
  style
}) => {
  const { isNeonTheme } = useTheme();
  
  // Get the neon colors for this category, or use default if not found
  const getCategoryColors = () => {
    // If not in neon theme, return empty colors (will be transparent)
    if (!isNeonTheme) return { primary: 'transparent', secondary: 'transparent' };
    
    // Try to get direct match
    if (NeonCategoryColors[category]) {
      return NeonCategoryColors[category];
    }
    
    // Try to find a partial match
    const partialMatch = Object.keys(NeonCategoryColors).find(key => 
      category.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(category.toLowerCase())
    );
    
    if (partialMatch) {
      return NeonCategoryColors[partialMatch];
    }
    
    // Return default color if no match found
    return NeonCategoryColors.default || { primary: '#00FFFF', secondary: '#FF00FF' };
  };
  
  const { primary, secondary } = getCategoryColors();
  
  // Create darker versions of the colors for the background gradient
  const darkenedPrimary = addAlphaToColor(primary, 0.6);
  const darkenedSecondary = addAlphaToColor(secondary, 0.6);
  const darkBackground = '#0A0A14'; // Very dark blue-black
  
  // Different implementations for iOS, Android, and web for best compatibility
  if (Platform.OS === 'ios') {
    // iOS-specific implementation with nested gradients
    return (
      <View style={[styles.container, style]}>
        {/* Base dark background with subtle radial feel */}
        <LinearGradient
          colors={['#0A0A14', '#080810', '#050508']} 
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.baseGradient}
        />
        
        {/* Category color gradient overlay */}
        <LinearGradient
          colors={[darkBackground, darkenedPrimary, darkenedSecondary, darkBackground]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.colorGradient}
          locations={[0, 0.3, 0.7, 1.0]}
        />
      </View>
    );
  } else if (Platform.OS === 'android') {
    // Android implementation with nested Views
    return (
      <View style={[styles.container, style]}>
        {/* Base dark background with subtle radial feel */}
        <LinearGradient
          colors={['#0A0A14', '#080810', '#050508']} 
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.baseGradient}
        />
        
        {/* Category color gradient overlay */}
        <LinearGradient
          colors={[darkBackground, darkenedPrimary, darkenedSecondary, darkBackground]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.colorGradient}
          locations={[0, 0.3, 0.7, 1.0]}
        />
      </View>
    );
  } else {
    // For web, use CSS gradients with multiple layers
    return (
      <View 
        style={[
          styles.container, 
          style,
          { 
            background: `radial-gradient(circle at 50% 50%, #0A0A14, #080810 70%, #050508 100%)`,
            // Add a second gradient layer using a pseudo element in CSS
            position: 'relative',
          }
        ]} 
      >
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `linear-gradient(135deg, #0A0A14 0%, ${darkenedPrimary} 30%, ${darkenedSecondary} 70%, #0A0A14 100%)`,
            opacity: 0.75,
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  baseGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  colorGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.75,
  }
});

export default NeonGradientBackground; 