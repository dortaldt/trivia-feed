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
    'Science': '#3498db',
    'Technology': '#2980b9',
    'History': '#8e44ad',
    'Geography': '#27ae60',
    'Sports': '#e67e22',
    'Movies': '#7f8c8d',
    'Music': '#9b59b6',
    'Television': '#34495e',
    'Literature': '#c0392b',
    'Art': '#e74c3c',
    'Pop Culture': '#f39c12',
    'Food & Drink': '#d35400',
    'General Knowledge': '#16a085',
    'Nature': '#2ecc71',
    'Politics': '#95a5a6',
    'Celebrities': '#f1c40f',
    'Modern Cinema': '#2c3e50',
    'Mathematics': '#1abc9c',
    'Language': '#3498db',
    'Mythology': '#8e44ad',
    'Animals': '#27ae60',
    'default': '#34495e',
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