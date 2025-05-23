import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  TopicRingProgress,
  TopicRingsState,
  RingConfig,
  DEFAULT_RING_CONFIG,
  TOPIC_ICONS,
  TOPIC_COLORS,
} from '../types/topicRings';

interface UseTopicRingsProps {
  config?: RingConfig;
  userId?: string;
}

export const useTopicRings = ({ config = DEFAULT_RING_CONFIG, userId }: UseTopicRingsProps) => {
  const [ringsState, setRingsState] = useState<TopicRingsState>({
    rings: {},
    lastUpdated: Date.now(),
  });

  // Get data from Redux store
  const questions = useAppSelector(state => state.trivia.questions);
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const personalizedFeed = useAppSelector(state => state.trivia.personalizedFeed);

  // Calculate target answers for a given level
  const calculateTargetAnswers = useCallback((level: number): number => {
    return Math.floor(config.baseTargetAnswers * Math.pow(config.scalingFactor, level - 1));
  }, [config]);

  // Get correct answers count for a topic from Redux questions state
  const getCorrectAnswersForTopic = useCallback((topic: string): number => {
    let correctCount = 0;
    
    console.log(`\n--- Counting correct answers for ${topic} ---`);
    console.log('Total questions in state:', Object.keys(questions).length);
    console.log('Total feed items:', personalizedFeed.length);
    
    // Go through all questions in Redux state
    Object.entries(questions).forEach(([questionId, questionState]) => {
      if (questionState.status === 'answered' && questionState.isCorrect) {
        // Find the feed item to get the topic
        const feedItem = personalizedFeed.find(item => item.id === questionId);
        console.log(`Question ${questionId}: answered correctly, feedItem topic: ${feedItem?.topic || 'not found'}`);
        if (feedItem && feedItem.topic === topic) {
          correctCount++;
          console.log(`✅ Count for ${topic}: ${correctCount}`);
        }
      }
    });
    
    console.log(`Final count for ${topic}: ${correctCount}`);
    console.log('----------------------------------------------\n');
    
    return correctCount;
  }, [questions, personalizedFeed]);

  // Create or update ring progress for a topic - PURE FUNCTION (no state updates)
  const createRingProgress = useCallback((topic: string, correctAnswers: number, existingRing?: TopicRingProgress): TopicRingProgress => {
    if (!existingRing) {
      // Create new ring
      const targetAnswers = calculateTargetAnswers(1);
      const newRing: TopicRingProgress = {
        topic,
        level: 1,
        currentProgress: Math.min(correctAnswers, targetAnswers),
        targetAnswers,
        totalCorrectAnswers: correctAnswers,
        color: TOPIC_COLORS[topic] || TOPIC_COLORS.default,
        icon: TOPIC_ICONS[topic] || TOPIC_ICONS.default,
      };
      
      // Check if we should level up immediately
      let currentLevel = 1;
      let remainingAnswers = correctAnswers;
      
      while (remainingAnswers >= calculateTargetAnswers(currentLevel)) {
        remainingAnswers -= calculateTargetAnswers(currentLevel);
        currentLevel++;
      }
      
      if (currentLevel > 1) {
        newRing.level = Math.min(currentLevel, config.maxDisplayLevel);
        newRing.currentProgress = remainingAnswers;
        newRing.targetAnswers = calculateTargetAnswers(newRing.level);
      }
      
      return newRing;
    }

    // Update existing ring only if there are new correct answers
    if (correctAnswers <= existingRing.totalCorrectAnswers) {
      return existingRing; // No changes needed
    }

    const updatedRing = { ...existingRing };
    const newCorrectAnswers = correctAnswers - existingRing.totalCorrectAnswers;
    
    updatedRing.totalCorrectAnswers = correctAnswers;
    updatedRing.currentProgress += newCorrectAnswers;

    // Check if level should be increased
    while (updatedRing.currentProgress >= updatedRing.targetAnswers && updatedRing.level < config.maxDisplayLevel) {
      updatedRing.currentProgress -= updatedRing.targetAnswers;
      updatedRing.level += 1;
      updatedRing.targetAnswers = calculateTargetAnswers(updatedRing.level);
    }

    return updatedRing;
  }, [calculateTargetAnswers, config.maxDisplayLevel]);

  // Update rings when questions or user profile changes
  useEffect(() => {
    if (userProfile?.topics && Object.keys(questions).length > 0) {
      let hasChanges = false;
      const newRings = { ...ringsState.rings };
      
      // Get all topics from user profile
      Object.keys(userProfile.topics).forEach(topic => {
        const correctAnswers = getCorrectAnswersForTopic(topic);
        const existingRing = ringsState.rings[topic];
        const updatedRing = createRingProgress(topic, correctAnswers, existingRing);
        
        // Only update if there are actual changes
        if (!existingRing || JSON.stringify(updatedRing) !== JSON.stringify(existingRing)) {
          newRings[topic] = updatedRing;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setRingsState(prevState => ({
          ...prevState,
          rings: newRings,
          lastUpdated: Date.now(),
        }));
      }
    }
  }, [questions, userProfile, getCorrectAnswersForTopic, createRingProgress, ringsState.rings]);

  // Calculate top 3 topic rings using useMemo to prevent recalculation
  const topRings = useMemo((): TopicRingProgress[] => {
    if (!userProfile?.topics) return [];

    console.log('=== TopicRings Debug ===');
    console.log('UserProfile topics:', userProfile.topics);

    // Get all topics sorted by weight (highest weight = most interest)
    const sortedTopics = Object.entries(userProfile.topics)
      .sort(([, a], [, b]) => b.weight - a.weight)
      .slice(0, 3)
      .map(([topic]) => topic);

    console.log('Top 3 topics by weight:', sortedTopics);

    // Return existing rings for these topics, but only if they have progress
    const topicRings: TopicRingProgress[] = [];
    
    sortedTopics.forEach(topic => {
      const ring = ringsState.rings[topic];
      console.log(`Topic ${topic}:`, {
        hasRing: !!ring,
        totalCorrect: ring?.totalCorrectAnswers || 0,
        currentProgress: ring?.currentProgress || 0,
        targetAnswers: ring?.targetAnswers || 0
      });
      
      // Only show rings that have at least 1 correct answer
      if (ring && ring.totalCorrectAnswers > 0) {
        topicRings.push(ring);
        console.log(`✅ Adding ring for ${topic}`);
      } else {
        console.log(`❌ Skipping ring for ${topic} - no correct answers`);
      }
    });

    console.log('Final topicRings count:', topicRings.length);
    console.log('=========================');

    return topicRings;
  }, [userProfile?.topics, ringsState.rings]);

  // Callback when a ring completes a level
  const onRingComplete = useCallback((topic: string, newLevel: number) => {
    console.log(`🎉 Level up! ${topic} reached level ${newLevel}`);
    // You can add celebration effects, notifications, etc. here
  }, []);

  return {
    topRings,
    allRings: ringsState.rings,
    onRingComplete,
    lastUpdated: ringsState.lastUpdated,
  };
};