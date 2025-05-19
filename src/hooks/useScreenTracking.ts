import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { trackScreenView } from '../lib/mixpanelAnalytics';

/**
 * Hook to track screen views in Mixpanel
 * @param additionalProperties Additional properties to include with screen view events
 */
export const useScreenTracking = (additionalProperties: Record<string, any> = {}) => {
  const pathname = usePathname();
  
  useEffect(() => {
    // Skip tracking for irrelevant paths
    if (!pathname) return;
    
    // Extract screen name from path
    const screenName = pathname.split('/').pop() || 'home';
    
    // Track screen view
    trackScreenView(screenName, {
      path: pathname,
      ...additionalProperties,
    });
  }, [pathname, additionalProperties]);
};

export default useScreenTracking; 