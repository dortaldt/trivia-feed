import { useColorScheme } from 'react-native';
import designSystem, { colors } from '../design';

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
 * Helper to get topic-specific colors
 */
export function getTopicColor(category: string): string {
  const topicColors = designSystem.topicColors as Record<string, string>;
  
  // Try to get direct match
  if (topicColors[category]) {
    return topicColors[category];
  }
  
  // Try to find a partial match
  const partialMatch = Object.keys(topicColors).find(key => 
    category.toLowerCase().includes(key.toLowerCase()) || 
    key.toLowerCase().includes(category.toLowerCase())
  );
  
  if (partialMatch) {
    return topicColors[partialMatch];
  }
  
  // Return default color if no match found
  return topicColors.default;
}

// For backward compatibility
export const getCategoryColor = getTopicColor; 