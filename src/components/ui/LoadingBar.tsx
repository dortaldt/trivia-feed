import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle, StyleProp } from 'react-native';
import { colors, borderRadius } from '../../theme';

interface LoadingBarProps {
  /**
   * Duration of the animation in milliseconds
   */
  duration?: number;
  /**
   * Color of the progress bar. Defaults to primary color.
   */
  color?: string;
  /**
   * Track color (background of the progress bar)
   */
  trackColor?: string;
  /**
   * Height of the loading bar
   */
  height?: number;
  /**
   * Border radius of the loading bar
   */
  borderRadius?: number;
  /**
   * Whether the animation should automatically start
   */
  autoStart?: boolean;
  /**
   * Whether the animation should loop
   */
  loop?: boolean;
  /**
   * Additional style for the container
   */
  style?: StyleProp<ViewStyle>;
}

const LoadingBar: React.FC<LoadingBarProps> = ({
  duration = 3000,
  color = colors.primary,
  trackColor = 'rgba(150, 150, 150, 0.2)',
  height = 8,
  borderRadius: customBorderRadius,
  autoStart = true,
  loop = false,
  style,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const barBorderRadius = customBorderRadius ?? borderRadius.md;

  useEffect(() => {
    if (autoStart) {
      startAnimation();
    }
    
    return () => {
      // Clean up animation when component unmounts
      progress.stopAnimation();
    };
  }, []);

  const startAnimation = () => {
    // Reset progress to 0
    progress.setValue(0);
    
    // Create the animation
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    });
    
    if (loop) {
      // If loop is true, create a loop animation
      Animated.loop(animation).start();
    } else {
      // Otherwise just run the animation once
      animation.start();
    }
  };

  // Calculate width for the progress bar
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View 
      style={[
        styles.container, 
        {
          height,
          backgroundColor: trackColor,
          borderRadius: barBorderRadius
        },
        style
      ]}
    >
      <Animated.View 
        style={[
          styles.progress, 
          { 
            width: progressWidth, 
            backgroundColor: color,
            borderRadius: barBorderRadius 
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '70%',
  },
  progress: {
    height: '100%',
  },
});

export default LoadingBar; 