/**
 * Theme Definitions
 * 
 * This file contains the definitions for all available themes in the application.
 * Each theme includes color palettes, styling variables, and other theme-specific settings.
 */

import { Platform } from 'react-native';

// Define the theme definition interface
export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  typography: TypographyDefinition;
  spacing: SpacingDefinition;
  borderRadius: BorderRadiusDefinition;
  shadows: ShadowDefinition;
  animations: AnimationDefinition;
}

// Interface for theme colors with light and dark variants
export interface ThemeColors {
  light: ColorPalette;
  dark: ColorPalette;
}

// Color palette interface
export interface ColorPalette {
  // Core theme colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  
  accent: string;
  accentLight: string;
  accentDark: string;
  
  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverted: string;
  
  // UI element colors
  border: string;
  divider: string;
  outline: string;
  
  // Component-specific colors
  icon: string;
  shadow: string;
  overlay: string;

  // Tab navigation colors
  tabIconDefault: string;
  tabIconSelected: string;
}

// Typography definition interface
interface TypographyDefinition {
  fontFamily: {
    base: string;
    bold: string;
    serif: string;
    monospace: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  fontWeight: {
    light: string;
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
}

// Spacing definition
interface SpacingDefinition {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

// Border radius definition
interface BorderRadiusDefinition {
  none: number;
  sm: number;
  md: number;
  lg: number;
  full: number;
}

// Shadow definition
interface ShadowDefinition {
  none: object;
  sm: object;
  md: object;
  lg: object;
}

// Animation definition
interface AnimationDefinition {
  duration: {
    faster: number;
    fast: number;
    normal: number;
    slow: number;
  };
  easing: {
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    linear: string;
  };
}

// Base font families based on platform
const baseFontFamily = {
  base: Platform.select({
    ios: 'System',
    android: 'Inter-Regular',
    default: 'Inter-Regular',
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }) || 'System',
  bold: Platform.select({
    ios: 'System-Bold',
    android: 'Inter-Bold',
    default: 'Inter-Bold',
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }) || 'System-Bold',
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
    web: 'Georgia, serif',
  }) || 'Georgia',
  monospace: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
    web: 'Menlo, monospace',
  }) || 'Menlo',
};

// Base shared typography
const baseTypography: TypographyDefinition = {
  fontFamily: baseFontFamily,
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

// Base shared spacing
const baseSpacing: SpacingDefinition = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// Base shared border radius
const baseBorderRadius: BorderRadiusDefinition = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
};

// Base shared shadows
const baseShadows: ShadowDefinition = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
    },
    android: {
      elevation: 1,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
    },
  }) || {},
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
    },
    android: {
      elevation: 3,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
    },
  }) || {},
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
    },
    android: {
      elevation: 8,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
    },
  }) || {},
};

// Base shared animations
const baseAnimations: AnimationDefinition = {
  duration: {
    faster: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
  },
};

