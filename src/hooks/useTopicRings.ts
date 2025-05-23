import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Storage key for persisting rings data
const RINGS_STORAGE_KEY = 'topicRings_';

export const useTopicRings = ({ config = DEFAULT_RING_CONFIG, userId }: UseTopicRingsProps) => {
  const [ringsState, setRingsState] = useState<TopicRingsState>({
    rings: {},
    lastUpdated: Date.now(),
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Get data from Redux store
  const questions = useAppSelector(state => state.trivia.questions);
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const personalizedFeed = useAppSelector(state => state.trivia.personalizedFeed);

  // Get storage key for current user
  const getStorageKey = useCallback(() => {
    const userKey = userId || 'guest';
    return `${RINGS_STORAGE_KEY}${userKey}`;
  }, [userId]);

  // Load rings data from AsyncStorage
  const loadRingsFromStorage = useCallback(async () => {
    try {
      const storageKey = getStorageKey();
      const storedData = await AsyncStorage.getItem(storageKey);
      
      if (storedData) {
        const parsedData: TopicRingsState = JSON.parse(storedData);
        
        // Validate the loaded data structure
        if (parsedData && 
            typeof parsedData === 'object' && 
            parsedData.rings && 
            typeof parsedData.rings === 'object' &&
            typeof parsedData.lastUpdated === 'number') {
          
          // Additional validation: ensure each ring has required properties
          const validatedRings: { [topic: string]: TopicRingProgress } = {};
          Object.entries(parsedData.rings).forEach(([topic, ring]) => {
            if (ring && 
                typeof ring.topic === 'string' && 
                typeof ring.level === 'number' && 
                typeof ring.currentProgress === 'number' &&
                typeof ring.targetAnswers === 'number' &&
                typeof ring.totalCorrectAnswers === 'number') {
              validatedRings[topic] = ring;
            }
          });
          
          setRingsState({
            rings: validatedRings,
            lastUpdated: parsedData.lastUpdated,
          });
        }
      }
    } catch (error) {
      console.error('Error loading rings from storage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, [getStorageKey, userId]);

  // Save rings data to AsyncStorage
  const saveRingsToStorage = useCallback(async (ringsData: TopicRingsState) => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(ringsData));
    } catch (error) {
      console.error('Error saving rings to storage:', error);
    }
  }, [getStorageKey, userId]);

  // Load rings on component mount or user change
  useEffect(() => {
    loadRingsFromStorage();
  }, [loadRingsFromStorage]);

  // Save rings whenever state changes (but only after initial load)
  useEffect(() => {
    if (isLoaded && Object.keys(ringsState.rings).length > 0) {
      saveRingsToStorage(ringsState);
    }
  }, [ringsState, isLoaded, saveRingsToStorage]);

  // Calculate target answers for a given level
  const calculateTargetAnswers = useCallback((level: number): number => {
    return Math.floor(config.baseTargetAnswers * Math.pow(config.scalingFactor, level - 1));
  }, [config]);

  // Create a memoized lookup map for feed items by ID for O(1) access
  const feedItemsMap = useMemo(() => {
    const map = new Map();
    personalizedFeed.forEach(item => {
      map.set(item.id, item.topic);
    });
    return map;
  }, [personalizedFeed]);

  // Get correct answers count for a topic from Redux questions state
  const getCorrectAnswersForTopic = useCallback((topic: string): number => {
    let correctCount = 0;
    
    // Go through all questions in Redux state
    Object.entries(questions).forEach(([questionId, questionState]) => {
      if (questionState.status === 'answered' && questionState.isCorrect) {
        // Fast lookup using the map
        const questionTopic = feedItemsMap.get(questionId);
        if (questionTopic === topic) {
          correctCount++;
        }
      }
    });
    
    return correctCount;
  }, [questions, feedItemsMap]);

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

  // Update rings when questions or user profile changes (only after storage is loaded)
  useEffect(() => {
    if (userProfile?.topics && isLoaded) {
      let hasChanges = false;
      const newRings = { ...ringsState.rings };
      
      // Get all topics from user profile
      Object.keys(userProfile.topics).forEach(topic => {
        const correctAnswers = getCorrectAnswersForTopic(topic);
        const existingRing = ringsState.rings[topic];
        
        // Create or update ring (will have 0 progress if no correct answers)
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
  }, [questions, userProfile, getCorrectAnswersForTopic, createRingProgress, ringsState.rings, isLoaded]);

  // Calculate top 3 topic rings using useMemo to prevent recalculation
  const topRings = useMemo((): TopicRingProgress[] => {
    if (!userProfile?.topics) {
      return [];
    }

    // Get all topics sorted by weight (highest weight = most interest)
    const sortedTopics = Object.entries(userProfile.topics)
      .sort(([, a], [, b]) => b.weight - a.weight)
      .slice(0, 3)
      .map(([topic]) => topic);

    // Return existing rings for these topics, but only if they have progress
    const topicRings: TopicRingProgress[] = [];
    
    sortedTopics.forEach(topic => {
      const ring = ringsState.rings[topic];
      
      // Only show rings that have at least 1 correct answer
      if (ring && ring.totalCorrectAnswers > 0) {
        topicRings.push(ring);
      }
    });

    return topicRings;
  }, [userProfile?.topics, ringsState.rings]);

  // Callback when a ring completes a level
  const onRingComplete = useCallback((topic: string, newLevel: number) => {
    console.log(`🎉 Level up! ${topic} reached level ${newLevel}`);
    // You can add celebration effects, notifications, etc. here
  }, []);

  // Utility function to clear stored rings data
  const clearStoredRings = useCallback(async () => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.removeItem(storageKey);
      
      // Reset in-memory state
      setRingsState({
        rings: {},
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error('Error clearing stored rings:', error);
    }
  }, [getStorageKey, userId]);

  return {
    topRings,
    allRings: ringsState.rings,
    onRingComplete,
    lastUpdated: ringsState.lastUpdated,
    isLoaded,
    clearStoredRings,
  };
};