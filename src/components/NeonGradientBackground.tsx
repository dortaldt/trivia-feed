import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NeonCategoryColors, getCategoryColor } from '@/constants/NeonColors';
import { useTheme } from '@/src/context/ThemeContext';

interface NeonGradientBackgroundProps {
  topic: string;
  nextTopic?: string; // Added new prop for the next item's topic
  style?: object;
}

export const NeonGradientBackground: React.FC<NeonGradientBackgroundProps> = ({
  topic,
  nextTopic,
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
  
  // Get the next topic's colors - used for seamless transition
  const getNextTopicColors = () => {
    if (!isNeonTheme || !nextTopic) {
      return { 
        primary: 'transparent', 
        secondary: 'transparent', 
        bright: 'transparent', 
        complementary: 'transparent' 
      };
    }
    
    const nextColorInfo = getCategoryColor(nextTopic);
    const nextPrimaryColor = nextColorInfo.hex || '#00BBFF';
    
    return {
      primary: nextPrimaryColor,
      secondary: adjustHexBrightness(nextPrimaryColor, -15),
      bright: adjustHexBrightness(nextPrimaryColor, 30),
      complementary: getComplementaryColor(nextPrimaryColor)
    };
  };
  
  const { primary, secondary, bright, complementary } = getTopicColors();
  const nextColors = getNextTopicColors();
  
  // Create colors for the background gradient with more organic alpha values
  // Reduce opacity of all colors for more subtle effect
  const topicPrimary = addAlphaToColor(primary, 0.5); // Reduced from 0.85
  const topicSecondary = addAlphaToColor(secondary, 0.4); // Reduced from 0.7
  const topicBright = addAlphaToColor(bright, 0.3); // Reduced from 0.65
  const topicComplementary = addAlphaToColor(complementary, 0.2); // Reduced from 0.4
  
  // Next topic colors (for bottom of gradient)
  const nextTopicPrimary = nextTopic ? addAlphaToColor(nextColors.primary, 0.5) : 'transparent'; // Reduced from 0.85
  const nextTopicSecondary = nextTopic ? addAlphaToColor(nextColors.secondary, 0.4) : 'transparent'; // Reduced from 0.7
  const nextTopicBright = nextTopic ? addAlphaToColor(nextColors.bright, 0.3) : 'transparent'; // Reduced from 0.65
  
  // Very dark background colors with a hint of the topic's hue
  const darkened = adjustHexBrightness(secondary, -90);
  const darkerBackground = '#020203'; // Even darker background (was #050508)
  const darkestBackground = '#010102'; // Almost pure black (was #020204)
  
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
        
        {/* Main diagonal organic gradient - now ends with next topic's color - full width */}
        <LinearGradient
          colors={[
            topicPrimary, 
            'transparent',
            nextTopic ? nextTopicPrimary : topicComplementary
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }} // Extended to full edge
          locations={[0, 0.4, 0.8]}
          style={[styles.diagonalGradient, { opacity: 0.6 }]} // Kept reduced opacity
        />
        
        {/* Secondary corner gradients for organic feel - full width */}
        <LinearGradient
          colors={[
            'transparent',
            topicSecondary
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0.7 }} // Extended to full edge
          locations={[0.6, 1.0]}
          style={[styles.cornerGradient, { opacity: 0.5 }]} // Kept reduced opacity
        />
        
        {/* Bottom gradient to next topic's color - full width */}
        {nextTopic && (
          <LinearGradient
            colors={[
              'transparent',
              nextTopicSecondary
            ]}
            start={{ x: 0, y: 0.6 }} // Adjusted for better edge coverage
            end={{ x: 1, y: 1 }} // Extended to full edge
            locations={[0.6, 1.0]}
            style={[styles.bottomGradient, { opacity: 0.4 }]} // Kept reduced opacity
          />
        )}
        
        {/* Soft vertical gradient for added dimension - full height */}
        <LinearGradient
          colors={[
            addAlphaToColor(topicBright, 0.1),
            'transparent',
            nextTopic ? addAlphaToColor(nextColors.complementary, 0.15) : addAlphaToColor(complementary, 0.15)
          ]}
          start={{ x: 0.5, y: 0 }} // Extended to full top
          end={{ x: 0.5, y: 1 }} // Extended to full bottom
          locations={[0, 0.5, 1.0]}
          style={[styles.verticalGradient, { opacity: 0.5 }]} // Kept reduced opacity
        />
        
        {/* Blurred glow accent - larger but still subtle */}
        <LinearGradient
          colors={[
            'transparent',
            addAlphaToColor(topicBright, 0.1),
            'transparent'
          ]}
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 0.7, y: 0.7 }}
          locations={[0.3, 0.5, 0.7]}
          style={[styles.glowGradient, { opacity: 0.4 }]} // Kept reduced opacity
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
        
        {/* Main diagonal gradient with organic feel - full screen */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${topicPrimary} 0%, transparent 40%, ${nextTopic ? nextTopicPrimary : topicComplementary} 80%)`,
            opacity: 0.5, // Kept reduced opacity
            zIndex: 2,
            filter: 'blur(25px)'
          } as any}
        />
        
        {/* Secondary gradient from opposite corner - full screen */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(45deg, transparent 60%, ${topicSecondary} 100%)`,
            opacity: 0.4, // Kept reduced opacity
            zIndex: 3,
            filter: 'blur(30px)'
          } as any}
        />
        
        {/* Bottom gradient to next topic's color - full width */}
        {nextTopic && (
          <View 
            style={{
              position: 'absolute',
              top: '50%', // Lower position but full width
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(to bottom, transparent 30%, ${nextTopicSecondary} 100%)`,
              opacity: 0.4, // Kept reduced opacity
              zIndex: 4,
              filter: 'blur(25px)'
            } as any}
          />
        )}
        
        {/* Soft vertical gradient for added dimension - full screen */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(to bottom, ${addAlphaToColor(topicBright, 0.1)} 0%, transparent 50%, ${nextTopic ? addAlphaToColor(nextColors.complementary, 0.15) : addAlphaToColor(complementary, 0.15)} 100%)`,
            opacity: 0.4, // Kept reduced opacity
            zIndex: 4,
            filter: 'blur(20px)'
          } as any}
        />
        
        {/* Central soft glow - larger area */}
        <View 
          style={{
            position: 'absolute',
            top: '20%',
            left: '20%',
            right: '20%',
            bottom: '20%',
            background: `radial-gradient(ellipse at center, ${addAlphaToColor(topicBright, 0.1)} 0%, transparent 70%)`,
            opacity: 0.4, // Kept reduced opacity
            zIndex: 5,
            filter: 'blur(30px)'
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
  bottomGradient: {
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