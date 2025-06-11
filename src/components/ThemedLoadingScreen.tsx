import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform, Image, ViewStyle } from 'react-native';
import { Surface } from 'react-native-paper';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/src/context/ThemeContext';
import LoadingBar from '@/src/components/ui/LoadingBar';
import { LinearGradient } from 'expo-linear-gradient';
import { NeonColors } from '@/constants/NeonColors';

const topicConfig = require('../../app-topic-config.js');

interface ThemedLoadingScreenProps {
  message?: string;
  style?: ViewStyle;
}

// Function to get the appropriate app icon based on active topic
const getAppIcon = () => {
  const { activeTopic } = topicConfig;
  
  // If no active topic or default, use default icon
  if (!activeTopic || activeTopic === 'default') {
    return require('../../assets/images/app-icon.png');
  }
  
  // Try to load topic-specific icon, fall back to default if not found
  try {
    // Following naming convention: app-icon-{topic}.png
    switch (activeTopic) {
      case 'music':
        return require('../../assets/images/app-icon-music.png');
      case 'nineties':
        return require('../../assets/images/app-icon-nineties.png');
      case 'friends':
      case 'friends-tv':
        return require('../../assets/images/app-icon-friends.png');
      case 'science':
        return require('../../assets/images/app-icon-science.png');
      case 'history':
        return require('../../assets/images/app-icon-history.png');
      case 'movies-and-tv':
        return require('../../assets/images/app-icon-movies-and-tv.png');
      // Add new topics here following the pattern: app-icon-{topic}.png
      default:
        return require('../../assets/images/app-icon.png');
    }
  } catch (error) {
    // If topic-specific icon doesn't exist, fall back to default
    return require('../../assets/images/app-icon.png');
  }
};

// Function to get the appropriate splash icon based on active topic
export const getSplashIcon = () => {
  const { activeTopic } = topicConfig;
  
  // If no active topic or default, use default splash icon
  if (!activeTopic || activeTopic === 'default') {
    return require('../../assets/images/splash-icon.png');
  }
  
  // Try to load topic-specific splash icon, fall back to default if not found
  try {
    // Following naming convention: splash-icon-{topic}.png
    switch (activeTopic) {
      case 'music':
        return require('../../assets/images/splash-icon-music.png');
      case 'nineties':
        return require('../../assets/images/splash-icon-nineties.png');
      case 'friends':
      case 'friends-tv':
        return require('../../assets/images/splash-icon-friends.png');
      case 'science':
        return require('../../assets/images/splash-icon-science.png');
      case 'history':
        return require('../../assets/images/splash-icon-history.png');
      case 'movies-and-tv':
        return require('../../assets/images/splash-icon-movies-and-tv.png');
      // Add new topics here following the pattern: splash-icon-{topic}.png
      default:
        return require('../../assets/images/splash-icon.png');
    }
  } catch (error) {
    // If topic-specific splash icon doesn't exist, fall back to default
    return require('../../assets/images/splash-icon.png');
  }
};

// Export the app icon function for reuse
export { getAppIcon };

