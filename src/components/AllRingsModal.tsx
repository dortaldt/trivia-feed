import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

import { useTopicRings } from '../hooks/useTopicRings';
import { TopicRingProgress } from '../types/topicRings';
import { AppleActivityRing } from './TopicRings';
import BottomSheet from './BottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { 
  Layout, 
  FadeInDown, 
  FadeOutUp,
  LinearTransition
} from 'react-native-reanimated';
import { trackAllRingsModal } from '../lib/mixpanelAnalytics';
import { useTheme } from '@/src/context/ThemeContext';
import { getLevelName } from '../utils/levelNames';

interface AllRingsModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  activeTopic?: string; // Add activeTopic prop for glow effect
  activeSubtopic?: string; // Add activeSubtopic prop for sub-topic highlighting
}

interface RingItemProps {
  ring: TopicRingProgress;
  onPress: () => void;
  isActive?: boolean; // Add isActive prop for glow effect
  index?: number;
}

const RingItem: React.FC<RingItemProps> = ({ ring, onPress, isActive, index = 0 }) => {
  const { isNeonTheme } = useTheme();

  const handlePress = () => {
    // Track ring selection
    trackAllRingsModal('ring_selected', {
      ringTopic: ring.topic,
      ringLevel: ring.level,
      ringProgress: Math.round((ring.currentProgress / ring.targetAnswers) * 100),
      totalCorrectAnswers: ring.totalCorrectAnswers,
      isSubTopic: ring.isSubTopic || false,
      parentTopic: ring.parentTopic || null,
      ringPosition: index !== undefined ? index + 1 : 0,
      isActiveTopic: isActive || false,
    });
    
    onPress();
  };

  const progressPercentage = Math.round((ring.currentProgress / ring.targetAnswers) * 100);
  const nextLevelAnswers = ring.targetAnswers - ring.currentProgress;

  return (
    <Reanimated.View
      style={[
        styles.ringItem,
        isActive && { borderColor: ring.color, borderWidth: 2 },
        isActive && isNeonTheme && Platform.OS === 'web' && {
          boxShadow: `0 0 15px ${ring.color}40, inset 0 0 10px ${ring.color}20`,
        } as any
      ]}
      layout={LinearTransition.springify().stiffness(200).damping(20)}
      entering={FadeInDown.delay((index || 0) * 50)}
      exiting={FadeOutUp.delay((index || 0) * 25)}
    >
      <TouchableOpacity
        style={styles.ringTouchable}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.ringContent}>
          <View style={styles.ringVisualization}>
            <AppleActivityRing
              size={40}
              strokeWidth={4}
              progress={ring.currentProgress / ring.targetAnswers}
              color={ring.color}
              icon={ring.icon}
              level={ring.level}
            />
          </View>
          
          <View style={styles.ringInfo}>
            <View style={styles.ringHeader}>
              <View style={[styles.ringIcon, { backgroundColor: `${ring.color}20` }]}>
                <Feather name={ring.icon as any} size={16} color={ring.color} />
              </View>
              <ThemedText style={[styles.ringTitle, isActive && { color: ring.color }]}>
                {ring.isSubTopic 
                  ? `${ring.parentTopic}: ${ring.topic}` 
                  : ring.topic.charAt(0).toUpperCase() + ring.topic.slice(1)
                }
              </ThemedText>
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: ring.color }]} />
              )}
            </View>
            
            <View style={styles.ringStats}>
              <ThemedText style={styles.ringLevel}>{getLevelName(ring.parentTopic || ring.topic, ring.isSubTopic ? ring.topic : null, ring.level)}</ThemedText>
              <ThemedText style={styles.ringProgress}>
                {ring.currentProgress}/{ring.targetAnswers} ({Math.round((ring.currentProgress / ring.targetAnswers) * 100)}%)
              </ThemedText>
              <ThemedText style={styles.ringTotal}>
                {ring.totalCorrectAnswers} total correct
              </ThemedText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Reanimated.View>
  );
};

