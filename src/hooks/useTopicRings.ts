import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../store/hooks';
import {
  TopicRingProgress,
  TopicRingsState,
  RingConfig,
  DEFAULT_RING_CONFIG,
  TOPIC_ICONS,
} from '../types/topicRings';
import { getTopicColor } from '../../constants/NeonColors';

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
  const questionsLoaded = useAppSelector(state => state.trivia.questionsLoaded);

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
      
      // Deep clone the rings data to avoid Proxy handler issues on iOS
      const safeRingsData = JSON.parse(JSON.stringify(ringsData));
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(safeRingsData));
    } catch (error) {
      console.error('Error saving rings to storage:', error);
      
      // Try alternative serialization approach for iOS
      try {
        const storageKey = getStorageKey();
        const safeRingsData: TopicRingsState = {
          rings: {},
          lastUpdated: ringsData.lastUpdated,
        };
        
        // Manually serialize each ring to avoid proxy issues
        Object.entries(ringsData.rings).forEach(([topic, ring]) => {
          safeRingsData.rings[topic] = {
            topic: ring.topic,
            level: ring.level,
            currentProgress: ring.currentProgress,
            targetAnswers: ring.targetAnswers,
            totalCorrectAnswers: ring.totalCorrectAnswers,
            color: ring.color,
            icon: ring.icon,
          };
        });
        
        await AsyncStorage.setItem(storageKey, JSON.stringify(safeRingsData));
        console.log('Rings saved to storage using fallback method');
      } catch (fallbackError) {
        console.error('Fallback rings save method also failed:', fallbackError);
      }
    }
  }, [getStorageKey, userId]);

  // Load rings and topic map on component mount or user change
  useEffect(() => {
    loadRingsFromStorage();
    
    // Also load the persistent topic map from storage
    (async () => {
      try {
        const storageKey = `${getStorageKey()}_topicMap`;
        const storedTopicMap = await AsyncStorage.getItem(storageKey);
        const restoredMap = new Map<string, string>();
        
        if (storedTopicMap) {
          const parsedMap = JSON.parse(storedTopicMap);
          Object.entries(parsedMap).forEach(([key, value]) => {
            if (typeof value === 'string') {
              restoredMap.set(key, value);
            }
          });
        }
        
        setPersistentTopicMap(restoredMap);
        // console.log(`[TOPIC MAP] Loaded ${restoredMap.size} question topics from storage`);
      } catch (error) {
        console.error('Error loading topic map from storage:', error);
      }
    })();
  }, [loadRingsFromStorage, getStorageKey]);

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

  // Create a comprehensive lookup map that includes ALL questions we've seen
  // This will store topic information for questions even after they're no longer in the current feed
  const [persistentTopicMap, setPersistentTopicMap] = useState<Map<string, string>>(new Map());
  
  // Update the persistent map whenever we see new questions in the feed
  useEffect(() => {
    let hasUpdates = false;
    const newMap = new Map(persistentTopicMap);
    
    personalizedFeed.forEach(item => {
      if (!newMap.has(item.id)) {
        newMap.set(item.id, item.topic);
        hasUpdates = true;
      }
    });
    
    if (hasUpdates) {
      setPersistentTopicMap(newMap);
      
      // Save to storage
      (async () => {
        try {
          const storageKey = `${getStorageKey()}_topicMap`;
          const mapAsObject = Object.fromEntries(newMap);
          await AsyncStorage.setItem(storageKey, JSON.stringify(mapAsObject));
        } catch (error) {
          console.error('Error saving topic map to storage:', error);
        }
      })();
    }
      }, [personalizedFeed, persistentTopicMap, getStorageKey]);
  
  // Create a memoized lookup map for feed items by ID for O(1) access
  const feedItemsMap = useMemo(() => {
    // Use the persistent map that remembers ALL questions we've seen
    return persistentTopicMap;
  }, [persistentTopicMap]);

  // Get correct answers count for a topic from Redux questions state
  const getCorrectAnswersForTopic = (topic: string): number => {
    let correctCount = 0;
    const matchingQuestions: string[] = [];
    const allAnsweredQuestions: string[] = [];
    const missingTopicQuestions: string[] = [];
    
    // Go through all questions in Redux state
    Object.entries(questions).forEach(([questionId, questionState]) => {
      if (questionState.status === 'answered') {
        allAnsweredQuestions.push(questionId);
        
        if (questionState.isCorrect) {
          // Try to get topic from persistent map
          let questionTopic = feedItemsMap.get(questionId);
          
          if (questionTopic === topic) {
            correctCount++;
            matchingQuestions.push(questionId);
          } else if (!questionTopic) {
            // Question not found in topic map
            missingTopicQuestions.push(questionId);
          }
        }
      }
    });
    
    // Debug logging for count calculation - always log for Mathematics and Science
    if (topic === 'Science' || topic === 'Mathematics' || matchingQuestions.length > 0 || missingTopicQuestions.length > 0) {
      // console.log(`[ANSWER CORRECTLY TOPIC ${topic}] COUNT: ${correctCount} (found: ${matchingQuestions.join(', ')}) (missing from map: ${missingTopicQuestions.join(', ')})`);
      
      // Additional debugging: show all answered questions and their topics
      if (topic === 'Mathematics') {
        // console.log(`[MATHEMATICS DEBUG] All answered questions with topics:`);
        Object.entries(questions).forEach(([qId, qState]) => {
          if (qState.status === 'answered') {
            const qTopic = feedItemsMap.get(qId);
            // console.log(`  - ${qId}: status=${qState.status}, isCorrect=${qState.isCorrect}, topic="${qTopic || 'NOT_FOUND'}"`);
          }
        });
        
        // console.log(`[MATHEMATICS DEBUG] Topic map size: ${feedItemsMap.size} items`);
        // Show all topics in the map
        const topicsInMap = new Set();
        feedItemsMap.forEach((topic, questionId) => {
          topicsInMap.add(topic);
        });
        // console.log(`[MATHEMATICS DEBUG] Topics in map: [${Array.from(topicsInMap).join(', ')}]`);
      }
    }
    
    return correctCount;
  };

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
        color: getTopicColor(topic).hex,
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

    // Update existing ring - ALWAYS refresh icon and color to get latest mappings
    const updatedRing = { 
      ...existingRing,
      // Always update icon and color to ensure latest mappings
      icon: TOPIC_ICONS[topic] || TOPIC_ICONS.default,
      color: getTopicColor(topic).hex,
    };

    // MODIFIED: Only update progress if correctAnswers is actually higher than cached count
    // This prevents unnecessary recalculation when preserving cached data
    if (correctAnswers > existingRing.totalCorrectAnswers) {
      const newCorrectAnswers = correctAnswers - existingRing.totalCorrectAnswers;
      console.log(`[RING PROGRESS] ${topic}: Adding ${newCorrectAnswers} new correct answers (${existingRing.totalCorrectAnswers} → ${correctAnswers})`);
      
      updatedRing.totalCorrectAnswers = correctAnswers;
      updatedRing.currentProgress += newCorrectAnswers;

      // Check if level should be increased
      while (updatedRing.currentProgress >= updatedRing.targetAnswers && updatedRing.level < config.maxDisplayLevel) {
        console.log(`[RING LEVEL UP] ${topic}: Level ${updatedRing.level} → ${updatedRing.level + 1} (progress: ${updatedRing.currentProgress}/${updatedRing.targetAnswers})`);
        updatedRing.currentProgress -= updatedRing.targetAnswers;
        updatedRing.level += 1;
        updatedRing.targetAnswers = calculateTargetAnswers(updatedRing.level);
      }
    } else if (correctAnswers === existingRing.totalCorrectAnswers) {
      // Same count - this is normal when preserving cached data
      // No need to log anything, just keep the existing progress
    } else {
      // This shouldn't happen with our new logic, but log it if it does
      console.warn(`[RING WARNING] ${topic}: correctAnswers (${correctAnswers}) is less than existing total (${existingRing.totalCorrectAnswers}). This might indicate a data inconsistency.`);
    }

    return updatedRing;
  }, [calculateTargetAnswers, config.maxDisplayLevel]);

  // Reload topic map periodically to catch updates from storeQuestionTopic
  useEffect(() => {
    if (!isLoaded) return;
    
    const reloadTopicMap = async () => {
      try {
        const storageKey = `${getStorageKey()}_topicMap`;
        const storedTopicMap = await AsyncStorage.getItem(storageKey);
        const restoredMap = new Map<string, string>();
        
        if (storedTopicMap) {
          const parsedMap = JSON.parse(storedTopicMap);
          Object.entries(parsedMap).forEach(([key, value]) => {
            if (typeof value === 'string') {
              restoredMap.set(key, value);
            }
          });
        }
        
        // Only update if the map has actually changed
        if (restoredMap.size !== persistentTopicMap.size) {
          setPersistentTopicMap(restoredMap);
          // console.log(`[TOPIC MAP] Reloaded ${restoredMap.size} question topics from storage`);
        }
      } catch (error) {
        console.error('Error reloading topic map from storage:', error);
      }
    };
    
    // Reload every 2 seconds to catch updates from other sources
    const interval = setInterval(reloadTopicMap, 2000);
    return () => clearInterval(interval);
  }, [isLoaded, getStorageKey, persistentTopicMap.size]);

  // Update rings when questions or user profile changes (only after storage is loaded)
  useEffect(() => {
    // console.log(`[RING EFFECT] Triggered - questions count: ${Object.keys(questions).length}, persistentTopicMap size: ${persistentTopicMap.size}, isLoaded: ${isLoaded}, questionsLoaded: ${questionsLoaded}`);
    
    if (userProfile?.topics && isLoaded && questionsLoaded) {
      let hasChanges = false;
      const newRings = { ...ringsState.rings };
      
      // Get all topics from user profile
      Object.keys(userProfile.topics).forEach(topic => {
        const reduxCorrectCount = getCorrectAnswersForTopic(topic);
        const existingRing = ringsState.rings[topic];
        
        // MODIFIED: Only update if Redux count is higher than cached count
        // This preserves cached progress after app refresh
        let correctAnswersToUse = reduxCorrectCount;
        
        if (existingRing && existingRing.totalCorrectAnswers > reduxCorrectCount) {
          // Cached ring has more progress than Redux (probably after refresh)
          // Use the cached count and only add new Redux answers
          console.log(`[RING CACHE PRESERVE] ${topic}: Using cached count ${existingRing.totalCorrectAnswers} instead of Redux count ${reduxCorrectCount}`);
          correctAnswersToUse = existingRing.totalCorrectAnswers;
        } else if (reduxCorrectCount > 0) {
          // Redux has new progress, use it
          console.log(`[RING PROGRESS UPDATE] ${topic}: Using Redux count ${reduxCorrectCount} (cached: ${existingRing?.totalCorrectAnswers || 0})`);
        }
        
        // Create or update ring with preserved/updated count
        const updatedRing = createRingProgress(topic, correctAnswersToUse, existingRing);
        
        // Check for meaningful changes (not just icon/color updates)
        const hasDataChanges = !existingRing || 
          existingRing.level !== updatedRing.level ||
          existingRing.currentProgress !== updatedRing.currentProgress ||
          existingRing.totalCorrectAnswers !== updatedRing.totalCorrectAnswers ||
          existingRing.targetAnswers !== updatedRing.targetAnswers;
        
        // Check for icon/color updates (important for cache refresh)
        const hasIconColorChanges = existingRing &&
          (existingRing.icon !== updatedRing.icon || existingRing.color !== updatedRing.color);
        
        if (hasDataChanges || hasIconColorChanges) {
          const oldCount = existingRing ? existingRing.totalCorrectAnswers : 0;
          if (correctAnswersToUse > oldCount) {
            console.log(`[RING COUNT UPDATE] ${topic}: COUNT UP FROM ${oldCount} to ${correctAnswersToUse}`);
          }
          console.log(`[RING UPDATE] "${topic}": ${correctAnswersToUse} correct → Level ${updatedRing.level}, Progress ${updatedRing.currentProgress}/${updatedRing.targetAnswers}`);
          newRings[topic] = updatedRing;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        console.log(`[RING EFFECT] Applying ring state changes`);
        setRingsState(prevState => ({
          ...prevState,
          rings: newRings,
          lastUpdated: Date.now(),
        }));
      } else {
        // console.log(`[RING EFFECT] No changes detected`);
      }
    } else {
      // console.log(`[RING EFFECT] Skipping update - userProfile.topics: ${!!userProfile?.topics}, isLoaded: ${isLoaded}, questionsLoaded: ${questionsLoaded}`);
    }
  }, [questions, userProfile, isLoaded, questionsLoaded, persistentTopicMap]);

  // Calculate top 3 topic rings + recent ring using useMemo to prevent recalculation
  const topRings = useMemo((): TopicRingProgress[] => {
    // Get all rings that have at least 1 correct answer, sorted by progress
    const ringsWithProgress = Object.values(ringsState.rings)
      .filter(ring => ring && ring.totalCorrectAnswers > 0)
      .sort((a, b) => b.totalCorrectAnswers - a.totalCorrectAnswers);

    // Get top 3 rings by progress
    const top3Rings = ringsWithProgress.slice(0, 3);
    const top3Topics = new Set(top3Rings.map(ring => ring.topic));

    // Find the most recent ring that's not in top 3
    let recentRing: TopicRingProgress | null = null;
    
    if (ringsWithProgress.length > 3) {
      // Get all rings not in top 3
      const nonTop3Rings = ringsWithProgress.filter(ring => !top3Topics.has(ring.topic));
      
      if (nonTop3Rings.length > 0) {
        // Find the most recently answered topic by checking Redux questions
        let mostRecentTopic: string | null = null;
        let mostRecentQuestionId: string | null = null;
        
        // Get all correct answers for non-top-3 topics
        const correctAnswersForNonTop3: Array<{topic: string, questionId: string}> = [];
        
        Object.entries(questions).forEach(([questionId, questionState]) => {
          if (questionState.status === 'answered' && questionState.isCorrect) {
            const questionTopic = feedItemsMap.get(questionId);
            if (questionTopic && !top3Topics.has(questionTopic)) {
              correctAnswersForNonTop3.push({topic: questionTopic, questionId});
            }
          }
        });
        
        // If we have correct answers for non-top-3 topics, take the last one
        // (assuming questions are processed in chronological order)
        if (correctAnswersForNonTop3.length > 0) {
          const lastCorrectAnswer = correctAnswersForNonTop3[correctAnswersForNonTop3.length - 1];
          mostRecentTopic = lastCorrectAnswer.topic;
          mostRecentQuestionId = lastCorrectAnswer.questionId;
        }
        
        // If we found a recent topic, find its ring
        if (mostRecentTopic) {
          recentRing = nonTop3Rings.find(ring => ring.topic === mostRecentTopic) || null;
        }
        
        // If no recent topic found from questions, just use the highest progress non-top-3 ring
        if (!recentRing && nonTop3Rings.length > 0) {
          recentRing = nonTop3Rings[0];
        }
        
        // Log recent ring selection for debugging
        if (recentRing) {
          // console.log(`[RECENT RING] Selected "${recentRing.topic}" as recent ring (last correct: ${mostRecentQuestionId || 'unknown'})`);
        }
      }
    }

    // Combine top 3 + recent ring
    const finalRings = [...top3Rings];
    if (recentRing) {
      finalRings.push(recentRing);
    }

    // console.log(`[RING SELECTION] Progress-based selection (${finalRings.length} rings):`, 
    //   finalRings.map((ring, index) => {
    //     const label = index < 3 ? `#${index + 1}` : 'recent';
    //     return `${label}: ${ring.topic} (${ring.totalCorrectAnswers} correct)`;
    //   }).join(', ')
    // );

    return finalRings;
  }, [ringsState.rings, questions, feedItemsMap]);

  // Callback when a ring completes a level
  const onRingComplete = useCallback((topic: string, newLevel: number) => {
    // console.log(`🎉 Level up! ${topic} reached level ${newLevel}`);
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

  // Function to manually add a question topic mapping
  const addQuestionTopic = useCallback((questionId: string, topic: string) => {
    // console.log(`[IMMEDIATE UPDATE] Adding question ${questionId} with topic "${topic}" to persistent map`);
    setPersistentTopicMap(current => {
      const newMap = new Map(current);
      newMap.set(questionId, topic);
      
      // Save to storage
      (async () => {
        try {
          const storageKey = `${getStorageKey()}_topicMap`;
          const mapAsObject = Object.fromEntries(newMap);
          await AsyncStorage.setItem(storageKey, JSON.stringify(mapAsObject));
          // console.log(`[IMMEDIATE UPDATE] Saved to storage, topic map now has ${newMap.size} items`);
        } catch (error) {
          console.error('Error saving topic map to storage:', error);
        }
      })();
      
      return newMap;
    });
  }, [getStorageKey]);

  return {
    topRings,
    allRings: ringsState.rings,
    onRingComplete,
    lastUpdated: ringsState.lastUpdated,
    isLoaded,
    clearStoredRings,
    addQuestionTopic,
  };
};

// Standalone function to store question topic mapping
export const storeQuestionTopic = async (questionId: string, topic: string, userId?: string) => {
  try {
    const userKey = userId || 'guest';
    const storageKey = `topicRings_${userKey}_topicMap`;
    
    // Get existing map from AsyncStorage
    const storedData = await AsyncStorage.getItem(storageKey);
    const existingMap = storedData ? JSON.parse(storedData) : {};
    
    // Add new mapping
    existingMap[questionId] = topic;
    
    // Save back to storage
    await AsyncStorage.setItem(storageKey, JSON.stringify(existingMap));
    // console.log(`[STORE QUESTION TOPIC] Stored topic "${topic}" for question ${questionId} in storage`);
  } catch (error) {
    console.error('Error storing question topic:', error);
  }
};