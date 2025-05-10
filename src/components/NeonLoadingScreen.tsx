import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/src/context/ThemeContext';
import { NeonColors } from '@/constants/NeonColors';
import { LinearGradient } from 'expo-linear-gradient';

interface NeonLoadingScreenProps {
  progress?: number;
  message?: string;
}

export const NeonLoadingScreen: React.FC<NeonLoadingScreenProps> = ({ 
  progress, 
  message = 'Loading...'
}) => {
  const { isNeonTheme, colorScheme } = useTheme();
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;

  // Store animation references for proper cleanup
  const glowAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const scaleAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Animate the glow and scale
  useEffect(() => {
    // Only run animation if neon theme is active
    if (isNeonTheme) {
      // Create pulsing glow animation
      glowAnimationRef.current = Animated.loop(
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
      
      glowAnimationRef.current.start();

      // Create subtle scaling animation
      scaleAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.05,
            duration: 1200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 0.95,
            duration: 1200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          })
        ])
      );
      
      scaleAnimationRef.current.start();
    }

    return () => {
      // Proper cleanup of animations
      if (glowAnimationRef.current) {
        glowAnimationRef.current.stop();
        glowAnimationRef.current = null;
      }
      
      if (scaleAnimationRef.current) {
        scaleAnimationRef.current.stop();
        scaleAnimationRef.current = null;
      }
    };
  }, [isNeonTheme, glowAnimation, scaleAnimation]);

  // Determine colors based on the neon theme
  const primaryColor = NeonColors.dark.primary;
  const secondaryColor = NeonColors.dark.secondary;
  
  // Interpolate animation values
  const glowIntensity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 15] // Shadow/glow radius range
  });
  
  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.9] // Shadow/glow opacity range
  });

  // If not using neon theme, return null
  if (!isNeonTheme) {
    return null;
  }

  // iOS-optimized shadow properties
  const iosShadowStyle = Platform.OS === 'ios' ? {
    shadowColor: primaryColor,
    shadowRadius: 10,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
  } : {};

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Animated question mark */}
        <Animated.View 
          style={[
            styles.questionMarkContainer,
            {
              transform: [{ scale: scaleAnimation }],
              ...(Platform.OS === 'web' 
                ? {
                    boxShadow: `0 0 ${glowIntensity.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['3px', '15px']
                    })} ${primaryColor}`,
                  } as any
                : Platform.OS === 'ios'
                  ? iosShadowStyle
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
          <ThemedText style={styles.questionMark}>?</ThemedText>
          {Platform.OS !== 'web' && (
            <LinearGradient
              colors={[primaryColor, secondaryColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBorder}
            />
          )}
        </Animated.View>

        {/* Loading message */}
        <ThemedText style={styles.loadingText}>{message}</ThemedText>
        
        {/* Loading progress bar */}
        {progress !== undefined && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${progress * 100}%`, backgroundColor: primaryColor }
                ]} 
              />
            </View>
            <ThemedText style={styles.progressText}>{Math.round(progress * 100)}%</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A14', // Very dark blue-black instead of pure black
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMarkContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0A0A14', // Very dark blue-black background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: Platform.OS === 'web' ? 2.5 : 0, // Thicker border on web
    borderColor: NeonColors.dark.primary,
    elevation: Platform.OS === 'android' ? 10 : 0,
    shadowOffset: { width: 0, height: 0 },
    position: 'relative',
    overflow: 'hidden', // Fix for iOS gradient border overflow
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    borderWidth: 2.5, // Thicker border for more intense glow
    opacity: 0.85, // Slightly increased opacity for more vibrancy
    zIndex: -1, // Ensure gradient is behind content on iOS
  },
  questionMark: {
    fontSize: 80,
    fontWeight: 'bold',
    color: NeonColors.dark.primary,
    textShadowColor: NeonColors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15, // Increased glow radius
    zIndex: 1, // Ensure text is above gradient on iOS
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 20,
    color: '#FFFFFF',
    textShadowColor: NeonColors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8, // Increased text glow
  },
  progressBarContainer: {
    width: '80%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Dimmer background
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFFFFF',
    textShadowColor: NeonColors.dark.primary, // Add glow to progress text
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});

export default NeonLoadingScreen; 