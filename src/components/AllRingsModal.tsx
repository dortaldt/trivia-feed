import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

import { useTopicRings } from '../hooks/useTopicRings';
import { TopicRingProgress } from '../types/topicRings';
import { AppleActivityRing } from './TopicRings';
import BottomSheet from './BottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AllRingsModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  activeTopic?: string; // Add activeTopic prop for glow effect
}

interface RingItemProps {
  ring: TopicRingProgress;
  onPress: () => void;
  isActive?: boolean; // Add isActive prop for glow effect
}

const RingItem: React.FC<RingItemProps> = ({ ring, onPress, isActive }) => {
  const progressPercentage = Math.round((ring.currentProgress / ring.targetAnswers) * 100);
  const nextLevelAnswers = ring.targetAnswers - ring.currentProgress;

  return (
    <TouchableOpacity style={styles.ringItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.ringItemLeft}>
        <AppleActivityRing
          size={60}
          strokeWidth={7}
          color={ring.color}
          progress={ring.currentProgress / ring.targetAnswers}
          icon={ring.icon}
          level={ring.level}
          isActive={isActive}
        />
      </View>
      
      <View style={styles.ringItemRight}>
        <View style={styles.ringItemHeader}>
          <ThemedText style={[styles.topicName, { color: ring.color }]}>
            {ring.topic.charAt(0).toUpperCase() + ring.topic.slice(1)}
          </ThemedText>
          <ThemedText style={styles.levelText}>Level {ring.level}</ThemedText>
        </View>
        
        <View style={styles.progressInfo}>
          <ThemedText style={styles.progressText}>
            {ring.currentProgress} / {ring.targetAnswers} answers
          </ThemedText>
          <ThemedText style={[styles.percentageText, { color: ring.color }]}>
            {progressPercentage}% complete
          </ThemedText>
        </View>
        
        {nextLevelAnswers > 0 && (
          <ThemedText style={styles.nextLevelText}>
            {nextLevelAnswers} more to Level {ring.level + 1}
          </ThemedText>
        )}
        
        <ThemedText style={styles.totalAnswersText}>
          {ring.totalCorrectAnswers} total correct
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
};

export const AllRingsModal: React.FC<AllRingsModalProps> = ({ visible, onClose, userId, activeTopic }) => {
  const insets = useSafeAreaInsets();
  const { allRings } = useTopicRings({ userId });

  // Convert allRings object to array and sort by total correct answers (descending)
  const ringsArray = Object.values(allRings).sort((a, b) => b.totalCorrectAnswers - a.totalCorrectAnswers);

  // Separate rings with progress from those without
  const ringsWithProgress = ringsArray.filter(ring => ring.totalCorrectAnswers > 0);
  const ringsWithoutProgress = ringsArray.filter(ring => ring.totalCorrectAnswers === 0);

  // Use a proper callback for closing to prevent re-renders
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Determine appropriate snap points based on platform
  const snapPoints = Platform.OS === 'ios' 
    ? ['65%', '90%'] 
    : ['70%', '90%'];

  return (
    <BottomSheet
      isVisible={visible}
      onClose={handleClose}
      title="All Topic Rings"
      snapPoints={snapPoints}
    >
      <View style={[
        styles.container,
        { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }
      ]}>
        {/* Stats Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>{ringsArray.length}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Total Topics</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>{ringsWithProgress.length}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Active Rings</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryNumber}>
              {ringsArray.reduce((sum, ring) => sum + ring.totalCorrectAnswers, 0)}
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>Total Correct</ThemedText>
          </View>
        </View>

        {/* Rings List */}
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS === 'ios'}
          overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {ringsWithProgress.length > 0 && (
            <>
              <ThemedText style={styles.sectionTitle}>Active Rings</ThemedText>
              {ringsWithProgress.map((ring) => {
                // More robust topic matching - normalize case and trim whitespace
                const normalizedRingTopic = ring.topic.toLowerCase().trim();
                const normalizedActiveTopic = activeTopic?.toLowerCase().trim();
                const isRingActive = normalizedRingTopic === normalizedActiveTopic;
                
                // console.log(`[AllRingsModal] Checking ring "${ring.topic}" (normalized: "${normalizedRingTopic}") against activeTopic "${activeTopic}" (normalized: "${normalizedActiveTopic}") -> isActive: ${isRingActive}`);
                
                return (
                  <RingItem
                    key={ring.topic}
                    ring={ring}
                    isActive={isRingActive}
                    onPress={() => {
                      // Could open detailed ring modal here
                      console.log(`Tapped on ${ring.topic} ring`);
                    }}
                  />
                );
              })}
            </>
          )}

          {ringsWithoutProgress.length > 0 && (
            <>
              <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>
                Available Topics
              </ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                Answer questions in these topics to start your rings
              </ThemedText>
              {ringsWithoutProgress.map((ring) => (
                <View key={ring.topic} style={styles.inactiveRingItem}>
                  <View style={styles.inactiveRingIcon}>
                    <Feather name={ring.icon as any} size={20} color={ring.color} />
                  </View>
                  <ThemedText style={styles.inactiveRingText}>
                    {ring.topic.charAt(0).toUpperCase() + ring.topic.slice(1)}
                  </ThemedText>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    marginTop: -8,
  },
  ringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ringItemLeft: {
    marginRight: 16,
  },
  ringItemRight: {
    flex: 1,
  },
  ringItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    opacity: 0.8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextLevelText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  totalAnswersText: {
    fontSize: 12,
    opacity: 0.6,
  },
  inactiveRingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.02)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  inactiveRingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inactiveRingText: {
    fontSize: 14,
    opacity: 0.6,
  },
}); 