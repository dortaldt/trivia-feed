import React from 'react';
import { View, ViewProps, Platform } from 'react-native';
import { createWebSafeViewProps } from '../../utils/webCompatibility';

/**
 * A View component that automatically handles React Native Web compatibility issues
 * by filtering out unsupported props and converting styles appropriately.
 */
export interface WebSafeViewProps extends ViewProps {
  children?: React.ReactNode;
}

export const WebSafeView: React.FC<WebSafeViewProps> = (props) => {
  // On web, clean the props to remove React Native specific attributes
  const safeProps = Platform.OS === 'web' ? createWebSafeViewProps(props) : props;
  
  return <View {...safeProps} />;
};

export default WebSafeView; 