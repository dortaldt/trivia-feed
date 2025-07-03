import React from 'react';
import FeedScreen from '../../src/features/feed/FeedScreen';
import { WebContainer } from '@/components/WebContainer';
import { Platform, View, StyleSheet } from 'react-native';
import useSocialMeta from '@/src/hooks/useSocialMeta';

export default function Feed() {
  // Use the social meta hook for the Friends-themed feed page
  useSocialMeta({
    title: 'Trivia Feed Friends - How much do you know Friends?',
    description: 'Could you BE a more Friends fan? Test your knowledge of Central Perk, the gang, and all those iconic moments. Join thousands of Friends fans in epic trivia battles!',
    image: '/social-preview.png',
    url: '/feed'
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