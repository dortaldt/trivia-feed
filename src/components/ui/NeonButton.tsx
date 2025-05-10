import React, { useEffect } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  TouchableOpacityProps,
  Platform,
  Animated
} from 'react-native';
import { NeonColors } from '@/constants/NeonColors';
import { useTheme } from '@/src/context/ThemeContext';
import { buttons } from '@/src/theme';

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
interface NeonButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  textStyle?: TextStyle;
  disabled?: boolean;
  color?: string; // Optional custom color for the neon effect
  animationIntensity?: number; // Optional intensity for animations (1-10)
}

const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  disabled = false,
  color,
  animationIntensity = 5,
  ...rest
}) => {
  const { isNeonTheme } = useTheme();
  const sizeStyle = buttons.sizes[size];

  // Use the provided color or get the color based on variant
  const getNeonColor = () => {
    if (color) return color;
    
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
  
  const neonColor = getNeonColor();
  
  // Add CSS keyframes animation for web platform
  useEffect(() => {
    if (Platform.OS === 'web' && isNeonTheme) {
      // Generate unique animation names based on color to prevent conflicts
      const colorHex = neonColor.replace('#', '');
      const animationName = `neonButton_${colorHex}`;
      const textAnimationName = `neonButtonText_${colorHex}`;
      
      // Scale the intensity (1-10) to actual CSS values
      const glowMin = 2 + animationIntensity * 0.3;
      const glowMax = 5 + animationIntensity * 0.5;
      const textGlowMin = 1 + animationIntensity * 0.2;
      const textGlowMax = 3 + animationIntensity * 0.3;
      
      // Create a style element
      const styleEl = document.createElement('style');
      // Add keyframes animation
      styleEl.innerHTML = `
        @keyframes ${animationName} {
          0% {
            box-shadow: 0 0 ${glowMin}px ${neonColor}, 0 0 ${glowMin + 2}px ${neonColor}40;
          }
          100% {
            box-shadow: 0 0 ${glowMax}px ${neonColor}, 0 0 ${glowMax + 4}px ${neonColor}60;
          }
        }
        
        @keyframes ${textAnimationName} {
          0% {
            text-shadow: 0 0 ${textGlowMin}px ${neonColor}, 0 0 ${textGlowMin + 1}px ${neonColor};
          }
          100% {
            text-shadow: 0 0 ${textGlowMax}px ${neonColor}, 0 0 ${textGlowMax + 2}px ${neonColor};
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
  }, [isNeonTheme, neonColor, animationIntensity]);
  
  // Build container style
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    ...sizeStyle,
  };
  
  // Apply standard or neon styling based on the theme
  const getNeonButtonStyle = (): ViewStyle => {
    if (!isNeonTheme) {
      // Fall back to standard styling if not in neon theme
      return buttons.variants[variant];
    }
    
    // Otherwise, apply neon styling
    const baseStyle: ViewStyle = {
      backgroundColor: 'rgba(5, 5, 15, 0.8)',
      borderWidth: 1.5,
      borderColor: neonColor,
    };
    
    // Add platform-specific styles
    if (Platform.OS === 'web') {
      const colorHex = neonColor.replace('#', '');
      return {
        ...baseStyle,
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        boxShadow: `0 0 8px ${neonColor}, 0 0 4px ${neonColor}`,
        transition: 'all 0.2s ease-in-out',
        animation: `neonButton_${colorHex} 2s infinite alternate`,
      } as any;
    } else if (Platform.OS === 'ios') {
      return {
        ...baseStyle,
        shadowColor: neonColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      };
    } else {
      // Android
      return {
        ...baseStyle,
        elevation: 4,
      };
    }
  };
  
  // Build text style
  const textStyleBase: TextStyle = {
    fontWeight: '600',
    fontSize: sizeStyle.fontSize,
    color: isNeonTheme ? neonColor : buttons.variants[variant].color,
  };
  
  // Add neon text effect
  const getNeonTextStyle = (): TextStyle => {
    if (!isNeonTheme) return {};
    
    if (Platform.OS === 'web') {
      const colorHex = neonColor.replace('#', '');
      return {
        animation: `neonButtonText_${colorHex} 2s infinite alternate`,
      } as any;
    } else {
      return {
        textShadowColor: neonColor,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
      };
    }
  };
  
  return (
    <TouchableOpacity
      style={[containerStyle, getNeonButtonStyle(), style]}
      disabled={disabled}
      activeOpacity={0.7}
      {...rest}
    >
      {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
      
      {typeof children === 'string' ? (
        <Text style={[textStyleBase, getNeonTextStyle(), textStyle]}>{children}</Text>
      ) : (
        children
      )}
      
      {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
    </TouchableOpacity>
  );
};

export default NeonButton; 