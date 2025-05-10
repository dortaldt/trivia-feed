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

  // Animate the glow and scale
  useEffect(() => {
    // Only run animation if neon theme is active
    if (isNeonTheme) {
      // Create pulsing glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          })
        ])
      ).start();

      // Create subtle scaling animation
      Animated.loop(
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
      ).start();
    }

    return () => {
      glowAnimation.stopAnimation();
      scaleAnimation.stopAnimation();
    };
  }, [isNeonTheme]);

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

  // If not using neon theme, render the default loading screen
  if (!isNeonTheme) {
    return null;
  }

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
                : {
                    shadowColor: primaryColor,
                    shadowRadius: glowIntensity,
                    shadowOpacity: glowOpacity,
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
    backgroundColor: '#121212', // Dark background for neon theme
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMarkContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: Platform.OS === 'web' ? 2 : 0,
    borderColor: NeonColors.dark.primary,
    elevation: 10,
    shadowOffset: { width: 0, height: 0 },
    position: 'relative',
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    borderWidth: 2,
    opacity: 0.7,
  },
  questionMark: {
    fontSize: 80,
    fontWeight: 'bold',
    color: NeonColors.dark.primary,
    textShadowColor: NeonColors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 20,
    color: '#FFFFFF',
    textShadowColor: NeonColors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  progressBarContainer: {
    width: '80%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  },
});

export default NeonLoadingScreen; 