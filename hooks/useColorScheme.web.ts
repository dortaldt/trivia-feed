import { useEffect, useState, useRef } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // Use useRef instead of useState to avoid triggering re-renders
  const hasHydratedRef = useRef(false);
  
  // Run this effect only once to set the hydration flag
  useEffect(() => {
    hasHydratedRef.current = true;
  }, []);

  const colorScheme = useRNColorScheme();

  // Use the ref value directly without triggering re-renders
  if (hasHydratedRef.current) {
    return colorScheme;
  }

  return 'dark';
}
