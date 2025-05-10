import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { NeonColors } from '@/constants/NeonColors';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/context/ThemeContext';

interface NeonProfileHeaderProps {
  style?: object;
}

const { width } = Dimensions.get('window');

export const NeonProfileHeader: React.FC<NeonProfileHeaderProps> = ({
  style
}) => {
  const { isNeonTheme } = useTheme();
  
  // Add CSS keyframes animation for web platform
  useEffect(() => {
    if (Platform.OS === 'web' && isNeonTheme) {
      // Create a style element for the pulsing glow effect
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        @keyframes profileGlow {
          0% {
            opacity: 0.6;
            background-position: 0% 50%;
          }
          50% {
            opacity: 0.9;
            background-position: 100% 50%;
          }
          100% {
            opacity: 0.6;
            background-position: 0% 50%;
          }
        }
        
        .neon-profile-header {
          background: linear-gradient(60deg, 
            ${NeonColors.dark.primary}20, 
            ${NeonColors.dark.secondary}20, 
            ${NeonColors.dark.primary}20
          );
          background-size: 200% 200%;
          animation: profileGlow 15s ease infinite;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        document.head.removeChild(styleEl);
      };
    }
  }, [isNeonTheme]);
  
  // If not using neon theme, return empty view
  if (!isNeonTheme) {
    return null;
  }
  
  if (Platform.OS === 'web') {
    return (
      <View 
        style={[styles.container, style]}
        {...(Platform.OS === 'web' ? { className: 'neon-profile-header' } : {})}
      >
        <View style={styles.horizontalLine} />
      </View>
    );
  }
  
  // For native platforms, use LinearGradient
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[
          `${NeonColors.dark.primary}40`,
          `${NeonColors.dark.secondary}40`,
          `${NeonColors.dark.primary}40`
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
      <View style={styles.horizontalLine} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 150,
    width: '100%',
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 20, 0.8)',
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  horizontalLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: NeonColors.dark.primary,
    shadowColor: NeonColors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 0 8px ${NeonColors.dark.primary}, 0 0 4px ${NeonColors.dark.primary}`,
    } as any : {}),
  }
});

export default NeonProfileHeader; 