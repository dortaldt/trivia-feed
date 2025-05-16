import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  TouchableOpacityProps,
  View,
  Platform,
  Pressable
} from 'react-native';
import { buttons, colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

// Supported button sizes
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

// Supported button variants
type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'tertiary'
  | 'accent' 
  | 'outline' 
  | 'ghost' 
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info';

// Define the NeonButtonStyle type to match the structure in the theme
type NeonButtonStyle = {
  color: string;
  glow: string;
  background: string;
};

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
  // Neon theme specific props
  color?: string;
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
  color,
  ...rest
}) => {
  // Get theme context
  const { isNeonTheme, currentTheme } = useTheme();
  // Track pressed state for mobile platforms
  const [isPressed, setIsPressed] = useState(false);
  
  // Get variant and size styles from theme
  const variantStyle = buttons.variants[variant];
  const sizeStyle = buttons.sizes[size];
  
  // Use the icon spacing from the theme
  const iconSpacing = sizeStyle.iconSpacing;
  
  // Get button text color based on variant
  const getButtonColor = () => {
    if (!isNeonTheme) {
      return variantStyle.color;
    }
    
    // Custom color overrides variant
    if (color) return color;
    
    // Use neon theme tokens from theme system if available
    if (buttons.neon) {
      const neonTokens = buttons.neon as Record<ButtonVariant, NeonButtonStyle>;
      // Safely check if this variant exists in neon tokens
      if (neonTokens[variant]) {
        return neonTokens[variant].color;
      }
    }
    
    // Fallback to accent color
    return colors.accent;
  };
  
  const buttonColor = getButtonColor();
  
  // Get button background based on variant
  const getButtonBackground = () => {
    if (!isNeonTheme) {
      return variantStyle.backgroundColor;
    }
    
    // Use neon theme tokens if available
    if (buttons.neon) {
      const neonTokens = buttons.neon as Record<ButtonVariant, NeonButtonStyle>;
      // Safely check if this variant exists in neon tokens
      if (neonTokens[variant]) {
        return neonTokens[variant].background;
      }
    }
    
    // Fallback defaults
    switch (variant) {
      case 'primary': 
      case 'accent': return 'rgba(40, 25, 0, 0.8)';
      case 'secondary': 
      case 'tertiary': 
      case 'ghost': 
      case 'outline': return 'transparent';
      default: return 'rgba(5, 5, 15, 0.8)';
    }
  };
  
  // Add button state styles for web platform
  if (Platform.OS === 'web' && isNeonTheme) {
    // Create a style element for state styles (without glow)
    if (typeof document !== 'undefined' && !document.getElementById('button-states-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'button-states-style';
      
      // Add state styles without animation/glow
      styleEl.innerHTML = `
        .button-states:hover {
          opacity: ${buttons.states.hover.opacity};
          transform: ${buttons.states.hover.transform};
        }
        
        .button-states:active {
          opacity: ${buttons.states.active.opacity};
          transform: ${buttons.states.active.transform};
        }
        
        .button-states:disabled {
          opacity: ${buttons.states.disabled.opacity};
          cursor: not-allowed;
        }
      `;
      
      // Append to document head
      document.head.appendChild(styleEl);
    }
  }
  
  // Apply appropriate styling based on theme and variant
  const getButtonStyle = (): ViewStyle => {
    // If not in neon theme, use standard variant styling
    if (!isNeonTheme) {
      const baseStyle = { ...variantStyle };
      
      // Add pressed state for non-neon theme
      if (isPressed && !disabled) {
        return {
          ...baseStyle,
          opacity: buttons.states.pressed.opacity,
        };
      }
      
      // Add disabled state
      if (disabled) {
        return {
          ...baseStyle,
          opacity: buttons.states.disabled.opacity,
        };
      }
      
      return baseStyle;
    }
    
    // Apply neon styling based on variant (no glow)
    const neonBackground = getButtonBackground();
    
    // Base neon style (NO GLOW)
    const baseStyle: ViewStyle = {
      backgroundColor: neonBackground,
      borderColor: variant === 'secondary' || variant === 'outline' ? buttonColor : 'transparent',
      borderWidth: variant === 'secondary' || variant === 'outline' ? 2 : 0,
    };
    
    // Add platform-specific styles (without glow)
    if (Platform.OS === 'web') {
      // Add className for hover/active states on web
      if (typeof document !== 'undefined') {
        setTimeout(() => {
          const buttonElements = document.querySelectorAll('.button-no-glow');
          buttonElements.forEach(el => {
            el.classList.add('button-states');
          });
        }, 0);
      }
      
      return {
        ...baseStyle,
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        transition: 'all 0.2s ease-in-out',
      } as any;
    } else if (Platform.OS === 'ios') {
      // iOS pressed and disabled states (no shadow)
      let stateStyle = {};
      
      if (isPressed && !disabled) {
        stateStyle = {
          opacity: buttons.states.pressed.opacity,
          transform: [{ scale: 0.98 }],
        };
      }
      
      if (disabled) {
        stateStyle = {
          opacity: buttons.states.disabled.opacity,
        };
      }
      
      return {
        ...baseStyle,
        ...stateStyle,
      };
    } else {
      // Android (no elevation)
      // Android pressed and disabled states
      let stateStyle = {};
      
      if (isPressed && !disabled) {
        stateStyle = {
          opacity: buttons.states.pressed.opacity,
        };
      }
      
      if (disabled) {
        stateStyle = {
          opacity: buttons.states.disabled.opacity,
        };
      }
      
      return {
        ...baseStyle,
        ...stateStyle,
      };
    }
  };
  
  // Build container style
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? buttons.states.disabled.opacity : 1,
    width: fullWidth ? '100%' : undefined,
    ...sizeStyle,
  };
  
  // Build text style without glow/shadow
  const textStyleBase: TextStyle = {
    fontWeight: '600',
    fontSize: sizeStyle.fontSize,
    color: buttonColor,
    // Explicitly define no text shadow
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  };
  
  // Clone icon elements with the button's text color
  const renderIconWithColor = (icon: React.ReactNode) => {
    if (!icon) return null;
    
    if (React.isValidElement(icon)) {
      // Create props with the button color
      const iconProps = icon.props as any;
      const newProps = {
        color: buttonColor,
        style: {
          ...(iconProps.style || {}),
          color: buttonColor
        }
      };
      
      // Clone the element with the new props
      return React.cloneElement(icon, newProps);
    }
    
    return icon;
  };
  
  // For web platform
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity
        style={[containerStyle, getButtonStyle(), style]}
        disabled={disabled}
        activeOpacity={buttons.states.active.opacity}
        // @ts-ignore - className is valid in web but not recognized by TS
        className={isNeonTheme ? 'button-no-glow' : ''}
        {...rest}
      >
        {leftIcon && (
          <React.Fragment>
            {renderIconWithColor(leftIcon)}
            <View style={{ width: iconSpacing }} />
          </React.Fragment>
        )}
        
        {typeof children === 'string' ? (
          <Text style={[textStyleBase, textStyle]}>{children}</Text>
        ) : (
          children
        )}
        
        {rightIcon && (
          <React.Fragment>
            <View style={{ width: iconSpacing }} />
            {renderIconWithColor(rightIcon)}
          </React.Fragment>
        )}
      </TouchableOpacity>
    );
  }
  
  // For mobile platforms - use Pressable for better press state handling
  return (
    <Pressable
      style={[containerStyle, getButtonStyle(), style]}
      disabled={disabled}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      android_ripple={isNeonTheme ? undefined : { color: 'rgba(255, 255, 255, 0.2)' }}
      {...rest}
    >
      {leftIcon && (
        <React.Fragment>
          {renderIconWithColor(leftIcon)}
          <View style={{ width: iconSpacing }} />
        </React.Fragment>
      )}
      
      {typeof children === 'string' ? (
        <Text style={[textStyleBase, textStyle]}>{children}</Text>
      ) : (
        children
      )}
      
      {rightIcon && (
        <React.Fragment>
          <View style={{ width: iconSpacing }} />
          {renderIconWithColor(rightIcon)}
        </React.Fragment>
      )}
    </Pressable>
  );
};

export default Button; 