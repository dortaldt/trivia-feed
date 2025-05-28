import { Platform } from 'react-native';

/**
 * Utility to suppress React Native Web warnings for known compatibility issues
 */
export const suppressWebWarnings = () => {
  if (Platform.OS === 'web') {
    // Suppress the collapsable prop warning
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const message = args[0];
      if (
        typeof message === 'string' &&
        (message.includes('Received `false` for a non-boolean attribute `collapsable`') ||
         message.includes('Invalid DOM property `transform-origin`') ||
         message.includes('Did you mean `transformOrigin`?'))
      ) {
        // Suppress these specific warnings
        return;
      }
      originalConsoleWarn.apply(console, args);
    };
  }
};

/**
 * Clean props for web rendering by removing React Native specific props
 */
export const cleanPropsForWeb = (props: any) => {
  if (Platform.OS !== 'web') {
    return props;
  }

  const { collapsable, removeClippedSubviews, ...cleanProps } = props;
  return cleanProps;
};

/**
 * Convert React Native transform styles to web-compatible styles
 */
export const webCompatibleTransform = (style: any) => {
  if (Platform.OS !== 'web' || !style) {
    return style;
  }

  const webStyle = { ...style };
  
  // Convert transform-origin to transformOrigin if present
  if (webStyle['transform-origin']) {
    webStyle.transformOrigin = webStyle['transform-origin'];
    delete webStyle['transform-origin'];
  }

  return webStyle;
};

/**
 * Create web-safe View props
 */
export const createWebSafeViewProps = (props: any) => {
  if (Platform.OS !== 'web') {
    return props;
  }

  return {
    ...cleanPropsForWeb(props),
    style: webCompatibleTransform(props.style),
  };
}; 