export const AllRingsModal: React.FC<AllRingsModalProps> = ({ visible, onClose, userId, activeTopic, activeSubtopic }) => {
  const insets = useSafeAreaInsets();
  const { allRings } = useTopicRings({ userId });

  // Convert allRings object to array and sort by total correct answers (descending)
  const ringsArray = Object.values(allRings).sort((a, b) => b.totalCorrectAnswers - a.totalCorrectAnswers);

  // Separate rings with progress from those without
  const ringsWithProgress = ringsArray.filter(ring => ring.totalCorrectAnswers > 0);
  const ringsWithoutProgress = ringsArray.filter(ring => ring.totalCorrectAnswers === 0);

  // Use a proper callback for closing to prevent re-renders
  const handleClose = useCallback(() => {
    // Track modal close
    trackAllRingsModal('closed', {
      totalRingsShown: ringsArray.length,
      activeRingsShown: ringsWithProgress.length,
      inactiveRingsShown: ringsWithoutProgress.length,
      activeTopic: activeTopic || null,
    });
    
    onClose();
  }, [onClose, ringsArray.length, ringsWithProgress.length, ringsWithoutProgress.length, activeTopic]);

  // Track modal open
  React.useEffect(() => {
    if (visible) {
      trackAllRingsModal('opened', {
        totalRingsShown: ringsArray.length,
        activeRingsShown: ringsWithProgress.length,
        inactiveRingsShown: ringsWithoutProgress.length,
        activeTopic: activeTopic || null,
      });
    }
  }, [visible, ringsArray.length, ringsWithProgress.length, ringsWithoutProgress.length, activeTopic]);

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
              {ringsWithProgress.map((ring, index) => {
                // Check if this ring should be highlighted based on whether it's a sub-topic or regular topic
                const isRingActive = ring.isSubTopic 
                  ? !!(activeSubtopic && ring.topic.toLowerCase().trim() === activeSubtopic.toLowerCase().trim())
                  : !!(activeTopic && ring.topic.toLowerCase().trim() === activeTopic.toLowerCase().trim());
                
                // console.log(`[AllRingsModal] Checking ${ring.isSubTopic ? 'sub-topic' : 'topic'} ring "${ring.topic}" against ${ring.isSubTopic ? 'activeSubtopic' : 'activeTopic'} "${ring.isSubTopic ? activeSubtopic : activeTopic}" -> isActive: ${isRingActive}`);
                
                return (
                  <RingItem
                    key={ring.topic}
                    ring={ring}
                    isActive={isRingActive}
                    index={index}
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
              <ThemedText style={styles.sectionTitle}>Other Topics</ThemedText>
              <View style={styles.inactiveRingsContainer}>
                {ringsWithoutProgress.map((ring, index) => (
                  <View key={ring.topic} style={styles.inactiveRingItem}>
                    <View style={[styles.inactiveRingIcon, { backgroundColor: `${ring.color}20` }]}>
                      <Feather name={ring.icon as any} size={18} color={ring.color} />
                    </View>
                    <ThemedText style={styles.inactiveRingText}>
                      {ring.topic.charAt(0).toUpperCase() + ring.topic.slice(1)}
                    </ThemedText>
                  </View>
                ))}
              </View>
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
  inactiveRingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ringTouchable: {
    flex: 1,
  },
  ringContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringVisualization: {
    marginRight: 16,
  },
  ringInfo: {
    flex: 1,
  },
  ringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ringIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ringStats: {
    marginTop: 4,
  },
  ringLevel: {
    fontSize: 14,
    fontWeight: '600',
  },
  ringProgress: {
    fontSize: 14,
    opacity: 0.8,
  },
  ringTotal: {
    fontSize: 12,
    opacity: 0.6,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    position: 'absolute',
    top: 4,
    right: 4,
  },
}); 