/**
 * Theme color hook that supports both system theme (light/dark) and custom themes (default/neon)
 */

import { Colors } from '@/constants/Colors';
import { NeonColors } from '@/constants/NeonColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTheme } from '@/src/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const systemColorScheme = useColorScheme() ?? 'light';
  const { theme, colorScheme } = useTheme();
  
  // First check if props override exists for current color scheme
  const colorFromProps = props[colorScheme];
  if (colorFromProps) {
    return colorFromProps;
  }
  
  // Then get color from appropriate theme
  if (theme === 'neon') {
    return NeonColors[colorScheme][colorName];
  } else {
    return Colors[colorScheme][colorName];
  }
}
