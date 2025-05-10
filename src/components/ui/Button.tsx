import React, { useEffect } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  TouchableOpacityProps,
  Platform,
  View
} from 'react-native';
import { buttons, colors } from '../../theme';
import { useTheme } from '@/src/context/ThemeContext';
import { NeonColors } from '@/constants/NeonColors';

// Supported button sizes
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

// Supported button variants
type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'accent' 
  | 'outline' 
  | 'ghost' 
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info';

// Button props
interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  textStyle?: TextStyle;
  disabled?: boolean;
  // Added for neon support (can be provided to override the default neon color)
  neonColor?: string;
  // Flag to opt out of neon styling even when neon theme is active
  disableNeonStyle?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  disabled = false,
  neonColor,
  disableNeonStyle = false,
  ...rest
}) => {
  const { isNeonTheme } = useTheme();
  
  // Get variant and size styles from theme
  const variantStyle = buttons.variants[variant];
  const sizeStyle = buttons.sizes[size];
  
  // Determine if we should use neon styling
  const useNeonStyle = isNeonTheme && !disableNeonStyle;
  
  // Get the appropriate neon color based on variant
  const getNeonColor = (): string => {
    if (neonColor) return neonColor;
    
    switch (variant) {
      case 'primary': return NeonColors.dark.primary;
      case 'secondary': return NeonColors.dark.secondary;
      case 'accent': return NeonColors.dark.accent;
      case 'destructive': return '#FF0000';
      case 'success': return '#00FF00';
      case 'warning': return '#FFFF00';
      case 'info': return '#00CDFF';
      default: return NeonColors.dark.primary;
    }
  };
  
  const activeNeonColor = getNeonColor();
  
  // Add CSS keyframes animation for web platform with neon effects
  useEffect(() => {
    if (Platform.OS === 'web' && useNeonStyle) {
      // Create unique animation names based on the color to prevent conflicts
      const colorHex = activeNeonColor.replace('#', '');
      const animationName = `neonButton_${colorHex}`;
      const textAnimationName = `neonText_${colorHex}`;
      
      // Create a style element
      const styleEl = document.createElement('style');
      // Add keyframes animation with reduced intensity compared to NeonButton
      styleEl.innerHTML = `
        @keyframes ${animationName} {
          0% {
            box-shadow: 0 0 3px ${activeNeonColor}, 0 0 5px ${activeNeonColor}40;
          }
          100% {
            box-shadow: 0 0 6px ${activeNeonColor}, 0 0 8px ${activeNeonColor}60;
          }
        }
        
        @keyframes ${textAnimationName} {
          0% {
            text-shadow: 0 0 1px ${activeNeonColor}, 0 0 2px ${activeNeonColor};
          }
          100% {
            text-shadow: 0 0 2px ${activeNeonColor}, 0 0 4px ${activeNeonColor};
          }
        }
      `;
      // Append to document head
      document.head.appendChild(styleEl);
      
      // Clean up function
      return () => {
        document.head.removeChild(styleEl);
      };
    }
  }, [useNeonStyle, activeNeonColor, variant]);
  
  // Build container style
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
    ...sizeStyle,
  };
  
  // Apply standard or neon styling based on the theme
  const getButtonStyle = (): ViewStyle => {
    if (!useNeonStyle) {
      return variantStyle;
    }
    
    // Build neon style
    const baseStyle: ViewStyle = {
      backgroundColor: 'rgba(5, 5, 15, 0.8)',
      borderWidth: 1,
      borderColor: activeNeonColor,
    };
    
    // Add platform-specific neon styles
    if (Platform.OS === 'web') {
      const colorHex = activeNeonColor.replace('#', '');
      return {
        ...baseStyle,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        boxShadow: `0 0 5px ${activeNeonColor}, 0 0 2px ${activeNeonColor}`,
        transition: 'all 0.2s ease-in-out',
        animation: `neonButton_${colorHex} 2s infinite alternate`,
      } as any;
    } else if (Platform.OS === 'ios') {
      return {
        ...baseStyle,
        shadowColor: activeNeonColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 5,
      };
    } else {
      // Android
      return {
        ...baseStyle,
        elevation: 3,
      };
    }
  };
  
  // Build text style
  const textStyleBase: TextStyle = {
    fontWeight: '600',
    fontSize: sizeStyle.fontSize,
    color: useNeonStyle ? activeNeonColor : variantStyle.color,
  };
  
  // Add neon text effect if needed
  const getNeonTextStyle = (): TextStyle => {
    if (!useNeonStyle) return {};
    
    if (Platform.OS === 'web') {
      const colorHex = activeNeonColor.replace('#', '');
      return {
        animation: `neonText_${colorHex} 2s infinite alternate`,
      } as any;
    } else {
      return {
        textShadowColor: activeNeonColor,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3,
      };
    }
  };
  
  return (
    <TouchableOpacity
      style={[containerStyle, getButtonStyle(), style]}
      disabled={disabled}
      activeOpacity={0.7}
      {...rest}
    >
      {leftIcon && (
        <React.Fragment>
          {leftIcon}
          <View style={{ width: sizeStyle.iconSpacing }} />
        </React.Fragment>
      )}
      
      {typeof children === 'string' ? (
        <Text style={[textStyleBase, getNeonTextStyle(), textStyle]}>{children}</Text>
      ) : (
        children
      )}
      
      {rightIcon && (
        <React.Fragment>
          <View style={{ width: sizeStyle.iconSpacing }} />
          {rightIcon}
        </React.Fragment>
      )}
    </TouchableOpacity>
  );
};

export default Button; 