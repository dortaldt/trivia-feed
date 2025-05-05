import React from 'react';
import { View as RNView, ViewProps as RNViewProps, StyleSheet } from 'react-native';
import { useDesignSystem } from '../../hooks/useDesignSystem';

export interface ViewProps extends RNViewProps {
  /**
   * Background color of the view, uses theme background by default
   */
  backgroundColor?: string;
  
  /**
   * Padding based on the spacing scale
   */
  p?: keyof typeof spacingMap;
  
  /**
   * Padding horizontal based on the spacing scale
   */
  px?: keyof typeof spacingMap;
  
  /**
   * Padding vertical based on the spacing scale
   */
  py?: keyof typeof spacingMap;
  
  /**
   * Padding top based on the spacing scale
   */
  pt?: keyof typeof spacingMap;
  
  /**
   * Padding right based on the spacing scale
   */
  pr?: keyof typeof spacingMap;
  
  /**
   * Padding bottom based on the spacing scale
   */
  pb?: keyof typeof spacingMap;
  
  /**
   * Padding left based on the spacing scale
   */
  pl?: keyof typeof spacingMap;
  
  /**
   * Margin based on the spacing scale
   */
  m?: keyof typeof spacingMap;
  
  /**
   * Margin horizontal based on the spacing scale
   */
  mx?: keyof typeof spacingMap;
  
  /**
   * Margin vertical based on the spacing scale
   */
  my?: keyof typeof spacingMap;
  
  /**
   * Margin top based on the spacing scale
   */
  mt?: keyof typeof spacingMap;
  
  /**
   * Margin right based on the spacing scale
   */
  mr?: keyof typeof spacingMap;
  
  /**
   * Margin bottom based on the spacing scale
   */
  mb?: keyof typeof spacingMap;
  
  /**
   * Margin left based on the spacing scale
   */
  ml?: keyof typeof spacingMap;
  
  /**
   * Border radius based on the borderRadius scale
   */
  rounded?: keyof typeof radiusMap;
  
  /**
   * Border width based on the borderWidth scale
   */
  borderWidth?: keyof typeof borderWidthMap;
  
  /**
   * Border color, uses theme border color by default
   */
  borderColor?: string;
  
  /**
   * Shadow size based on the shadows scale
   */
  shadow?: keyof typeof shadowMap;
  
  /**
   * Centers children horizontally and vertically
   */
  center?: boolean;
  
  /**
   * Arranges children in a row
   */
  row?: boolean;
  
  /**
   * Flex value
   */
  flex?: number;
}

// Maps for spacing values
const spacingMap = {
  '0': 0,
  '0.5': 0.5,
  '1': 1,
  '1.5': 1.5,
  '2': 2,
  '2.5': 2.5,
  '3': 3,
  '3.5': 3.5,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  '11': 11,
  '12': 12,
  '14': 14,
  '16': 16,
  '20': 20,
} as const;

// Maps for border radius values
const radiusMap = {
  'none': 'none',
  'xs': 'xs',
  'sm': 'sm',
  'md': 'md',
  'lg': 'lg',
  'xl': 'xl',
  '2xl': '2xl',
  '3xl': '3xl',
  'full': 'full',
} as const;

// Maps for border width values
const borderWidthMap = {
  '0': 0,
  '1': 1,
  '2': 2,
  '4': 4,
  '8': 8,
} as const;

// Maps for shadow values
const shadowMap = {
  'none': 'none',
  'xs': 'xs',
  'sm': 'sm',
  'md': 'md',
  'lg': 'lg',
  'xl': 'xl',
} as const;

export function View({
  backgroundColor,
  p,
  px,
  py,
  pt,
  pr,
  pb,
  pl,
  m,
  mx,
  my,
  mt,
  mr,
  mb,
  ml,
  rounded,
  borderWidth,
  borderColor,
  shadow,
  center = false,
  row = false,
  flex,
  style,
  children,
  ...rest
}: ViewProps) {
  const { colors, spacing, borderRadius, shadows, borderWidth: dsyBorderWidth } = useDesignSystem();
  
  // Build style object
  const viewStyle = {
    backgroundColor: backgroundColor || colors.background,
    
    // Padding
    padding: p !== undefined ? spacing[spacingMap[p]] : undefined,
    paddingHorizontal: px !== undefined ? spacing[spacingMap[px]] : undefined,
    paddingVertical: py !== undefined ? spacing[spacingMap[py]] : undefined,
    paddingTop: pt !== undefined ? spacing[spacingMap[pt]] : undefined,
    paddingRight: pr !== undefined ? spacing[spacingMap[pr]] : undefined,
    paddingBottom: pb !== undefined ? spacing[spacingMap[pb]] : undefined,
    paddingLeft: pl !== undefined ? spacing[spacingMap[pl]] : undefined,
    
    // Margin
    margin: m !== undefined ? spacing[spacingMap[m]] : undefined,
    marginHorizontal: mx !== undefined ? spacing[spacingMap[mx]] : undefined,
    marginVertical: my !== undefined ? spacing[spacingMap[my]] : undefined,
    marginTop: mt !== undefined ? spacing[spacingMap[mt]] : undefined,
    marginRight: mr !== undefined ? spacing[spacingMap[mr]] : undefined,
    marginBottom: mb !== undefined ? spacing[spacingMap[mb]] : undefined,
    marginLeft: ml !== undefined ? spacing[spacingMap[ml]] : undefined,
    
    // Border
    borderRadius: rounded ? borderRadius[radiusMap[rounded]] : undefined,
    borderWidth: borderWidth !== undefined ? dsyBorderWidth[borderWidthMap[borderWidth]] : undefined,
    borderColor: borderColor || colors.border,
    
    // Flex
    flex: flex,
  };
  
  // Apply shadow if specified
  const shadowStyle = shadow ? shadows[shadowMap[shadow]] : undefined;
  
  return (
    <RNView
      style={[
        viewStyle,
        shadowStyle,
        center && styles.center,
        row && styles.row,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
}); 