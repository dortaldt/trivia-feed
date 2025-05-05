import React from 'react';
import { 
  TouchableOpacity, 
  TouchableOpacityProps, 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useDesignSystem } from '../../hooks/useDesignSystem';
import { Text } from './Text';
import { View } from './View';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends TouchableOpacityProps {
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  
  /**
   * Button size
   */
  size?: ButtonSize;
  
  /**
   * Button text/label
   */
  label?: string;
  
  /**
   * Is button in loading state
   */
  loading?: boolean;
  
  /**
   * Left icon component
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Right icon component
   */
  rightIcon?: React.ReactNode;
  
  /**
   * Custom styles for the button container
   */
  containerStyle?: ViewStyle;
  
  /**
   * Custom styles for the button text
   */
  textStyle?: TextStyle;
  
  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean;
}

// Size configurations
const sizeConfig: Record<ButtonSize, { padding: number, fontSize: keyof typeof fontSizes, iconSize: number }> = {
  xs: { padding: 8, fontSize: 'xs', iconSize: 14 },
  sm: { padding: 10, fontSize: 'sm', iconSize: 16 },
  md: { padding: 12, fontSize: 'md', iconSize: 18 },
  lg: { padding: 14, fontSize: 'lg', iconSize: 20 },
  xl: { padding: 16, fontSize: 'xl', iconSize: 22 },
};

// Font size mapping
const fontSizes = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'md',
  xl: 'lg',
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  label,
  loading = false,
  leftIcon,
  rightIcon,
  containerStyle,
  textStyle,
  fullWidth = false,
  disabled = false,
  style,
  children,
  ...rest
}: ButtonProps) {
  const { colors, borderRadius } = useDesignSystem();
  const sizeDetails = sizeConfig[size];
  
  // Style configurations based on variant
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.primaryLighter : colors.primary,
          borderColor: 'transparent',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.primary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'destructive':
        return {
          backgroundColor: colors.error,
          borderColor: 'transparent',
        };
      case 'link':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          paddingVertical: 0,
          paddingHorizontal: 0,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: 'transparent',
        };
    }
  };
  
  // Get text color based on variant
  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return colors.textInverted;
      case 'secondary':
      case 'ghost':
      case 'outline':
      case 'link':
        return colors.primary;
      case 'destructive':
        return colors.textInverted;
      default:
        return colors.textInverted;
    }
  };
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          paddingVertical: variant === 'link' ? 0 : sizeDetails.padding,
          paddingHorizontal: variant === 'link' ? 0 : sizeDetails.padding * 2,
          borderRadius: borderRadius.md,
        },
        getVariantStyles(),
        fullWidth && styles.fullWidth,
        containerStyle,
        style,
      ]}
      {...rest}
    >
      <View row center style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={getTextColor()}
            style={leftIcon ? styles.leftIcon : undefined} 
          />
        ) : leftIcon ? (
          <View style={styles.leftIcon}>{leftIcon}</View>
        ) : null}
        
        {label && (
          <Text
            variant={fontSizes[size] as any}
            color={getTextColor()}
            style={[
              variant === 'link' && styles.linkText,
              textStyle,
            ]}
          >
            {label}
          </Text>
        )}
        
        {children}
        
        {rightIcon && !loading && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
}); 