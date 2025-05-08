import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  TouchableOpacityProps 
} from 'react-native';
import { buttons, colors } from '../../theme';

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
  ...rest
}) => {
  // Get variant and size styles from theme
  const variantStyle = buttons.variants[variant];
  const sizeStyle = buttons.sizes[size];
  
  // Build container style
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
    ...sizeStyle,
    ...variantStyle,
  };
  
  // Build text style
  const textStyleBase: TextStyle = {
    fontWeight: '600',
    fontSize: sizeStyle.fontSize,
    color: variantStyle.color,
  };
  
  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      disabled={disabled}
      activeOpacity={0.7}
      {...rest}
    >
      {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
      
      {typeof children === 'string' ? (
        <Text style={[textStyleBase, textStyle]}>{children}</Text>
      ) : (
        children
      )}
      
      {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
    </TouchableOpacity>
  );
};

export default Button; 