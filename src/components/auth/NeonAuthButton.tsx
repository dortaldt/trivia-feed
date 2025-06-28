import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { NeonColors } from '../../../constants/NeonColors';

interface NeonAuthButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
  topicColor?: string;
}

export const NeonAuthButton: React.FC<NeonAuthButtonProps> = ({
  onPress,
  title,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  topicColor
}) => {
  const primaryColor = topicColor || NeonColors.dark.primary;
  const secondaryColor = NeonColors.dark.secondary;

  // Add CSS keyframes animation for web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Create a style element for the button glow effect
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        @keyframes neonButtonGlow {
          0% {
            box-shadow: 
              0 0 10px ${primaryColor}80,
              0 0 20px ${primaryColor}60,
              0 0 30px ${primaryColor}40,
              inset 0 0 10px ${primaryColor}20;
          }
          50% {
            box-shadow: 
              0 0 15px ${primaryColor}90,
              0 0 30px ${primaryColor}70,
              0 0 45px ${primaryColor}50,
              inset 0 0 15px ${primaryColor}30;
          }
          100% {
            box-shadow: 
              0 0 10px ${primaryColor}80,
              0 0 20px ${primaryColor}60,
              0 0 30px ${primaryColor}40,
              inset 0 0 10px ${primaryColor}20;
          }
        }
        
        @keyframes neonButtonPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .neon-auth-button-primary {
          background: linear-gradient(135deg, 
            ${primaryColor}30, 
            ${secondaryColor}20
          );
          border: 2px solid ${primaryColor};
          animation: neonButtonGlow 2s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        
        .neon-auth-button-primary:hover {
          animation: neonButtonGlow 1s ease-in-out infinite, 
                    neonButtonPulse 0.3s ease;
          transform: scale(1.02);
        }
        
        .neon-auth-button-primary:active {
          transform: scale(0.98);
        }
        
        .neon-auth-button-secondary {
          background: transparent;
          border: 2px solid ${primaryColor}60;
          box-shadow: 
            0 0 10px ${primaryColor}40,
            inset 0 0 10px ${primaryColor}10;
          transition: all 0.3s ease;
        }
        
        .neon-auth-button-secondary:hover {
          border-color: ${primaryColor};
          box-shadow: 
            0 0 15px ${primaryColor}60,
            inset 0 0 15px ${primaryColor}20;
          background: ${primaryColor}10;
        }
        
        .neon-auth-button-disabled {
          opacity: 0.5;
          animation: none !important;
          pointer-events: none;
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        document.head.removeChild(styleEl);
      };
    }
  }, [primaryColor, secondaryColor]);

  const buttonStyle = [
    styles.button,
    variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
    disabled && styles.disabledButton,
    style
  ];

  const webClassName = Platform.OS === 'web' ? 
    `neon-auth-button-${variant}${disabled ? ' neon-auth-button-disabled' : ''}` : 
    undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyle}
      activeOpacity={0.8}
      {...(Platform.OS === 'web' ? { className: webClassName } : {})}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? '#FFFFFF' : primaryColor} 
        />
      ) : (
        <Text style={[
          styles.buttonText,
          variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText,
          { color: variant === 'primary' ? '#FFFFFF' : primaryColor },
          textStyle
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: Platform.OS === 'web' ? 'transparent' : NeonColors.dark.primary + '30',
    borderWidth: 2,
    borderColor: NeonColors.dark.primary,
    ...(Platform.OS !== 'web' && {
      shadowColor: NeonColors.dark.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 10,
    }),
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: NeonColors.dark.primary + '60',
    ...(Platform.OS !== 'web' && {
      shadowColor: NeonColors.dark.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    textShadowColor: NeonColors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  secondaryButtonText: {
    color: NeonColors.dark.primary,
    textShadowColor: NeonColors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
}); 