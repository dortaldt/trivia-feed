/**
 * Theme color hook that supports multi-theme system
 */

import { useTheme } from '@/src/context/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ColorPalette } from '@/src/design/themes';

type ColorOverrides = {
  light?: string;
  dark?: string;
};

/**
 * Hook to get a theme color with support for overrides
 * 
 * @param props Optional overrides for light and dark mode
 * @param colorName Color key to use from the current theme
 * @returns The resolved color value
 */
export function useThemeColor(
  props: ColorOverrides = {},
  colorName: keyof ColorPalette
): string {
  const systemColorScheme = useColorScheme() ?? 'light';
  const { colorScheme, themeDefinition } = useTheme();
  
  // First check if props override exists for current color scheme
  const colorFromProps = props[colorScheme];
  if (colorFromProps) {
    return colorFromProps;
  }
  
  // Then get color from appropriate theme
  const colors = themeDefinition.colors[colorScheme];
  return colors[colorName] || '';
}