// Default theme definition
export const defaultTheme: ThemeDefinition = {
  id: 'default',
  name: 'Default',
  description: 'The default application theme with a clean, modern look',
  colors: {
    light: {
      // Core theme colors
      primary: '#ffc107',    // Main brand color (yellow)
      primaryLight: '#fff350',
      primaryDark: '#c79100',
      
      secondary: '#03a9f4',  // Blue
      secondaryLight: '#67daff',
      secondaryDark: '#007ac1',
      
      accent: '#ff5722',     // Orange
      accentLight: '#ff8a50',
      accentDark: '#c41c00',
      
      // Semantic colors
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
      
      // Background colors
      background: '#f5f5f5',
      surface: '#ffffff',
      surfaceVariant: '#eeeeee',
      card: '#ffffff',
      
      // Text colors
      text: '#212121',
      textSecondary: '#757575',
      textTertiary: '#9e9e9e',
      textInverted: '#ffffff',
      
      // UI element colors
      border: '#e0e0e0',
      divider: '#e0e0e0',
      outline: '#bdbdbd',
      
      // Component-specific colors
      icon: '#757575',
      shadow: 'rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      
      // Tab navigation colors
      tabIconDefault: '#757575',
      tabIconSelected: '#ffc107',
    },
    dark: {
      // Core theme colors
      primary: '#ffc107',    // Main brand color (yellow)
      primaryLight: '#fff350',
      primaryDark: '#c79100',
      
      secondary: '#03a9f4',  // Blue
      secondaryLight: '#67daff',
      secondaryDark: '#007ac1',
      
      accent: '#ff5722',     // Orange
      accentLight: '#ff8a50',
      accentDark: '#c41c00',
      
      // Semantic colors
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
      
      // Background colors
      background: '#121212',
      surface: '#1e1e1e',
      surfaceVariant: '#2c2c2c',
      card: '#1e1e1e',
      
      // Text colors
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      textTertiary: '#757575',
      textInverted: '#212121',
      
      // UI element colors
      border: '#424242',
      divider: '#424242',
      outline: '#757575',
      
      // Component-specific colors
      icon: '#b0b0b0',
      shadow: 'rgba(0, 0, 0, 0.2)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      
      // Tab navigation colors
      tabIconDefault: '#b0b0b0',
      tabIconSelected: '#ffc107',
    },
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
  animations: baseAnimations,
};

// Neon theme definition
export const neonTheme: ThemeDefinition = {
  id: 'neon',
  name: 'Neon',
  description: 'A vibrant, high-contrast theme with neon glow effects',
  colors: {
    light: {
      // Core theme colors
      primary: '#00FFFF',    // Cyan
      primaryLight: '#80FFFF',
      primaryDark: '#00CCCC',
      
      secondary: '#FF00FF',  // Magenta
      secondaryLight: '#FF80FF',
      secondaryDark: '#CC00CC',
      
      accent: '#FFFF00',     // Yellow
      accentLight: '#FFFF80',
      accentDark: '#CCCC00',
      
      // Semantic colors
      success: '#00FF00',    // Green
      warning: '#FFFF00',    // Yellow
      error: '#FF0000',      // Red
      info: '#00CDFF',       // Blue
      
      // Background colors
      background: '#FFFFFF',
      surface: '#F8F8F8',
      surfaceVariant: '#F0F0F0',
      card: '#FFFFFF',
      
      // Text colors
      text: '#121212',
      textSecondary: '#333333',
      textTertiary: '#757575',
      textInverted: '#FFFFFF',
      
      // UI element colors
      border: '#00FFFF',
      divider: '#E0E0E0',
      outline: '#00FFFF80',
      
      // Component-specific colors
      icon: '#FF00FF',
      shadow: 'rgba(0, 255, 255, 0.4)',
      overlay: 'rgba(0, 0, 15, 0.7)',
      
      // Tab navigation colors
      tabIconDefault: '#757575',
      tabIconSelected: '#00FFFF',
    },
    dark: {
      // Core theme colors
      primary: '#00FFFF',    // Cyan
      primaryLight: '#80FFFF',
      primaryDark: '#00CCCC',
      
      secondary: '#FF00FF',  // Magenta
      secondaryLight: '#FF80FF',
      secondaryDark: '#CC00CC',
      
      accent: '#FFFF00',     // Yellow
      accentLight: '#FFFF80',
      accentDark: '#CCCC00',
      
      // Semantic colors
      success: '#00FF00',    // Green
      warning: '#FFFF00',    // Yellow
      error: '#FF0000',      // Red
      info: '#00CDFF',       // Blue
      
      // Background colors
      background: '#000000',
      surface: '#0D0D0D',
      surfaceVariant: '#1A1A1A',
      card: '#0D0D0D',
      
      // Text colors
      text: '#FFFFFF',
      textSecondary: '#B0B0B0',
      textTertiary: '#757575',
      textInverted: '#121212',
      
      // UI element colors
      border: '#00FFFF',
      divider: '#333333',
      outline: '#00FFFF80',
      
      // Component-specific colors
      icon: '#FF00FF',
      shadow: 'rgba(0, 255, 255, 0.6)',
      overlay: 'rgba(0, 0, 15, 0.8)',
      
      // Tab navigation colors
      tabIconDefault: '#B0B0B0',
      tabIconSelected: '#00FFFF',
    },
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
  animations: {
    ...baseAnimations,
    duration: {
      ...baseAnimations.duration,
      normal: 400, // Slightly slower for better neon effects
    },
  },
};

// Retro theme definition
export const retroTheme: ThemeDefinition = {
  id: 'retro',
  name: 'Retro',
  description: 'A nostalgic theme inspired by 80s/90s design aesthetics',
  colors: {
    light: {
      // Core theme colors
      primary: '#FF6B6B',    // Coral Red
      primaryLight: '#FF9E9E',
      primaryDark: '#CC5555',
      
      secondary: '#4ECDC4',  // Teal
      secondaryLight: '#7EDDD7',
      secondaryDark: '#3EA69F',
      
      accent: '#FFE66D',     // Pastel Yellow
      accentLight: '#FFF0A0',
      accentDark: '#D6BF5A',
      
      // Semantic colors
      success: '#7BC950',    // Pastel Green
      warning: '#FFB400',    // Amber
      error: '#F25F5C',      // Coral
      info: '#51BBFE',       // Sky Blue
      
      // Background colors
      background: '#F7F5FB',
      surface: '#FFFFFF',
      surfaceVariant: '#F0F0F0',
      card: '#FFFFFF',
      
      // Text colors
      text: '#2E3440',
      textSecondary: '#4C566A',
      textTertiary: '#9E9E9E',
      textInverted: '#FFFFFF',
      
      // UI element colors
      border: '#E0E0E0',
      divider: '#E0E0E0',
      outline: '#BDBDBD',
      
      // Component-specific colors
      icon: '#4C566A',
      shadow: 'rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      
      // Tab navigation colors
      tabIconDefault: '#9E9E9E',
      tabIconSelected: '#FF6B6B',
    },
    dark: {
      // Core theme colors
      primary: '#FF6B6B',    // Coral Red
      primaryLight: '#FF9E9E',
      primaryDark: '#CC5555',
      
      secondary: '#4ECDC4',  // Teal
      secondaryLight: '#7EDDD7',
      secondaryDark: '#3EA69F',
      
      accent: '#FFE66D',     // Pastel Yellow
      accentLight: '#FFF0A0',
      accentDark: '#D6BF5A',
      
      // Semantic colors
      success: '#7BC950',    // Pastel Green
      warning: '#FFB400',    // Amber
      error: '#F25F5C',      // Coral
      info: '#51BBFE',       // Sky Blue
      
      // Background colors
      background: '#2E3440',
      surface: '#3B4252',
      surfaceVariant: '#434C5E',
      card: '#3B4252',
      
      // Text colors
      text: '#ECEFF4',
      textSecondary: '#D8DEE9',
      textTertiary: '#AAAAAA',
      textInverted: '#2E3440',
      
      // UI element colors
      border: '#4C566A',
      divider: '#4C566A',
      outline: '#81A1C1',
      
      // Component-specific colors
      icon: '#D8DEE9',
      shadow: 'rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      
      // Tab navigation colors
      tabIconDefault: '#D8DEE9',
      tabIconSelected: '#FF6B6B',
    },
  },
  typography: {
    ...baseTypography,
    fontFamily: {
      ...baseFontFamily,
      base: Platform.select({
        ios: 'Futura',
        android: 'sans-serif',
        default: 'sans-serif',
        web: 'Futura, "Century Gothic", sans-serif',
      }) || 'Futura',
      bold: Platform.select({
        ios: 'Futura-Bold',
        android: 'sans-serif-medium',
        default: 'sans-serif-medium',
        web: 'Futura-Bold, "Century Gothic", sans-serif',
      }) || 'Futura-Bold',
    },
  },
  spacing: baseSpacing,
  borderRadius: {
    ...baseBorderRadius,
    md: 12, // More rounded corners for retro look
  },
  shadows: baseShadows,
  animations: baseAnimations,
};

// Modern theme definition
export const modernTheme: ThemeDefinition = {
  id: 'modern',
  name: 'Modern',
  description: 'A sleek, contemporary theme with a minimalist design',
  colors: {
    light: {
      // Core theme colors
      primary: '#6200EE',    // Purple
      primaryLight: '#9E47FF',
      primaryDark: '#4B01D0',
      
      secondary: '#03DAC6',  // Teal
      secondaryLight: '#66FFF8',
      secondaryDark: '#018786',
      
      accent: '#FF7597',     // Pink
      accentLight: '#FFA6C1',
      accentDark: '#D1426F',
      
      // Semantic colors
      success: '#00C853',
      warning: '#FFD600',
      error: '#B00020',
      info: '#2196F3',
      
      // Background colors
      background: '#F5F5F5',
      surface: '#FFFFFF',
      surfaceVariant: '#F1F1F1',
      card: '#FFFFFF',
      
      // Text colors
      text: '#121212',
      textSecondary: '#666666',
      textTertiary: '#888888',
      textInverted: '#FFFFFF',
      
      // UI element colors
      border: '#E0E0E0',
      divider: '#E0E0E0',
      outline: '#BDBDBD',
      
      // Component-specific colors
      icon: '#666666',
      shadow: 'rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      
      // Tab navigation colors
      tabIconDefault: '#888888',
      tabIconSelected: '#6200EE',
    },
    dark: {
      // Core theme colors
      primary: '#BB86FC',    // Light Purple
      primaryLight: '#D4BBFF',
      primaryDark: '#9A67EA',
      
      secondary: '#03DAC6',  // Teal
      secondaryLight: '#66FFF8',
      secondaryDark: '#018786',
      
      accent: '#CF6679',     // Pink
      accentLight: '#FF93A3',
      accentDark: '#9D3A4C',
      
      // Semantic colors
      success: '#00C853',
      warning: '#FFD600',
      error: '#CF6679',
      info: '#2196F3',
      
      // Background colors
      background: '#121212',
      surface: '#1E1E1E',
      surfaceVariant: '#252525',
      card: '#1E1E1E',
      
      // Text colors
      text: '#FFFFFF',
      textSecondary: '#B0B0B0',
      textTertiary: '#757575',
      textInverted: '#121212',
      
      // UI element colors
      border: '#2C2C2C',
      divider: '#2C2C2C',
      outline: '#444444',
      
      // Component-specific colors
      icon: '#B0B0B0',
      shadow: 'rgba(0, 0, 0, 0.2)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      
      // Tab navigation colors
      tabIconDefault: '#B0B0B0',
      tabIconSelected: '#BB86FC',
    },
  },
  typography: {
    ...baseTypography,
    fontFamily: {
      ...baseFontFamily,
      base: Platform.select({
        ios: 'System',
        android: 'sans-serif',
        default: 'sans-serif',
        web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }) || 'System',
      bold: Platform.select({
        ios: 'System-Bold',
        android: 'sans-serif-medium',
        default: 'sans-serif-medium',
        web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }) || 'System-Bold',
    },
  },
  spacing: baseSpacing,
  borderRadius: {
    ...baseBorderRadius,
    sm: 8,   // More rounded corners
    md: 16,  // More rounded corners
    lg: 24,  // More rounded corners
  },
  shadows: baseShadows,
  animations: {
    ...baseAnimations,
    duration: {
      faster: 50,   // Faster animations for modern feel
      fast: 150,
      normal: 250,
      slow: 400,
    },
  },
}; 