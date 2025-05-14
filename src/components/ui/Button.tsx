import React, { useEffect, useState } from 'react';
import { 
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  Platform,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
  Animated,
  Pressable
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { withThemedStyles, createShadow, createTextStyle } from './ThemedComponent';

// Supported button sizes
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

// Supported button variants
export type ButtonVariant = 
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

// Button props
export interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

// Helper function to get the appropriate color for a variant
const getVariantColor = (variant: ButtonVariant, colors: any): string => {
  switch (variant) {
    case 'primary':
      return colors.primary;
    case 'secondary':
      return colors.secondary;
    case 'tertiary':
      return colors.muted;
    case 'accent':
      return colors.accent;
    case 'destructive':
      return colors.error;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'info':
      return colors.info;
    case 'outline':
    case 'ghost':
    default:
      return colors.primary;
  }
};

// Define type for button size configuration
type ButtonSizeConfig = {
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
  iconSpacing: number;
  borderRadius: number;
};

// Define the size-specific properties for buttons with improved iOS sizing
const buttonSizes: Record<ButtonSize, ButtonSizeConfig> = {
  xs: {
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    paddingHorizontal: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 12,
    iconSpacing: 4,
    borderRadius: 4,
  },
  sm: {
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: Platform.OS === 'ios' ? 18 : 16,
    fontSize: 14,
    iconSpacing: 6,
    borderRadius: 6,
  },
  md: {
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: Platform.OS === 'ios' ? 22 : 20,
    fontSize: 16,
    iconSpacing: 8,
    borderRadius: 8,
  },
  lg: {
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'ios' ? 26 : 24,
    fontSize: 18,
    iconSpacing: 10,
    borderRadius: 10,
  },
};

// Use the themed styles HOC to create our Button component
const Button = withThemedStyles<ButtonProps>(
  function ButtonBase({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    leftIcon,
    rightIcon,
    style,
    textStyle,
    disabled = false,
    ...rest
  }: ButtonProps) {
    const { currentTheme } = useTheme();
    const sizeStyle = buttonSizes[size];
    const [isPressed, setIsPressed] = useState(false);

    // Animation value for shadow on press
    const shadowAnimation = useState(new Animated.Value(0))[0];
    
    // Access the colors directly for iOS
    // This is a simplified approach to get colors without accessing style generator directly
    const getButtonColor = (): string => {
      if (currentTheme === 'neon') {
        switch (variant) {
          case 'primary':
            return '#00FFFF'; // Cyan - main neon color
          case 'secondary':
            return '#FF00FF'; // Magenta
          case 'tertiary':
            return '#666EEE'; // Light purple-blue - subtle but visible
          case 'accent':
            return '#33CCFF'; // Light blue
          case 'success':
            return '#00FF00'; // Green
          case 'warning':
            return '#FF9966'; // Orange - replacing yellow
          case 'destructive':
            return '#FF0000'; // Red
          case 'info':
            return '#00CDFF'; // Blue
          default:
            return '#00FFFF'; // Default to primary
        }
      }
      return '#FFFFFF'; // Default white for non-neon themes
    };
    
    // Get the icon and text color for current variant in neon theme
    const buttonColor = getButtonColor();
    
    // Handle press in/out for shadow animation
    const handlePressIn = () => {
      setIsPressed(true);
      Animated.timing(shadowAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web', // Native driver doesn't support shadow properties
      }).start();
    };
    
    const handlePressOut = () => {
      setIsPressed(false);
      Animated.timing(shadowAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    };
    
    // iOS-specific styling for neon theme with improved glow effect - only applied when pressed
    const getNeonIOSStyle = () => {
      if (currentTheme === 'neon' && Platform.OS === 'ios') {
        const shadowOpacity = isPressed ? 0.8 : 0;
        const shadowRadius = isPressed ? 7 : 0;
        
        return {
          borderWidth: 2,
          borderColor: buttonColor,
          backgroundColor: variant === 'primary' ? 'rgba(0, 0, 0, 0.8)' : 
                            variant === 'secondary' ? 'rgba(0, 0, 0, 0.75)' : 
                            'rgba(0, 0, 0, 0.7)',
          shadowColor: buttonColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: shadowOpacity,
          shadowRadius: shadowRadius,
        };
      }
      return {};
    };
    
    // Create an effect for web-specific animations
    useEffect(() => {
      if (Platform.OS === 'web') {
        // Add appropriate keyframe animations for each theme
        const styleEl = document.createElement('style');
        
        if (currentTheme === 'neon') {
          // Enhanced neon theme animations with improved text visibility and hover-only glow
          styleEl.innerHTML = `
            .neon-theme-component.button {
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
              box-shadow: none;
              border: 1.5px solid currentColor;
              background: rgba(0, 0, 0, 0.7);
              color: currentColor;
              font-weight: 500 !important;
            }
            
            /* Different animation strengths based on button hierarchy */
            .neon-theme-component.button[data-variant="primary"] {
              border-width: 2px;
              background: rgba(0, 0, 0, 0.8);
            }
            
            .neon-theme-component.button[data-variant="secondary"] {
              background: rgba(0, 0, 0, 0.75);
            }
            
            .neon-theme-component.button[data-variant="tertiary"] {
              border-width: 1px;
              background: rgba(0, 0, 0, 0.7);
            }
            
            .neon-theme-component.button:before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(
                90deg, 
                transparent, 
                rgba(255, 255, 255, 0.2), 
                transparent
              );
              transition: 0.5s;
              pointer-events: none;
              z-index: 1;
            }
            
            /* Make sure text always stays above the shimmer effect */
            .neon-theme-component.button > div {
              position: relative;
              z-index: 2;
            }
            
            /* Ensure text and icons are always visible */
            .neon-theme-component.button span,
            .neon-theme-component.button svg {
              position: relative;
              z-index: 2;
              opacity: 1 !important;
              color: inherit !important;
            }
            
            /* Add shadow only on hover/focus */
            .neon-theme-component.button:hover,
            .neon-theme-component.button:focus {
              box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px rgba(0, 255, 255, 0.3);
              transform: translateY(-2px);
              background: rgba(0, 0, 0, 0.8);
            }
            
            .neon-theme-component.button:hover:before {
              left: 100%;
            }
            
            .neon-theme-component.button:active {
              transform: scale(0.98) translateY(0);
              box-shadow: 0 0 8px currentColor, 0 0 16px currentColor;
              background: rgba(0, 0, 0, 0.9);
            }
            
            /* Specific variant styles */
            .neon-theme-component.button[data-variant="ghost"] {
              background: transparent;
              border-width: 0;
              border-bottom-width: 1px;
              border-radius: 0;
              box-shadow: none;
            }
            
            .neon-theme-component.button[data-variant="ghost"]:hover {
              background: rgba(0, 255, 255, 0.05);
              border-bottom-width: 2px;
            }
            
            .neon-theme-component.button[data-variant="outline"] {
              background: transparent;
            }
            
            .neon-theme-component.button[data-variant="outline"]:hover {
              background: rgba(0, 255, 255, 0.05);
            }
          `;
        } else if (currentTheme === 'retro') {
          // Retro theme animations
          styleEl.innerHTML = `
            .retro-theme-component.button {
              transition: all 0.2s ease;
              box-shadow: none;
            }
            
            .retro-theme-component.button:hover {
              transform: translate(-1px, -1px);
              box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
            }
            
            .retro-theme-component.button:active {
              transform: translate(1px, 1px);
              box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.2);
            }
          `;
        } else {
          // Default and modern theme animations
          styleEl.innerHTML = `
            .default-theme-component.button,
            .modern-theme-component.button {
              transition: all 0.2s ease;
              box-shadow: none;
            }
            
            .default-theme-component.button:hover,
            .modern-theme-component.button:hover {
              opacity: 0.9;
              box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .default-theme-component.button:active,
            .modern-theme-component.button:active {
              transform: scale(0.98);
              box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
            }
          `;
        }
        
        document.head.appendChild(styleEl);
        
        return () => {
          document.head.removeChild(styleEl);
        };
      }
    }, [currentTheme, variant]);
    
    // Apply iOS specific styling to the TouchableOpacity
    const iosButtonStyle = getNeonIOSStyle();
    
    // Get font weight based on button variant
    const getFontWeight = (): '400' | '500' | '600' | '700' => {
      if (variant === 'primary') return '700';
      if (variant === 'secondary') return '600';
      return '500';
    };
    
    // Determine text shadow properties based on variant
    const getTextShadow = () => {
      if (currentTheme === 'neon' && Platform.OS === 'ios' && isPressed) {
        return {
          textShadowColor: buttonColor,
          textShadowRadius: variant === 'primary' ? 2 : variant === 'secondary' ? 1.5 : 1,
        };
      }
      return {};
    };
    
    if (Platform.OS === 'android') {
      // For Android, use Pressable which has better state tracking for pressed state
      return (
        <Pressable
          style={({ pressed }) => [
            iosButtonStyle, 
            style, 
            { opacity: disabled ? 0.6 : 1 },
            pressed && { elevation: 2 }
          ]}
          disabled={disabled}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          {...rest}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {leftIcon && (
              <React.Fragment>
                {React.isValidElement(leftIcon) && currentTheme === 'neon' ? 
                  React.cloneElement(leftIcon as React.ReactElement<any>, { 
                    color: buttonColor,
                    style: { opacity: 1 }
                  }) : 
                  leftIcon
                }
                <View style={{ width: sizeStyle.iconSpacing }} />
              </React.Fragment>
            )}
            
            {typeof children === 'string' ? (
              <Text style={[
                { 
                  fontWeight: getFontWeight(),
                  fontSize: sizeStyle.fontSize,
                },
                // Apply text color to match button theme in neon mode for iOS
                currentTheme === 'neon' && Platform.OS === 'ios' ? 
                  { color: buttonColor, ...getTextShadow() } : 
                  { color: 'inherit' },
                textStyle
              ]}>
                {children}
              </Text>
            ) : (
              children
            )}
            
            {rightIcon && (
              <React.Fragment>
                <View style={{ width: sizeStyle.iconSpacing }} />
                {React.isValidElement(rightIcon) && currentTheme === 'neon' ? 
                  React.cloneElement(rightIcon as React.ReactElement<any>, { 
                    color: buttonColor,
                    style: { opacity: 1 }
                  }) : 
                  rightIcon
                }
              </React.Fragment>
            )}
          </View>
        </Pressable>
      );
    }
    
    return (
      <TouchableOpacity
        style={[iosButtonStyle, style, { opacity: disabled ? 0.6 : 1 }]}
        disabled={disabled}
        activeOpacity={0.7}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...rest}
        {...(Platform.OS === 'web' ? { 
          className: 'button',
          'data-variant': variant
        } : {})}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {leftIcon && (
            <React.Fragment>
              {/* Apply icon styling for iOS */}
              {React.isValidElement(leftIcon) && currentTheme === 'neon' ? 
                React.cloneElement(leftIcon as React.ReactElement<any>, { 
                  color: buttonColor,
                  style: { opacity: 1 }
                }) : 
                leftIcon
              }
              <View style={{ width: sizeStyle.iconSpacing }} />
            </React.Fragment>
          )}
          
          {typeof children === 'string' ? (
            <Text style={[
              { 
                fontWeight: getFontWeight(),
                fontSize: sizeStyle.fontSize,
              },
              // Apply text color to match button theme in neon mode for iOS
              currentTheme === 'neon' && Platform.OS === 'ios' ? 
                { color: buttonColor, ...getTextShadow() } : 
                { color: 'inherit' },
              textStyle
            ]}>
              {children}
            </Text>
          ) : (
            children
          )}
          
          {rightIcon && (
            <React.Fragment>
              <View style={{ width: sizeStyle.iconSpacing }} />
              {/* Apply icon styling for iOS */}
              {React.isValidElement(rightIcon) && currentTheme === 'neon' ? 
                React.cloneElement(rightIcon as React.ReactElement<any>, { 
                  color: buttonColor,
                  style: { opacity: 1 }
                }) : 
                rightIcon
              }
            </React.Fragment>
          )}
        </View>
      </TouchableOpacity>
    );
  },
  (theme, props) => {
    const { variant = 'primary', size = 'md', fullWidth = false } = props;
    const sizeStyle = buttonSizes[size as ButtonSize];
    const { currentTheme } = useTheme();
    
    // Get base variant style based on the current theme and variant
    const getVariantStyle = (): ViewStyle & { color: string } => {
      const colors = theme.colors;
      
      // Define common style props
      const baseStyle: ViewStyle & { color: string } = {
        paddingVertical: sizeStyle.paddingVertical,
        paddingHorizontal: sizeStyle.paddingHorizontal,
        borderRadius: sizeStyle.borderRadius,
        color: '#FFFFFF', // Default text color
      };
      
      // Apply variant-specific styles for neon theme
      if (currentTheme === 'neon') {
        // Create base neon button style with improved styling
        const neonBaseStyle = {
          ...baseStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', // Darker background for better contrast
          borderWidth: Platform.OS === 'web' ? 1.5 : 2,
          // Remove default shadow
        };
        
        // Enhanced styles per variant for more distinct visual hierarchy
        const primaryNeonStyle = {
          ...neonBaseStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderWidth: Platform.OS === 'web' ? 2 : 2.5,
          // No default shadow
        };
        
        const secondaryNeonStyle = {
          ...neonBaseStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
        };
        
        const tertiaryNeonStyle = {
          ...neonBaseStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderWidth: Platform.OS === 'web' ? 1 : 1.5,
        };
        
        // Apply specific neon styles based on variant
        switch (variant) {
          case 'primary':
            return {
              ...primaryNeonStyle,
              borderColor: colors.primary,
              color: colors.primary,
            };
          case 'secondary':
            return {
              ...secondaryNeonStyle,
              borderColor: colors.secondary,
              color: colors.secondary,
            };
          case 'tertiary':
            return {
              ...tertiaryNeonStyle,
              borderColor: '#666EEE', // Light purple-blue
              color: '#666EEE',
            };
          case 'accent':
            return {
              ...secondaryNeonStyle,
              borderColor: '#33CCFF', // Light blue instead of yellow
              color: '#33CCFF',
            };
          case 'outline':
            return {
              ...baseStyle,
              backgroundColor: 'transparent',
              borderWidth: Platform.OS === 'web' ? 1.5 : 2,
              borderColor: colors.primary,
              color: colors.primary,
            };
          case 'ghost':
            return {
              ...baseStyle,
              backgroundColor: 'transparent',
              color: colors.primary,
              borderWidth: 0,
              borderBottomWidth: 1,
              borderBottomColor: `${colors.primary}80`,
              borderRadius: 0,
            };
          case 'destructive':
            return {
              ...secondaryNeonStyle,
              borderColor: colors.error,
              color: colors.error,
            };
          case 'success':
            return {
              ...secondaryNeonStyle,
              borderColor: colors.success,
              color: colors.success,
            };
          case 'warning':
            return {
              ...secondaryNeonStyle,
              borderColor: '#FF9966', // Orange instead of yellow
              color: '#FF9966',
            };
          case 'info':
            return {
              ...tertiaryNeonStyle,
              borderColor: colors.info,
              color: colors.info,
            };
          default:
            return {
              ...primaryNeonStyle,
              borderColor: colors.primary,
              color: colors.primary,
            };
        }
      }
      
      // Regular theme styles - no default shadows
      switch (variant) {
        case 'primary':
          return {
            ...baseStyle,
            backgroundColor: colors.primary,
            color: colors.textInverted,
          };
        case 'secondary':
          return {
            ...baseStyle,
            backgroundColor: colors.secondary,
            color: colors.textInverted,
          };
        case 'tertiary':
          return {
            ...baseStyle,
            backgroundColor: colors.muted,
            color: colors.textInverted,
          };
        case 'accent':
          return {
            ...baseStyle,
            backgroundColor: colors.accent,
            color: colors.textInverted,
          };
        case 'outline':
          return {
            ...baseStyle,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.primary,
            color: colors.primary,
          };
        case 'ghost':
          return {
            ...baseStyle,
            backgroundColor: 'transparent',
            color: colors.primary,
          };
        case 'destructive':
          return {
            ...baseStyle,
            backgroundColor: colors.error,
            color: colors.textInverted,
          };
        case 'success':
          return {
            ...baseStyle,
            backgroundColor: colors.success,
            color: colors.textInverted,
          };
        case 'warning':
          return {
            ...baseStyle,
            backgroundColor: colors.warning,
            color: colors.text, // Often warning colors need dark text
          };
        case 'info':
          return {
            ...baseStyle,
            backgroundColor: colors.info,
            color: colors.textInverted,
          };
        default:
          return baseStyle;
      }
    };
    
    const variantStyle = getVariantStyle();
    
    // Build container style
    const containerStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: fullWidth ? '100%' : undefined,
      ...variantStyle,
    };
    
    return containerStyle;
  }
);

export default Button; 