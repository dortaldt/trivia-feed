import { categoryColors } from '../lib/colors';
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
  // Use the imported colors or fall back to hard-coded values
  if (categoryColors && typeof categoryColors === 'object') {
    // Try to get direct match
    if (categoryColors[category]) {
      return categoryColors[category];
    }
    
    // Try to find a partial match
    const partialMatch = Object.keys(categoryColors).find(key => 
      category.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(category.toLowerCase())
    );
    
    if (partialMatch) {
      return categoryColors[partialMatch];
    }
    
    // Return default color if no match found
    return categoryColors.default || '#455A64';
  }
  
  // Fall back to hard-coded values if import fails
  const defaultCategoryColors: Record<string, string> = {
    'Music': '#6200EA',           // Deep Purple
    'Entertainment': '#FF4081',   // Pink
    'Science': '#00B8D4',         // Cyan  
    'History': '#D500F9',         // Purple
    'Pop Culture': '#FFD600',     // Yellow
    'Miscellaneous': '#FF9800',   // Orange
    'default': '#455A64',         // Blue Grey
  };
  
  // Try to get direct match from fallback
  if (defaultCategoryColors[category]) {
    return defaultCategoryColors[category];
  }
  
  // Try to find a partial match in fallback
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