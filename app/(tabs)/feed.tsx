import React from 'react';
import FeedScreen from '../../src/features/feed/FeedScreen';
import { WebContainer } from '@/components/WebContainer';
import { Platform, View, StyleSheet } from 'react-native';

export default function Feed() {
  // For web, use a modern layout approach with full-width content
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrapper}>
        <FeedScreen />
      </View>
    );
  }
  
  // For mobile, just return FeedScreen directly
  return <FeedScreen />;
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    height: Platform.OS === 'web' ? 'calc(100svh - 49px)' as any : '100%',
    display: 'flex',
    overflow: 'hidden',
    width: '100%',
  }
});