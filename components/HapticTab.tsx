import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';

export function HapticTab(props: BottomTabBarButtonProps) {
  const [hasImported, setHasImported] = useState(false);
  const [trackButtonClick, setTrackButtonClick] = useState<any>(null);
  
  // Dynamically import the tracking function
  useEffect(() => {
    if (!hasImported) {
      import('../src/lib/mixpanelAnalytics')
        .then((module) => {
          setTrackButtonClick(() => module.trackButtonClick);
          setHasImported(true);
        })
        .catch(err => console.error('Failed to load Mixpanel tracking:', err));
    }
  }, [hasImported]);

  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      onPress={(ev) => {
        // Track tab button click in Mixpanel
        if (hasImported && trackButtonClick) {
          // Get the tab name from the route
          const tabName = props.accessibilityState?.selected 
            ? `Tab ${props.accessibilityLabel || 'Unknown'} (already selected)`
            : `Tab ${props.accessibilityLabel || 'Unknown'}`;
            
          trackButtonClick(tabName, {
            location: 'TabBar',
            alreadySelected: !!props.accessibilityState?.selected,
          });
        }
        
        // Call the original onPress handler
        props.onPress?.(ev);
      }}
    />
  );
}
