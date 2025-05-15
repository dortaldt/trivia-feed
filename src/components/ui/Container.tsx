import React from 'react';
import { 
  View, 
  ViewProps, 
  StyleSheet, 
  StyleProp, 
  ViewStyle, 
  Platform 
} from 'react-native';
import { withThemedStyles, createShadow } from './ThemedComponent';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/src/context/ThemeContext';

/**
 * Container variants for styling
 */
export type ContainerVariant = 
  | 'default'      // Standard container
  | 'card'         // Elevated card with shadow
  | 'glass'        // Glass effect with blur
  | 'outlined'     // Container with border
  | 'surface'      // Secondary background color
  | 'elevated';    // Similar to card but with stronger shadow

/**
 * Container props with theming options
 */
export interface ContainerProps extends ViewProps {
  variant?: ContainerVariant;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  fullHeight?: boolean;
  padded?: boolean | number;
  centered?: boolean;
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'full';
  theme?: 'light' | 'dark' | 'auto';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Base container component
 */
const ContainerBase: React.FC<ContainerProps> = ({ 
  variant = 'default',
  style,
  children,
  theme: themeProp = 'auto',
  ...rest
}) => {
  const { currentTheme, colorScheme } = useTheme();
  const isNeonTheme = currentTheme === 'neon';
  
  // If a glass variant is used, we use BlurView for the effect on supported platforms
  if (variant === 'glass') {
    // Determine blur intensity based on theme
    const blurIntensity = currentTheme === 'neon' ? 60 : 40;
    
    // Determine tint mode
    let tintMode = colorScheme;
    if (themeProp !== 'auto') {
      tintMode = themeProp;
    }
    
    // On web, we can't use BlurView, so we fall back to a semi-transparent background
    if (Platform.OS === 'web') {
      return (
        <View 
          style={[
            style,
            {
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            } as any
          ]}
          {...rest}
        >
          {children}
        </View>
      );
    }
    
    return (
      <BlurView
        intensity={blurIntensity}
        tint={tintMode}
        style={style}
        {...rest}
      >
        {children}
      </BlurView>
    );
  }
  
  // Regular View for all other variants
  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
};

/**
 * Themed container using HOC pattern
 */
const Container = withThemedStyles<ContainerProps>(
  ContainerBase,
  (theme, props) => {
    const { 
      variant = 'default',
      elevation = variant === 'card' || variant === 'elevated' ? 'md' : 'none',
      padded = false,
      centered = false,
      rounded = false,
      fullWidth = false,
      fullHeight = false,
    } = props;
    
    // Add currentTheme from useTheme hook
    const { currentTheme } = useTheme();
    
    // Get base styles for the container
    const baseStyle: ViewStyle = {
      width: fullWidth ? '100%' : undefined,
      height: fullHeight ? '100%' : undefined,
    };
    
    // Add padding if requested
    if (padded !== false) {
      baseStyle.padding = typeof padded === 'number' ? padded : theme.spacing.md;
    }
    
    // Add centering if requested
    if (centered) {
      baseStyle.justifyContent = 'center';
      baseStyle.alignItems = 'center';
    }
    
    // Add border radius if requested
    if (rounded !== false) {
      if (rounded === true) {
        baseStyle.borderRadius = theme.borderRadius.md;
      } else if (rounded === 'sm') {
        baseStyle.borderRadius = theme.borderRadius.sm;
      } else if (rounded === 'md') {
        baseStyle.borderRadius = theme.borderRadius.md;
      } else if (rounded === 'lg') {
        baseStyle.borderRadius = theme.borderRadius.lg;
      } else if (rounded === 'full') {
        baseStyle.borderRadius = theme.borderRadius.full;
      }
    }
    
    // Apply variant-specific styles
    switch (variant) {
      case 'card':
        if (theme.colorScheme === 'dark' && currentTheme === 'neon') {
          return {
            ...baseStyle,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderWidth: 1,
            borderColor: theme.colors.primary,
            ...createShadow(theme, elevation),
            borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.md,
            overflow: 'hidden', // Ensure the glow doesn't leak outside
          };
        }
        
        return {
          ...baseStyle,
          backgroundColor: theme.colors.card,
          ...createShadow(theme, elevation),
          borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.md,
        };
        
      case 'glass':
        if (Platform.OS === 'web' && currentTheme === 'neon') {
          return {
            ...baseStyle,
            backgroundColor: 'rgba(10, 10, 20, 0.5)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderWidth: 1,
            borderColor: `${theme.colors.primary}60`,
            boxShadow: `0 0 10px ${theme.colors.primary}, 0 0 20px rgba(0, 255, 255, 0.3)`,
            borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.md,
            overflow: 'hidden',
          } as any;
        }
        
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          overflow: 'hidden',
          borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.md,
        };
        
      case 'outlined':
        if (currentTheme === 'neon') {
          return {
            ...baseStyle,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
            ...createShadow(theme, 'sm'),
            borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.md,
          };
        }
        
        return {
          ...baseStyle,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.md,
        };
        
      case 'surface':
        if (currentTheme === 'neon') {
          return {
            ...baseStyle,
            backgroundColor: 'rgba(10, 10, 20, 0.6)',
            ...createShadow(theme, 'sm'),
            borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.sm,
          };
        }
        
        return {
          ...baseStyle,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.sm,
        };
        
      case 'elevated':
        if (currentTheme === 'neon') {
          return {
            ...baseStyle,
            backgroundColor: 'rgba(10, 10, 20, 0.7)',
            borderWidth: 1,
            borderColor: `${theme.colors.primary}50`,
            ...createShadow(theme, elevation),
            borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.md,
          };
        }
        
        return {
          ...baseStyle,
          backgroundColor: theme.colors.surface,
          ...createShadow(theme, elevation),
          borderRadius: rounded !== false ? baseStyle.borderRadius : theme.borderRadius.md,
        };
        
      case 'default':
      default:
        return {
          ...baseStyle,
          backgroundColor: theme.colors.background,
        };
    }
  }
);

export default Container; 