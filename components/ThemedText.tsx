import { Text, type TextProps, StyleSheet, Platform } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'heading' | 'question';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'heading' ? styles.heading : undefined,
        type === 'question' ? styles.question : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Inter-Regular',
      default: 'Inter-Regular',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontFamily: Platform.select({
      ios: 'System-Bold',
      android: 'Inter-Bold',
      default: 'Inter-Bold',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontFamily: Platform.select({
      ios: 'System-Bold',
      android: 'Inter-Bold',
      default: 'Inter-Bold',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: Platform.select({
      ios: 'System-Bold',
      android: 'Inter-Bold',
      default: 'Inter-Bold',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
  heading: {
    fontFamily: Platform.select({
      ios: 'System-Bold',
      android: 'Inter-Bold',
      default: 'Inter-Bold',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    fontWeight: '700',
  },
  question: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'PlayfairDisplay-Regular',
      default: 'PlayfairDisplay-Regular',
      web: 'Georgia, Cambria, "Times New Roman", Times, serif',
    }),
    fontSize: 36,
    lineHeight: 43,
    letterSpacing: -0.5,
    fontWeight: '700',
  },
  link: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Inter-Regular',
      default: 'Inter-Regular',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }),
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
