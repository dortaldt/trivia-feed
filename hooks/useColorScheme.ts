/**
 * Custom useColorScheme hook that always returns 'dark' 
 * regardless of system settings for consistent dark mode across all platforms (iOS, Android, web)
 */
import { ColorSchemeName } from 'react-native';

export function useColorScheme(): NonNullable<ColorSchemeName> {
  // Always return dark theme regardless of system settings (for iOS, Android, web)
  return 'dark';
}
