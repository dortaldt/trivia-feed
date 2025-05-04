import React from 'react';
import { StyleSheet, StyleProp, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { Button as PaperButton, Text } from 'react-native-paper';
import { colors, typography, borderRadius } from '../../theme';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: string;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  onPress,
  style,
  textStyle,
  icon,
  loading = false,
}) => {
  // Handle different button sizes
  const getButtonSize = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          height: 36,
          paddingHorizontal: 12,
        };
      case 'lg':
        return {
          height: 46,
          paddingHorizontal: 24,
        };
      case 'icon':
        return {
          height: 40,
          width: 40,
          paddingHorizontal: 0,
          alignItems: 'center',
          justifyContent: 'center',
        };
      default:
        return {
          height: 40,
          paddingHorizontal: 16,
        };
    }
  };

  // Handle different button variants
  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    };

    switch (variant) {
      case 'destructive':
        return {
          ...baseStyle,
          backgroundColor: colors.destructive,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: colors.secondary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'link':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          paddingHorizontal: 0,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.primary,
        };
    }
  };

  // Handle different text styles
  const getTextStyles = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: typography.fontWeights.medium as TextStyle['fontWeight'],
      fontSize: size === 'sm' ? typography.fontSizes.sm : typography.fontSizes.md,
    };

    switch (variant) {
      case 'destructive':
        return {
          ...baseStyle,
          color: colors.destructiveForeground,
        };
      case 'outline':
        return {
          ...baseStyle,
          color: colors.foreground,
        };
      case 'secondary':
        return {
          ...baseStyle,
          color: colors.secondaryForeground,
        };
      case 'ghost':
      case 'link':
        return {
          ...baseStyle,
          color: colors.primary,
        };
      default:
        return {
          ...baseStyle,
          color: colors.primaryForeground,
        };
    }
  };

  // If link variant, use TouchableOpacity instead of PaperButton
  if (variant === 'link') {
    return (
      <TouchableOpacity
        style={[getButtonSize(), getButtonStyles(), style]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        <Text style={[getTextStyles(), textStyle]}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }

  // Use Paper Button for all other variants
  return (
    <PaperButton
      mode={variant === 'outline' ? 'outlined' : 'contained'}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      style={[getButtonSize(), getButtonStyles(), style]}
      labelStyle={[getTextStyles(), textStyle]}
      contentStyle={{ height: '100%' }}
    >
      {children}
    </PaperButton>
  );
};

export default Button; 