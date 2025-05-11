import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

interface BasicLoadingScreenProps {
  message?: string;
}

/**
 * A simple loading screen that doesn't depend on any theme context
 * Used during initial app loading before theme providers are available
 */
const BasicLoadingScreen: React.FC<BasicLoadingScreenProps> = ({ 
  message = 'Loading...'
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Dark background that works well with both themes
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  }
});

export default BasicLoadingScreen; 