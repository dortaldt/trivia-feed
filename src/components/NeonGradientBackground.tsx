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
    return NeonCategoryColors.default;
  };
  
  const { primary, secondary } = getCategoryColors();
  
  // Different implementations for iOS, Android, and web for best compatibility
  if (Platform.OS === 'ios') {
    return (
      <LinearGradient
        colors={[primary, secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, style]}
      />
    );
  } else if (Platform.OS === 'android') {
    return (
      <LinearGradient
        colors={[primary, secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, style]}
      />
    );
  } else {
    // For web, use CSS gradients as they're more performant
    return (
      <View 
        style={[
          styles.container, 
          style,
          { 
            backgroundImage: `linear-gradient(to bottom right, ${primary}, ${secondary})`,
            backgroundColor: primary // Fallback
          }
        ]} 
      />
    );
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.9, // Slightly transparent for better text visibility
  },
});

export default NeonGradientBackground; 