import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { useDesignSystem } from '../../hooks/useDesignSystem';

export interface TextProps extends RNTextProps {
  /**
   * The variant style of the text
   */
  variant?: keyof typeof variantMap | 'default';
  
  /**
   * Optional color to apply. If not provided, uses the theme's text color
   */
  color?: string;
  
  /**
   * Whether text should be aligned to center
   */
  center?: boolean;
  
  /**
   * Whether text should be in uppercase
   */
  uppercase?: boolean;
}

// Maps variant prop to typography variant in the design system
const variantMap = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'subtitle1',
  subtitle2: 'subtitle2',
  body1: 'body1',
  body2: 'body2',
  caption: 'caption',
  button: 'button',
  overline: 'overline',
  link: 'link',
  question: 'question',
  default: 'body1',
} as const;

export function Text({ 
  variant = 'default',
  color,
  style,
  center = false,
  uppercase = false,
  children,
  ...rest
}: TextProps) {
  const { colors, typography } = useDesignSystem();
  const variantKey = variantMap[variant] || variantMap.default;
  const textStyles = typography.variants[variantKey] as TextStyle;
  
  return (
    <RNText
      style={[
        textStyles,
        { color: color || colors.text },
        center && styles.center,
        uppercase && styles.uppercase,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
  uppercase: {
    textTransform: 'uppercase',
  },
}); 