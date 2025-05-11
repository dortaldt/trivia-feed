import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle, StyleProp } from 'react-native';
import { withThemedStyles, createTextStyle } from './ThemedComponent';

/**
 * Text variants corresponding to design system typography
 */
export type TextVariant =
  | 'h1'
  | 'h2' 
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'button'
  | 'overline';

/**
 * Extended text props including variant and optional color override
 */
export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  children?: React.ReactNode;
}

/**
 * Themed Text component that adapts to the current theme
 */
const Text = withThemedStyles<TextProps>(
  ({ style, children, ...rest }: TextProps) => (
    <RNText style={style} {...rest}>
      {children}
    </RNText>
  ),
  (theme, props) => {
    const { variant = 'body1' } = props;
    const { typography, colors } = theme;
    
    // Get typography styles based on variant
    const getTypographyStyle = (): TextStyle => {
      const { fontSize, fontFamily, lineHeight, fontWeight } = typography;
      
      switch (variant) {
        case 'h1':
          return {
            fontSize: fontSize['4xl'],
            fontFamily: fontFamily.bold,
            fontWeight: fontWeight.bold,
            lineHeight: fontSize['4xl'] * lineHeight.tight,
          };
        case 'h2':
          return {
            fontSize: fontSize['3xl'],
            fontFamily: fontFamily.bold,
            fontWeight: fontWeight.bold,
            lineHeight: fontSize['3xl'] * lineHeight.tight,
          };
        case 'h3':
          return {
            fontSize: fontSize['2xl'],
            fontFamily: fontFamily.bold,
            fontWeight: fontWeight.bold,
            lineHeight: fontSize['2xl'] * lineHeight.tight,
          };
        case 'h4':
          return {
            fontSize: fontSize.xl,
            fontFamily: fontFamily.bold,
            fontWeight: fontWeight.bold,
            lineHeight: fontSize.xl * lineHeight.tight,
          };
        case 'h5':
          return {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            fontWeight: fontWeight.bold,
            lineHeight: fontSize.lg * lineHeight.tight,
          };
        case 'h6':
          return {
            fontSize: fontSize.md,
            fontFamily: fontFamily.bold,
            fontWeight: fontWeight.bold,
            lineHeight: fontSize.md * lineHeight.tight,
          };
        case 'subtitle1':
          return {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.base,
            fontWeight: fontWeight.semibold,
            lineHeight: fontSize.lg * lineHeight.normal,
          };
        case 'subtitle2':
          return {
            fontSize: fontSize.md,
            fontFamily: fontFamily.base,
            fontWeight: fontWeight.semibold,
            lineHeight: fontSize.md * lineHeight.normal,
          };
        case 'body1':
          return {
            fontSize: fontSize.md,
            fontFamily: fontFamily.base,
            fontWeight: fontWeight.normal,
            lineHeight: fontSize.md * lineHeight.normal,
          };
        case 'body2':
          return {
            fontSize: fontSize.sm,
            fontFamily: fontFamily.base,
            fontWeight: fontWeight.normal,
            lineHeight: fontSize.sm * lineHeight.normal,
          };
        case 'caption':
          return {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.base,
            fontWeight: fontWeight.normal,
            lineHeight: fontSize.xs * lineHeight.normal,
          };
        case 'button':
          return {
            fontSize: fontSize.md,
            fontFamily: fontFamily.bold,
            fontWeight: fontWeight.medium,
            lineHeight: fontSize.md * lineHeight.normal,
            textTransform: 'uppercase' as const,
          };
        case 'overline':
          return {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.base,
            fontWeight: fontWeight.medium,
            lineHeight: fontSize.xs * lineHeight.normal,
            textTransform: 'uppercase' as const,
            letterSpacing: 1.5,
          };
        default:
          return {
            fontSize: fontSize.md,
            fontFamily: fontFamily.base,
            fontWeight: fontWeight.normal,
            lineHeight: fontSize.md * lineHeight.normal,
          };
      }
    };
    
    // Combine typography styles with text color
    const textStyle: TextStyle = {
      ...getTypographyStyle(),
      color: props.color || colors.text,
    };
    
    return textStyle;
  }
);

export default Text; 