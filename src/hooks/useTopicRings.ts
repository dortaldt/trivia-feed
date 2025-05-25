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
  // ADDED: State to hold the rings as initially loaded from cache for the session
  const [initialRingsFromCache, setInitialRingsFromCache] = useState<{[topic: string]: TopicRingProgress} | null>(null);

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
        
        if (parsedData && 
            typeof parsedData === 'object' && 
            parsedData.rings && 
            typeof parsedData.rings === 'object' &&
            typeof parsedData.lastUpdated === 'number') {
          
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
          // ADDED: Store the initially loaded rings once
          if (!initialRingsFromCache) {
            setInitialRingsFromCache(validatedRings);
            console.log('[RING INIT] Stored initial rings from cache:', validatedRings);
          }
        }
      }
    } catch (error) {
      console.error('Error loading rings from storage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, [getStorageKey, userId, initialRingsFromCache]); // Added initialRingsFromCache to dependencies

  // Save rings data to AsyncStorage
  const saveRingsToStorage = useCallback(async (ringsData: TopicRingsState) => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(ringsData));
    } catch (error) {
      console.error('Error saving rings to storage:', error);
    }
  }, [getStorageKey, userId]);

  // Load rings and topic map on component mount or user change
  useEffect(() => {
    loadRingsFromStorage();
    
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
      } catch (error) {
        console.error('Error loading topic map from storage:', error);
      }
    })();
  }, [loadRingsFromStorage, getStorageKey]); // Removed initialRingsFromCache from here, it's handled by loadRingsFromStorage's own deps

  // Save rings whenever state changes (but only after initial load)
  useEffect(() => {
    if (isLoaded && Object.keys(ringsState.rings).length > 0) {
      saveRingsToStorage(ringsState);
    }
  }, [ringsState, isLoaded, saveRingsToStorage]);

  const calculateTargetAnswers = useCallback((level: number): number => {
    return Math.floor(config.baseTargetAnswers * Math.pow(config.scalingFactor, level - 1));
  }, [config]);

  const [persistentTopicMap, setPersistentTopicMap] = useState<Map<string, string>>(new Map());
  
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
  
  const feedItemsMap = useMemo(() => {
    return persistentTopicMap;
  }, [persistentTopicMap]);

  const getCorrectAnswersForTopic = (topic: string): number => {
    let correctCount = 0;
    Object.entries(questions).forEach(([questionId, questionState]) => {
      if (questionState.status === 'answered' && questionState.isCorrect) {
        let questionTopic = feedItemsMap.get(questionId);
        if (questionTopic === topic) {
          correctCount++;
        }
      }
    });
    return correctCount;
  };

  const createRingProgress = useCallback((topic: string, correctAnswers: number, existingRing?: TopicRingProgress): TopicRingProgress => {
    if (!existingRing) {
      const targetAnswers = calculateTargetAnswers(1);
      const newRing: TopicRingProgress = {
        topic, level: 1, currentProgress: Math.min(correctAnswers, targetAnswers),
        targetAnswers, totalCorrectAnswers: correctAnswers,
        color: getTopicColor(topic).hex, icon: TOPIC_ICONS[topic] || TOPIC_ICONS.default,
      };
      let currentLevel = 1; let remainingAnswers = correctAnswers;
      while (remainingAnswers >= calculateTargetAnswers(currentLevel)) {
        remainingAnswers -= calculateTargetAnswers(currentLevel); currentLevel++;
      }
      if (currentLevel > 1) {
        newRing.level = Math.min(currentLevel, config.maxDisplayLevel);
        newRing.currentProgress = remainingAnswers;
        newRing.targetAnswers = calculateTargetAnswers(newRing.level);
      }
      return newRing;
    }

    const updatedRing = { ...existingRing, icon: TOPIC_ICONS[topic] || TOPIC_ICONS.default, color: getTopicColor(topic).hex };
    if (correctAnswers > existingRing.totalCorrectAnswers) {
      const newCorrectAnswers = correctAnswers - existingRing.totalCorrectAnswers;
      console.log(`[RING PROGRESS] ${topic}: Adding ${newCorrectAnswers} new correct answers (${existingRing.totalCorrectAnswers} → ${correctAnswers})`);
      updatedRing.totalCorrectAnswers = correctAnswers;
      updatedRing.currentProgress += newCorrectAnswers;
      while (updatedRing.currentProgress >= updatedRing.targetAnswers && updatedRing.level < config.maxDisplayLevel) {
        console.log(`[RING LEVEL UP] ${topic}: Level ${updatedRing.level} → ${updatedRing.level + 1} (progress: ${updatedRing.currentProgress}/${updatedRing.targetAnswers})`);
        updatedRing.currentProgress -= updatedRing.targetAnswers;
        updatedRing.level += 1;
        updatedRing.targetAnswers = calculateTargetAnswers(updatedRing.level);
      }
    } else if (correctAnswers < existingRing.totalCorrectAnswers) {
      console.warn(`[RING WARNING] ${topic}: correctAnswers (${correctAnswers}) is less than existing total (${existingRing.totalCorrectAnswers}). This might indicate a data inconsistency. Ring not changed.`);
    }
    return updatedRing;
  }, [calculateTargetAnswers, config.maxDisplayLevel]);

  useEffect(() => {
    if (!isLoaded) return;
    const reloadTopicMap = async () => {
      try {
        const storageKey = `${getStorageKey()}_topicMap`;
        const storedTopicMap = await AsyncStorage.getItem(storageKey);
        const restoredMap = new Map<string, string>();
        if (storedTopicMap) {
          const parsedMap = JSON.parse(storedTopicMap);
          Object.entries(parsedMap).forEach(([key, value]) => { if (typeof value === 'string') restoredMap.set(key, value); });
        }
        if (restoredMap.size !== persistentTopicMap.size) setPersistentTopicMap(restoredMap);
      } catch (error) { console.error('Error reloading topic map from storage:', error); }
    };
    const interval = setInterval(reloadTopicMap, 2000);
    return () => clearInterval(interval);
  }, [isLoaded, getStorageKey, persistentTopicMap.size]);

  // Update rings when questions or user profile changes (only after storage is loaded AND initial cache is stored)
  useEffect(() => {
    if (userProfile?.topics && isLoaded && initialRingsFromCache) { // Ensure initialRingsFromCache is populated
      let hasChanges = false;
      const newRings = { ...ringsState.rings };
      
      Object.keys(userProfile.topics).forEach(topic => {
        const sessionCorrectCount = getCorrectAnswersForTopic(topic);
        const initialCachedDataForTopic = initialRingsFromCache[topic];
        const currentProcessedRing = ringsState.rings[topic]; // Ring state from previous update/setRingsState

        const baselineTotalFromCache = initialCachedDataForTopic ? initialCachedDataForTopic.totalCorrectAnswers : 0;
        // newAbsoluteTotal is the sum of what was cached at app start + what's new in this session's Redux
        const newAbsoluteTotal = baselineTotalFromCache + sessionCorrectCount;
        
        if (topic === 'Arts') { // Example debug log
             console.log(`[RING CALC DEBUG] Topic: ${topic} - InitialCacheTotal: ${baselineTotalFromCache}, SessionCorrect: ${sessionCorrectCount} => NewAbsoluteTotal: ${newAbsoluteTotal}. CurrentRingTotalForUpdate: ${currentProcessedRing?.totalCorrectAnswers || 0}`);
        }

        // Pass the new absolute total, and the *current running ring* to createRingProgress.
        // createRingProgress will then calculate the delta from currentProcessedRing.totalCorrectAnswers to newAbsoluteTotal.
        const updatedRing = createRingProgress(topic, newAbsoluteTotal, currentProcessedRing);
        
        const hasDataChanges = !currentProcessedRing || 
          currentProcessedRing.level !== updatedRing.level ||
          currentProcessedRing.currentProgress !== updatedRing.currentProgress ||
          currentProcessedRing.totalCorrectAnswers !== updatedRing.totalCorrectAnswers ||
          currentProcessedRing.targetAnswers !== updatedRing.targetAnswers;
        
        const hasIconColorChanges = currentProcessedRing &&
          (currentProcessedRing.icon !== updatedRing.icon || currentProcessedRing.color !== updatedRing.color);
        
        if (hasDataChanges || hasIconColorChanges) {
          console.log(`[RING UPDATE] "${topic}": NewAbsoluteTotal ${newAbsoluteTotal} correct → Level ${updatedRing.level}, Progress ${updatedRing.currentProgress}/${updatedRing.targetAnswers}`);
          newRings[topic] = updatedRing;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        console.log(`[RING EFFECT] Applying ring state changes:`, newRings);
        setRingsState(prevState => ({
          ...prevState,
          rings: newRings,
          lastUpdated: Date.now(),
        }));
      }
    }
  }, [questions, userProfile, isLoaded, persistentTopicMap, initialRingsFromCache, ringsState.rings]); // Added initialRingsFromCache and ringsState.rings

  const topRings = useMemo((): TopicRingProgress[] => {
    const ringsWithProgress = Object.values(ringsState.rings)
      .filter(ring => ring && ring.totalCorrectAnswers > 0)
      .sort((a, b) => b.totalCorrectAnswers - a.totalCorrectAnswers);
    const top3Rings = ringsWithProgress.slice(0, 3);
    const top3Topics = new Set(top3Rings.map(ring => ring.topic));
    let recentRing: TopicRingProgress | null = null;
    if (ringsWithProgress.length > 3) {
      const nonTop3Rings = ringsWithProgress.filter(ring => !top3Topics.has(ring.topic));
      if (nonTop3Rings.length > 0) {
        let mostRecentTopic: string | null = null;
        const correctAnswersForNonTop3: Array<{topic: string, questionId: string}> = [];
        Object.entries(questions).forEach(([questionId, questionState]) => {
          if (questionState.status === 'answered' && questionState.isCorrect) {
            const questionTopic = feedItemsMap.get(questionId);
            if (questionTopic && !top3Topics.has(questionTopic)) correctAnswersForNonTop3.push({topic: questionTopic, questionId});
          }
        });
        if (correctAnswersForNonTop3.length > 0) mostRecentTopic = correctAnswersForNonTop3[correctAnswersForNonTop3.length - 1].topic;
        if (mostRecentTopic) recentRing = nonTop3Rings.find(ring => ring.topic === mostRecentTopic) || null;
        if (!recentRing && nonTop3Rings.length > 0) recentRing = nonTop3Rings[0];
      }
    }
    const finalRings = [...top3Rings];
    if (recentRing) finalRings.push(recentRing);
    return finalRings;
  }, [ringsState.rings, questions, feedItemsMap]);

  const onRingComplete = useCallback((topic: string, newLevel: number) => {}, []);

  const clearStoredRings = useCallback(async () => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.removeItem(storageKey);
      setRingsState({ rings: {}, lastUpdated: Date.now() });
      setInitialRingsFromCache(null); // Clear initial cache as well
      console.log('[RING CLEAR] Cleared stored rings and initial cache.');
    } catch (error) {
      console.error('Error clearing stored rings:', error);
    }
  }, [getStorageKey, userId]);

  const addQuestionTopic = useCallback((questionId: string, topic: string) => {
    setPersistentTopicMap(current => {
      const newMap = new Map(current); newMap.set(questionId, topic);
      (async () => {
        try {
          const storageKey = `${getStorageKey()}_topicMap`;
          const mapAsObject = Object.fromEntries(newMap);
          await AsyncStorage.setItem(storageKey, JSON.stringify(mapAsObject));
        } catch (error) { console.error('Error saving topic map to storage:', error); }
      })();
      return newMap;
    });
  }, [getStorageKey]);

  return {
    topRings, allRings: ringsState.rings, onRingComplete,
    lastUpdated: ringsState.lastUpdated, isLoaded,
    clearStoredRings, addQuestionTopic,
  };
};

export const storeQuestionTopic = async (questionId: string, topic: string, userId?: string) => {
  try {
    const userKey = userId || 'guest';
    const storageKey = `topicRings_${userKey}_topicMap`;
    const storedData = await AsyncStorage.getItem(storageKey);
    const existingMap = storedData ? JSON.parse(storedData) : {};
    existingMap[questionId] = topic;
    await AsyncStorage.setItem(storageKey, JSON.stringify(existingMap));
  } catch (error) {
    console.error('Error storing question topic:', error);
  }
};