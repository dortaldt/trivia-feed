import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { trackButtonClick } from '../lib/mixpanelAnalytics';

interface TrackedButtonProps extends TouchableOpacityProps {
  buttonName: string;
  eventProperties?: Record<string, any>;
}

/**
 * A button component that automatically tracks clicks in Mixpanel
 */
export const TrackedButton: React.FC<TrackedButtonProps> = ({
  buttonName,
  eventProperties = {},
  onPress,
  children,
  ...props
}) => {
  const handlePress = (e: any) => {
    // Track the button click
    trackButtonClick(buttonName, eventProperties);
    
    // Call the original onPress if provided
    if (onPress) {
      onPress(e);
    }
  };
  
  return (
    <TouchableOpacity {...props} onPress={handlePress}>
      {children}
    </TouchableOpacity>
  );
};

export default TrackedButton; 