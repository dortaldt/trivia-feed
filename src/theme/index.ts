import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// shadcn design system colors, modified for React Native
export const colors = {
  // Base colors
  background: '#09090b',
  foreground: '#fafafa',
  card: '#1c1c1c',
  border: '#27272a',
  muted: '#3f3f46',
  mutedForeground: '#a1a1aa',
  
  // Primary colors
  primary: '#ffc107', // Primary color (yellow)
  primaryForeground: '#000000',
  
  // Secondary colors
  secondary: '#2c3e50',
  secondaryForeground: '#fafafa',
  
  // Accent colors
  accent: '#f59e0b',
  accentForeground: '#18181b',
  
  // Destructive/error colors
  destructive: '#ef4444',
  destructiveForeground: '#fafafa',
  
  // Success colors
  success: '#10b981',
  successForeground: '#fafafa',
  
  // Warning colors
  warning: '#f59e0b',
  warningForeground: '#18181b',
  
  // Info colors
  info: '#3b82f6',
  infoForeground: '#fafafa',
};

// Light mode theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    background: '#fafafa',
    surface: '#ffffff',
    accent: colors.accent,
    error: colors.destructive,
    text: colors.background,
    onSurface: colors.foreground,
    disabled: colors.mutedForeground,
    outline: colors.border,
    notification: colors.accent,
  },
  roundness: 8,
};

// Dark mode theme (default for the app)
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.card,
    accent: colors.accent,
    error: colors.destructive,
    text: colors.foreground,
    onSurface: colors.foreground,
    disabled: colors.mutedForeground,
    outline: colors.border,
    notification: colors.accent,
  },
  roundness: 8,
};

// Commonly used spacing values (in pixels)
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
};

// Commonly used border radius values
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Typography scale
export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};

// Button variants
export const buttons = {
  // Size variants
  sizes: {
    xs: {
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[5],
      borderRadius: borderRadius.sm,
      fontSize: typography.fontSizes.sm,
      iconSpacing: spacing[2],
      minHeight: 40,
    },
    sm: {
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      borderRadius: borderRadius.md,
      fontSize: typography.fontSizes.md,
      iconSpacing: spacing[3],
      minHeight: 44,
    },
    md: {
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[7],
      borderRadius: borderRadius.md,
      fontSize: typography.fontSizes.lg,
      iconSpacing: spacing[3],
      minHeight: 52,
    },
    lg: {
      paddingVertical: spacing[5],
      paddingHorizontal: spacing[8],
      borderRadius: borderRadius.lg,
      fontSize: typography.fontSizes.xl,
      iconSpacing: spacing[4],
      minHeight: 60,
    },
  },
  
  // Style variants
  variants: {
    primary: {
      backgroundColor: colors.primary,
      color: '#000000',
    },
    secondary: {
      backgroundColor: colors.secondary,
      color: colors.secondaryForeground,
    },
    accent: {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
    outline: {
      backgroundColor: 'transparent',
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.foreground,
    },
    destructive: {
      backgroundColor: colors.destructive,
      color: colors.destructiveForeground,
    },
    success: {
      backgroundColor: colors.success,
      color: colors.successForeground,
    },
    warning: {
      backgroundColor: colors.warning,
      color: colors.warningForeground,
    },
    info: {
      backgroundColor: colors.info,
      color: colors.infoForeground,
    },
  },
};

export default {
  colors,
  lightTheme,
  darkTheme,
  spacing,
  borderRadius,
  typography,
  buttons,
}; 