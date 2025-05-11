import React, { useEffect } from 'react';
import { 
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  Platform,
  View,
  ViewStyle,
  TextStyle,
  StyleProp
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { withThemedStyles, createShadow, createTextStyle } from './ThemedComponent';

// Supported button sizes
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

// Supported button variants
export type ButtonVariant = 
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

// Define type for button size configuration
type ButtonSizeConfig = {
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
  iconSpacing: number;
  borderRadius: number;
};

// Define the size-specific properties for buttons
const buttonSizes: Record<ButtonSize, ButtonSizeConfig> = {
  xs: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    fontSize: 12,
    iconSpacing: 4,
    borderRadius: 4,
  },
  sm: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    fontSize: 14,
    iconSpacing: 6,
    borderRadius: 6,
  },
  md: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    fontSize: 16,
    iconSpacing: 8,
    borderRadius: 8,
  },
  lg: {
    paddingVertical: 10,
    paddingHorizontal: 24,
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
    
    // Create an effect for web-specific animations
    useEffect(() => {
      if (Platform.OS === 'web') {
        // Add appropriate keyframe animations for each theme
        const styleEl = document.createElement('style');
        
        if (currentTheme === 'neon') {
          // Neon theme animations
          styleEl.innerHTML = `
            .neon-theme-component.button {
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
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
            }
            
            .neon-theme-component.button:hover:before {
              left: 100%;
            }
            
            .neon-theme-component.button:active {
              transform: scale(0.98);
            }
          `;
        } else if (currentTheme === 'retro') {
          // Retro theme animations
          styleEl.innerHTML = `
            .retro-theme-component.button {
              transition: all 0.2s ease;
              box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.2);
            }
            
            .retro-theme-component.button:hover {
              transform: translate(-1px, -1px);
              box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.3);
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
            }
            
            .default-theme-component.button:hover,
            .modern-theme-component.button:hover {
              opacity: 0.9;
            }
            
            .default-theme-component.button:active,
            .modern-theme-component.button:active {
              transform: scale(0.98);
            }
          `;
        }
        
        document.head.appendChild(styleEl);
        
        return () => {
          document.head.removeChild(styleEl);
        };
      }
    }, [currentTheme]);
    
    return (
      <TouchableOpacity
        style={[style, { opacity: disabled ? 0.6 : 1 }]}
        disabled={disabled}
        activeOpacity={0.7}
        {...rest}
        {...(Platform.OS === 'web' ? { className: 'button' } : {})}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {leftIcon && (
            <React.Fragment>
              {leftIcon}
              <View style={{ width: sizeStyle.iconSpacing }} />
            </React.Fragment>
          )}
          
          {typeof children === 'string' ? (
            <Text style={[
              { 
                fontWeight: '600',
                fontSize: sizeStyle.fontSize,
              },
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
              {rightIcon}
            </React.Fragment>
          )}
        </View>
      </TouchableOpacity>
    );
  },
  (theme, props) => {
    const { variant = 'primary', size = 'md', fullWidth = false } = props;
    const sizeStyle = buttonSizes[size];
    
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
      
      // Apply variant-specific styles
      switch (variant) {
        case 'primary':
          return {
            ...baseStyle,
            backgroundColor: colors.primary,
            ...createShadow(theme, 'sm'),
            color: colors.textInverted,
          };
        case 'secondary':
          return {
            ...baseStyle,
            backgroundColor: colors.secondary,
            ...createShadow(theme, 'sm'),
            color: colors.textInverted,
          };
        case 'accent':
          return {
            ...baseStyle,
            backgroundColor: colors.accent,
            ...createShadow(theme, 'sm'),
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
            ...createShadow(theme, 'sm'),
            color: colors.textInverted,
          };
        case 'success':
          return {
            ...baseStyle,
            backgroundColor: colors.success,
            ...createShadow(theme, 'sm'),
            color: colors.textInverted,
          };
        case 'warning':
          return {
            ...baseStyle,
            backgroundColor: colors.warning,
            ...createShadow(theme, 'sm'),
            color: colors.text, // Often warning colors need dark text
          };
        case 'info':
          return {
            ...baseStyle,
            backgroundColor: colors.info,
            ...createShadow(theme, 'sm'),
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