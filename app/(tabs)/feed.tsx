import React from 'react';
import FeedScreen from '../../src/features/feed/FeedScreen';
import { WebContainer } from '@/components/WebContainer';
import { Platform, View, StyleSheet } from 'react-native';
import useSocialMeta from '@/src/hooks/useSocialMeta';

export default function Feed() {
  // Use the social meta hook for the feed page
  useSocialMeta({
    title: 'TriviaFeed - Challenge Your Knowledge',
    description: 'Get personalized trivia questions on TriviaFeed. Test your knowledge, compete with friends, and improve your score!',
    image: '/social-preview.png'
  });

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
    height: Platform.OS === 'web' ? 'calc(100svh - 70px)' as any : '100%',
    display: 'flex',
    overflow: 'hidden',
    width: '100%',
  }
});