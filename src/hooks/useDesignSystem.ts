import { useTheme } from '../context/ThemeContext';
import { ThemeDefinition } from '../design/themes';

/**
 * Hook for accessing the design system with current theme awareness
 * This provides a centralized way to access all design tokens with the correct theme applied
 */
export function useDesignSystem() {
  const { colorScheme, themeDefinition } = useTheme();
  const isDark = colorScheme === 'dark';
  
  // Get the colors for the current color scheme
  const themeColors = isDark ? themeDefinition.colors.dark : themeDefinition.colors.light;

  return {
    colors: themeColors,
    typography: themeDefinition.typography,
    spacing: themeDefinition.spacing,
    borderRadius: themeDefinition.borderRadius,
    shadows: themeDefinition.shadows,
    animations: themeDefinition.animations,
    isDark,
    colorScheme,
  };
}

/**
 * Hook to get a specific color from the current theme
 */
export function useThemeColor(colorName: keyof ReturnType<typeof useDesignSystem>['colors']) {
  const { colors } = useDesignSystem();
  return colors[colorName];
}

/**
 * Helper to get category-specific colors
 */
export function getCategoryColor(category: string, theme?: ThemeDefinition): string {
  // Default category colors
  const defaultCategoryColors: Record<string, string> = {
    'Science': '#00B8D4',         // Cyan
    'Technology': '#304FFE',      // Indigo
    'History': '#D500F9',         // Purple
    'Geography': '#00C853',       // Green
    'Sports': '#FF6D00',          // Orange
    'Movies': '#FF1744',          // Red-Pink
    'Music': '#6200EA',           // Deep Purple
    'Television': '#0091EA',      // Light Blue
    'Literature': '#D50000',      // Red
    'Art': '#F50057',             // Pink
    'Pop Culture': '#FFD600',     // Yellow
    'Food & Drink': '#FF3D00',    // Deep Orange
    'General Knowledge': '#00BFA5', // Teal
    'Nature': '#64DD17',          // Light Green
    'Politics': '#651FFF',        // Deep Purple
    'Celebrities': '#FFC400',     // Amber
    'Modern Cinema': '#C51162',   // Pink
    'Mathematics': '#00BFA5',     // Teal
    'Language': '#2962FF',        // Blue
    'Mythology': '#AA00FF',       // Purple
    'Animals': '#76FF03',         // Light Green
    'default': '#455A64',         // Blue Grey
  };
  
  // Try to get direct match
  if (defaultCategoryColors[category]) {
    return defaultCategoryColors[category];
  }
  
  // Try to find a partial match
  const partialMatch = Object.keys(defaultCategoryColors).find(key => 
    category.toLowerCase().includes(key.toLowerCase()) || 
    key.toLowerCase().includes(category.toLowerCase())
  );
  
  if (partialMatch) {
    return defaultCategoryColors[partialMatch];
  }
  
  // Return default color if no match found
  return defaultCategoryColors.default;
} 