export const ThemedLoadingScreen: React.FC<ThemedLoadingScreenProps> = ({ 
  message = 'Loading...',
  style
}) => {
  const { themeDefinition, currentTheme, isNeonTheme } = useTheme();
  // Always use dark mode regardless of device theme
  const colorScheme = 'dark';
  const colors = themeDefinition.colors[colorScheme];
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(0.95)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  
  // Store animation references for proper cleanup
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const glowAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Derived values for neon theme
  const primaryColor = isNeonTheme ? NeonColors[colorScheme].primary : colors.primary;
  const secondaryColor = isNeonTheme ? NeonColors[colorScheme].secondary : colors.secondary;
  const backgroundColor = isNeonTheme ? '#0A0A14' : colors.background;
  
  // Calculate glow properties for neon theme
  const glowIntensity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [5, 15]
  });
  
  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.8]
  });

  // Special shadow style for iOS
  const iosShadowStyle = Platform.OS === 'ios' ? {
    shadowColor: primaryColor,
    shadowRadius: glowIntensity,
    shadowOpacity: glowOpacity,
    shadowOffset: { width: 0, height: 0 },
  } : {};

  // Start animations
  useEffect(() => {
    // Create regular pulsing animation for the app icon
    pulseAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        })
      ])
    );
    
    pulseAnimRef.current.start();

    // Create glow animation for neon theme
    if (isNeonTheme) {
      glowAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: Platform.OS === 'web' ? false : true,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: Platform.OS === 'web' ? false : true,
          })
        ])
      );
      
      glowAnimRef.current.start();
    }

    // Clean up animations
    return () => {
      pulseAnimRef.current?.stop();
      glowAnimRef.current?.stop();
    };
  }, [isNeonTheme, colorScheme]);

  // Render different loading screen based on theme
  if (isNeonTheme) {
    // Neon theme version - now using app icon instead of question mark
    return (
      <View style={[styles.container, { backgroundColor }, style]}>
        <View style={styles.contentContainer}>
          {/* Animated app icon with neon effects */}
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: 'transparent', // Make sure there's no background
                ...(Platform.OS === 'web' 
                  ? {
                      boxShadow: `0 0 ${glowIntensity.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['3px', '15px']
                      })} ${primaryColor}`,
                    } as any
                  : Platform.OS === 'ios'
                    ? {
                        // Only apply shadow effects, no background
                        shadowColor: primaryColor,
                        shadowRadius: glowIntensity,
                        shadowOpacity: glowOpacity,
                        shadowOffset: { width: 0, height: 0 },
                        backgroundColor: 'transparent',
                      }
                    : {
                        shadowColor: primaryColor,
                        shadowRadius: glowIntensity,
                        shadowOpacity: glowOpacity,
                        shadowOffset: { width: 0, height: 0 },
                      }
                )
              }
            ]}
          >
            <Image 
              source={getAppIcon()} 
              style={[
                styles.loadingIcon, 
                { borderRadius: 20 } // Add rounded corners to the app icon
              ]}
              resizeMode="contain"
            />
            {Platform.OS !== 'ios' && Platform.OS !== 'web' && (
              <LinearGradient
                colors={[primaryColor, secondaryColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBorder}
              />
            )}
          </Animated.View>

          {/* Loading message */}
          <ThemedText 
            style={[
              styles.loadingText,
              { 
                color: colors.text,
                textShadowColor: primaryColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              }
            ]}
          >
            {message}
          </ThemedText>
          
          {/* Loading bar */}
          <LoadingBar 
            duration={3000}
            height={8}
            style={{ width: '70%', marginTop: 20 }}
            color={primaryColor}
            trackColor="rgba(255, 255, 255, 0.15)"
            loop={true}
          />
        </View>
      </View>
    );
  } else {
    // Default theme version with app icon
    return (
      <View style={[styles.container, { backgroundColor }, style]}>
        <View style={styles.contentContainer}>
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: pulseAnim }
                ]
              }
            ]}
          >
            <Image 
              source={getAppIcon()} 
              style={[
                styles.loadingIcon,
                { borderRadius: 20 } // Add rounded corners to the app icon
              ]}
              resizeMode="contain"
            />
          </Animated.View>
          
          <ThemedText style={styles.regularLoadingText}>{message}</ThemedText>
          
          <LoadingBar 
            duration={3000}
            height={10}
            style={{ width: '70%', marginTop: 20 }}
            color={colors.accent}
            loop={true}
          />
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }
    })
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Default theme styles
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent', // Ensure no background
  },
  loadingIcon: {
    width: 100,
    height: 100,
    overflow: 'hidden', // Ensure rounded corners work properly
  },
  regularLoadingText: {
    fontSize: 18,
    marginBottom: 10,
  },
  // Neon theme styles - keeping these for the border effects
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    borderWidth: 2.5,
    opacity: 0.85,
    zIndex: -1,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 20,
  },
});

export default ThemedLoadingScreen; 