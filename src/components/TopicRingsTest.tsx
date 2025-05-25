import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { TopicRings } from './TopicRings';
import { DEFAULT_RING_CONFIG } from '../types/topicRings';
import { useAppDispatch } from '../store/hooks';
import { answerQuestion } from '../store/triviaSlice';
import { Feather } from '@expo/vector-icons';

// Test component to demonstrate TopicRings with smooth transitions
export const TopicRingsTest: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedTopic, setSelectedTopic] = useState<string>('Science');
  
  // Demo topics
  const topics = ['Science', 'History', 'Sports', 'Geography', 'Literature'];
  
  // Simulate answering a question correctly
  const simulateCorrectAnswer = (topic: string) => {
    const mockQuestionId = `test-${Date.now()}-${Math.random()}`;
    dispatch(answerQuestion({
      questionId: mockQuestionId,
      answerIndex: 0,
      isCorrect: true,
      userId: undefined // Guest mode for testing
    }));
  };
  
  // Auto-simulate answers to demonstrate transitions
  const [autoMode, setAutoMode] = useState(false);
  
  useEffect(() => {
    if (!autoMode) return;
    
    const interval = setInterval(() => {
      // Randomly select a topic
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      simulateCorrectAnswer(randomTopic);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [autoMode]);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Topic Rings Animation Test</ThemedText>
      
      <View style={styles.description}>
        <ThemedText style={styles.descriptionText}>
          Watch how rings smoothly transition when their order changes!
        </ThemedText>
      </View>
      
      <View style={styles.ringsContainer}>
        <TopicRings
          size={70}
          config={{
            ...DEFAULT_RING_CONFIG,
            baseTargetAnswers: 3, // Lower for testing
          }}
          activeTopic={selectedTopic}
          onRingComplete={(topic, level) => {
            console.log(`🎉 Ring completed! ${topic} reached level ${level}`);
          }}
        />
      </View>
      
      <View style={styles.controls}>
        <ThemedText style={styles.sectionTitle}>Simulate Answers</ThemedText>
        
        <View style={styles.topicButtons}>
          {topics.map((topic) => (
            <TouchableOpacity
              key={topic}
              style={[
                styles.topicButton,
                selectedTopic === topic && styles.activeTopicButton
              ]}
              onPress={() => {
                setSelectedTopic(topic);
                simulateCorrectAnswer(topic);
              }}
            >
              <ThemedText style={[
                styles.topicButtonText,
                selectedTopic === topic && styles.activeTopicButtonText
              ]}>
                {topic}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.autoButton, autoMode && styles.autoButtonActive]}
          onPress={() => setAutoMode(!autoMode)}
        >
          <Feather 
            name={autoMode ? 'pause' : 'play'} 
            size={20} 
            color="white" 
          />
          <ThemedText style={styles.autoButtonText}>
            {autoMode ? 'Stop Auto Mode' : 'Start Auto Mode'}
          </ThemedText>
        </TouchableOpacity>
        
        <ThemedText style={styles.hint}>
          {autoMode 
            ? 'Rings will automatically receive answers and reorder smoothly'
            : 'Tap topics to simulate correct answers and watch rings reorder'}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  ringsContainer: {
    marginVertical: 30,
    height: 120,
    justifyContent: 'center',
  },
  controls: {
    width: '100%',
    maxWidth: 400,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  topicButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  topicButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeTopicButton: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF10',
  },
  topicButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTopicButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  autoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#34C759',
    marginBottom: 15,
  },
  autoButtonActive: {
    backgroundColor: '#FF3B30',
  },
  autoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
  },
}); 