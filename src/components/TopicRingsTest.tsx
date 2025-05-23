import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { TopicRings } from './TopicRings';
import { DEFAULT_RING_CONFIG } from '../types/topicRings';

// Test component to demonstrate TopicRings
export const TopicRingsTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Topic Rings Test</ThemedText>
      <View style={styles.ringsContainer}>
        <TopicRings
          size={60}
          config={{
            ...DEFAULT_RING_CONFIG,
            baseTargetAnswers: 3, // Lower for testing
          }}
          onRingComplete={(topic, level) => {
            console.log(`🎉 Ring completed! ${topic} reached level ${level}`);
          }}
        />
      </View>
      <ThemedText style={styles.description}>
        Answer questions correctly to fill the rings and level up!
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  ringsContainer: {
    marginVertical: 20,
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(240, 240, 240, 0.3)',
    borderRadius: 15,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    lineHeight: 22,
  },
}); 