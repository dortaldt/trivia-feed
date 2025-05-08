import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import ProfileView from '@/src/features/profile/ProfileView';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  
  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ProfileView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 