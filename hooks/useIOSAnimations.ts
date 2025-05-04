import { useRef } from 'react';
import { 
  Animated, 
  Easing, 
  Platform,
  ViewStyle
} from 'react-native';

/**
 * Hook that provides iOS-style animations for UI components like
 * tooltips, popovers, and menus.
 */
export function useIOSAnimations() {
  // Animation values
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const springValue = useRef(new Animated.Value(0.9)).current;

  // iOS-style spring animation for tooltips and popovers
  const animateIn = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      // iOS uses slightly bouncy animations for UI elements
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  // iOS-style fade out with a slight scale down
  const animateOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 5,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(callback);
  };

  // iOS-style spring animation for buttons/interactive elements
  const springAnimation = (callback?: () => void) => {
    Animated.sequence([
      Animated.timing(springValue, {
        toValue: 0.93,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(springValue, {
        toValue: 1,
        friction: 3, // Bouncier spring
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  // Reset animations to initial state
  const resetAnimations = () => {
    opacity.setValue(0);
    scale.setValue(0.95);
    translateY.setValue(10);
    springValue.setValue(1);
  };

  // Animated styles for popups (tooltips, menus, popovers)
  const getPopupAnimatedStyle = (fromTop: boolean = false): ViewStyle => ({
    opacity,
    transform: [
      { scale },
      { translateY: fromTop ? Animated.multiply(translateY, -1) : translateY }
    ]
  });

  // Animated style for button presses
  const getButtonPressAnimatedStyle = (): ViewStyle => ({
    transform: [{ scale: springValue }]
  });

  return {
    opacity,
    scale,
    translateY,
    springValue,
    animateIn,
    animateOut,
    springAnimation,
    resetAnimations,
    getPopupAnimatedStyle,
    getButtonPressAnimatedStyle,
    // Helper to check if we should use iOS animations
    isIOS: Platform.OS === 'ios'
  };
}