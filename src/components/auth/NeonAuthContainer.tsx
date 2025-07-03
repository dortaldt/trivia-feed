import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { NeonColors } from '../../../constants/NeonColors';
import NeonGradientBackground from '../NeonGradientBackground';
import { getActiveTopicConfig } from '../../utils/topicTheming';
import { FloatingBackground } from './FloatingBackground';

interface NeonAuthContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  topicColor?: string;
}

export const NeonAuthContainer: React.FC<NeonAuthContainerProps> = ({
  children,
  style,
  topicColor
}) => {
  // Get the active topic for the background
  const { activeTopic, topicData } = getActiveTopicConfig();
  // Add CSS keyframes animation for web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Create a style element for the auth container glow effect
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        @keyframes authContainerGlow {
          0% {
            opacity: 0.8;
            background-position: 0% 50%;
          }
          50% {
            opacity: 1;
            background-position: 100% 50%;
          }
          100% {
            opacity: 0.8;
            background-position: 0% 50%;
          }
        }
        
        .neon-auth-container {
          background: linear-gradient(-45deg, 
            ${NeonColors.dark.primary}30, 
            ${NeonColors.dark.secondary}30, 
            ${topicColor || NeonColors.dark.accent}30,
            ${NeonColors.dark.primary}30
          );
          background-size: 400% 400%;
          animation: authContainerGlow 8s ease infinite;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid ${NeonColors.dark.primary}50;
          box-shadow: 
            0 0 30px ${NeonColors.dark.primary}30,
            inset 0 0 30px ${NeonColors.dark.secondary}20;
        }
        
        .neon-auth-inner {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        document.head.removeChild(styleEl);
      };
    }
  }, [topicColor]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <NeonGradientBackground topic={topicData?.dbTopicName || activeTopic} />
        <FloatingBackground>
          <View 
            style={styles.authContainer}
            {...(Platform.OS === 'web' ? { className: 'neon-auth-container' } : {})}
          >
            <View 
              style={styles.innerContainer}
              {...(Platform.OS === 'web' ? { className: 'neon-auth-inner' } : {})}
            >
              {children}
            </View>
          </View>
        </FloatingBackground>
      </View>
    );
  }

  // Mobile fallback with React Native styles
  return (
    <View style={[styles.container, style]}>
      <NeonGradientBackground topic={topicData?.dbTopicName || activeTopic} />
      <FloatingBackground>
        <View style={[styles.authContainer, styles.mobileGlow, { borderColor: topicColor || NeonColors.dark.primary }]}>
          <View style={styles.innerContainer}>
            {children}
          </View>
        </View>
      </FloatingBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {} : {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderWidth: 1,
    }),
  },
  mobileGlow: {
    // Mobile-specific glow effect using shadows
    shadowColor: NeonColors.dark.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  innerContainer: {
    padding: 30,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
  },
}); 