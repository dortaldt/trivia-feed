import React from 'react';
import { StyleProp, ViewStyle, TextStyle, ImageStyle, StyleSheet , Platform } from 'react-native';
import { useDesignSystem } from '@/src/hooks/useDesignSystem';
import { useTheme } from '@/src/context/ThemeContext';

type AnyStyle = ViewStyle | TextStyle | ImageStyle;

// Type for component specific style generator
export type StyleGenerator<S> = (theme: ReturnType<typeof useDesignSystem>, props: any) => S;

/**
 * Higher-order component that provides theme-aware styling to a component
 * 
 * @param WrappedComponent The component to wrap with theme awareness
 * @param generateStyles Function to generate styles based on the theme and props
 * @returns A themed component with styles injected
 */
export function withThemedStyles<P extends object>(
  WrappedComponent: React.ComponentType<P & { style?: StyleProp<AnyStyle> }>,
  generateStyles: StyleGenerator<StyleProp<AnyStyle>>
) {
  // Return a new component
  return (props: P & { style?: StyleProp<AnyStyle> }) => {
    // Get theme values
    const theme = useDesignSystem();
    const { currentTheme } = useTheme();
    
    // Generate component styles based on theme
    const themeStyles = generateStyles(theme, props);
    
    // Merge with any user-provided styles
    const mergedStyles = StyleSheet.compose(themeStyles, props.style);
    
    // Additional platform-specific styling for web
    if (Platform.OS === 'web') {
      // Add web-specific styles for each theme
      const webClassName = getWebClassName(currentTheme);
      
      return (
        <WrappedComponent 
          {...props} 
          style={mergedStyles} 
          {...(Platform.OS === 'web' ? { className: webClassName } : {})}
        />
      );
    }
    
    // Otherwise just return with merged styles
    return <WrappedComponent {...props} style={mergedStyles} />;
  };
}

/**
 * Helper to get web-specific className for CSS animations based on theme
 */
function getWebClassName(themeName: string): string {
  switch (themeName) {
    case 'neon':
      return 'neon-theme-component';
    case 'retro':
      return 'retro-theme-component';
    case 'modern':
      return 'modern-theme-component';
    default:
      return 'default-theme-component';
  }
}

/**
 * Helper to create shadow styles based on a shadow name and platform
 */
export function createShadow(
  theme: ReturnType<typeof useDesignSystem>,
  shadowName: keyof ReturnType<typeof useDesignSystem>['shadows']
): ViewStyle {
  const shadowStyle = theme.shadows[shadowName];
  const { currentTheme } = useTheme();
  
  // On web, we need to convert RN shadows to CSS
  if (Platform.OS === 'web') {
    // For neon theme, enhance the shadow glow effect
    if (currentTheme === 'neon') {
      // Convert shadow to web format if it has the expected properties
      if ('shadowColor' in shadowStyle && 
          'shadowOpacity' in shadowStyle && 
          'shadowRadius' in shadowStyle) {
        
        const shadow = shadowStyle as any;
        const blurRadius = shadow.shadowRadius || 0;
        const opacity = shadow.shadowOpacity || 1;
        const color = shadow.shadowColor || '#00FFFF';
        
        // Calculate hex opacity for shadow
        const opacityHex1 = Math.floor(opacity * 100).toString(16).padStart(2, '0');
        const opacityHex2 = Math.floor(opacity * 70).toString(16).padStart(2, '0');
        
        // Enhanced glow effect for web - dual shadow for stronger effect
        return {
          boxShadow: `0 0 ${blurRadius * 0.8}px ${color}${opacityHex1}, 0 0 ${blurRadius * 1.5}px ${color}${opacityHex2}`,
          // Apply to pseudo-elements as well for full glow effect
          '::before, ::after': {
            boxShadow: `inherit`,
          } as any
        } as any;
      }
    } else {
      // Standard shadow conversion for other themes
      if ('shadowColor' in shadowStyle && 
          'shadowOffset' in shadowStyle && 
          'shadowOpacity' in shadowStyle && 
          'shadowRadius' in shadowStyle) {
        
        const shadow = shadowStyle as any;
        const offsetX = shadow.shadowOffset?.width || 0;
        const offsetY = shadow.shadowOffset?.height || 0;
        const blurRadius = shadow.shadowRadius || 0;
        
        // Convert RGBA to values CSS can use
        const color = shadow.shadowColor || '#000';
        const opacity = shadow.shadowOpacity || 1;
        
        return {
          boxShadow: `${offsetX}px ${offsetY}px ${blurRadius}px rgba(0, 0, 0, ${opacity})`,
        } as any;
      }
    }
    return {} as ViewStyle;
  }
  
  // Return platform-specific shadow
  return shadowStyle as ViewStyle;
}

/**
 * Helper to create text styles with theme colors
 */
export function createTextStyle(
  theme: ReturnType<typeof useDesignSystem>,
  colorKey: keyof ReturnType<typeof useDesignSystem>['colors'],
  typographyVariant?: keyof ReturnType<typeof useDesignSystem>['typography']['fontSize']
): TextStyle {
  const baseStyle: TextStyle = {
    color: theme.colors[colorKey],
  };
  
  if (typographyVariant) {
    return {
      ...baseStyle,
      fontSize: theme.typography.fontSize[typographyVariant],
      fontFamily: theme.typography.fontFamily.base,
      lineHeight: theme.typography.fontSize[typographyVariant] * theme.typography.lineHeight.normal,
    };
  }
  
  return baseStyle;
} 