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
  const topicPrimary = addAlphaToColor(primary, 0.7);
  const topicSecondary = addAlphaToColor(secondary, 0.6);
  const topicBright = addAlphaToColor(bright, 0.5);
  const topicComplementary = addAlphaToColor(complementary, 0.3);
  
  // Next topic colors (for bottom of gradient)
  const nextTopicPrimary = nextTopic ? addAlphaToColor(nextColors.primary, 0.3) : 'transparent';
  const nextTopicSecondary = nextTopic ? addAlphaToColor(nextColors.secondary, 0.25) : 'transparent';
  const nextTopicBright = nextTopic ? addAlphaToColor(nextColors.bright, 0.2) : 'transparent';
  
  // Very dark background colors with a hint of the topic's hue
  const darkened = adjustHexBrightness(secondary, -90);
  const darkerBackground = '#020203';
  const darkestBackground = '#010102';
  
  // Different implementations for iOS, Android, and web for best compatibility
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <View style={[styles.container, style]}>
        {/* Base dark background */}
        <View style={[styles.baseGradient, { backgroundColor: darkestBackground }]} />
        
        {/* Main top-left radial effect */}
        <View style={styles.radialContainer}>
          <LinearGradient
            colors={[
              topicPrimary, 
              'transparent'
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0.8 }}
            style={[styles.topLeftRadial, { opacity: 0.8 }]}
          />
        </View>
        
        {/* Top-right radial effect */}
        <View style={styles.radialContainer}>
          <LinearGradient
            colors={[
              topicSecondary,
              'transparent'
            ]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 0.8 }}
            style={[styles.topRightRadial, { opacity: 0.6 }]}
          />
        </View>
        
        {/* Bottom radial effect - hint of next topic's color (from bottom-right diagonal) */}
        {nextTopic && (
          <View style={styles.radialContainer}>
            <LinearGradient
              colors={[
                nextTopicPrimary,
                'transparent'
              ]}
              start={{ x: 0.8, y: 1 }}
              end={{ x: 0.2, y: 0.4 }}
              style={[styles.bottomDiagonalRadial, { opacity: 0.35 }]}
            />
          </View>
        )}
        
        {/* Additional diagonal gradient for next topic color */}
        {nextTopic && (
          <View style={styles.radialContainer}>
            <LinearGradient
              colors={[
                'transparent',
                addAlphaToColor(nextColors.bright, 0.25)
              ]}
              start={{ x: 0.2, y: 0.4 }}
              end={{ x: 0.9, y: 0.9 }}
              style={[styles.additionalDiagonalGradient, { opacity: 0.3 }]}
            />
          </View>
        )}
        
        {/* Center glow radial effect */}
        <View style={styles.centerRadialContainer}>
          <LinearGradient
            colors={[
              addAlphaToColor(topicBright, 0.3),
              'transparent'
            ]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={[styles.centerRadial, { opacity: 0.5 }]}
          />
        </View>
      </View>
    );
  } else {
    // For web, use radial gradients
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
            backgroundColor: darkestBackground,
            zIndex: 1
          } as any}
        />
        
        {/* Main radial gradient from top left */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 0% 0%, ${topicPrimary} 0%, transparent 60%)`,
            opacity: 0.8,
            zIndex: 2,
            filter: 'blur(30px)'
          } as any}
        />
        
        {/* Secondary radial gradient from top right */}
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 100% 0%, ${topicSecondary} 0%, transparent 60%)`,
            opacity: 0.6,
            zIndex: 3,
            filter: 'blur(30px)'
          } as any}
        />
        
        {/* Diagonal gradient from bottom-right with next topic color */}
        {nextTopic && (
          <View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(125deg, transparent 60%, ${nextTopicPrimary} 100%)`,
              opacity: 0.35,
              zIndex: 4,
              filter: 'blur(35px)'
            } as any}
          />
        )}
        
        {/* Additional diagonal gradient using bright next topic color */}
        {nextTopic && (
          <View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, transparent 70%, ${addAlphaToColor(nextColors.bright, 0.25)} 100%)`,
              opacity: 0.3,
              zIndex: 5,
              filter: 'blur(25px)'
            } as any}
          />
        )}
        
        {/* Central glow effect */}
        <View 
          style={{
            position: 'absolute',
            top: '20%',
            left: '20%',
            right: '20%',
            bottom: '20%',
            background: `radial-gradient(circle at center, ${addAlphaToColor(topicBright, 0.3)} 0%, transparent 70%)`,
            opacity: 0.5,
            zIndex: 6,
            filter: 'blur(40px)'
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
  radialContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  topLeftRadial: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    left: '-50%',
    top: '-50%',
    borderRadius: 1000,
    transform: [{ scale: 1.5 }],
  },
  topRightRadial: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    right: '-50%',
    top: '-50%',
    borderRadius: 1000,
    transform: [{ scale: 1.5 }],
  },
  bottomRadial: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    left: '-25%',
    bottom: '-50%',
    borderRadius: 1000,
    transform: [{ scale: 1.2 }],
  },
  bottomDiagonalRadial: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    right: '-25%',
    bottom: '-30%',
    borderRadius: 1000,
    transform: [{ scale: 1.3 }],
  },
  additionalDiagonalGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  centerRadialContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  centerRadial: {
    width: '120%',
    height: '120%',
    borderRadius: 1000,
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
    width: '150%',
    height: '150%',
    left: '-25%',
    top: '-25%',
  }
});

export default NeonGradientBackground; 