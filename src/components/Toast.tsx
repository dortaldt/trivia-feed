import React, { useEffect } from 'react';
import { 
  Animated, 
  StyleSheet, 
  Text, 
  View, 
  Platform,
  Dimensions
} from 'react-native';
import { useIOSAnimations } from '@/hooks/useIOSAnimations';

interface ToastProps {
  visible: boolean;
  message: string;
  duration?: number;
  onHide?: () => void;
  type?: 'success' | 'error' | 'info' | 'warning';
}

const { width } = Dimensions.get('window');

export const Toast: React.FC<ToastProps> = ({ 
  visible, 
  message, 
  duration = 2000, 
  onHide,
  type = 'info'
}) => {
  // Using our custom iOS animations hook
  const { 
    opacity, 
    scale, 
    animateIn, 
    animateOut, 
    resetAnimations 
  } = useIOSAnimations();

  useEffect(() => {
    if (visible) {
      // Animate toast in with iOS-style animations
      animateIn();

      // Automatically hide after duration
      const timer = setTimeout(() => {
        animateOut(() => {
          if (onHide) {
            onHide();
          }
          // Reset animation values after hiding
          resetAnimations();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) {
    return null;
  }

  // Determine color based on type
  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'rgba(76, 175, 80, 0.9)';
      case 'error': return 'rgba(244, 67, 54, 0.9)';
      case 'warning': return 'rgba(255, 193, 7, 0.9)';
      case 'info':
      default: return 'rgba(33, 33, 33, 0.9)';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ scale }],
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: (width - 200) / 2,
    width: 200,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  message: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
  },
});