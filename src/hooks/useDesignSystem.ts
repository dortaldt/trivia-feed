import { useColorScheme } from 'react-native';
import designSystem from '../design';
import { colors } from '../design';

/**
 * Hook for accessing the design system with current theme awareness
 * This provides a centralized way to access all design tokens with the correct theme applied
 */
export function useDesignSystem() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  return {
    ...designSystem,
    colors: themeColors,
    rawColors: colors, // Access to both light and dark color schemes
    isDark,
    colorScheme,
  };
}

/**
 * Helper to get category-specific colors
 */
export function getCategoryColor(category: string): string {
  const categoryColors = designSystem.categoryColors as Record<string, string>;
  
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
  return categoryColors.default;
} 