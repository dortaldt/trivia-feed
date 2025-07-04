import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../store/hooks';
import {
  TopicRingProgress,
  TopicRingsState,
  RingConfig,
  DEFAULT_RING_CONFIG,
  TOPIC_ICONS,
  SUB_TOPIC_ICONS,
  getSubTopicIcon,
} from '../types/topicRings';
import { getTopicColor } from '../../constants/NeonColors';
// Import topic configuration
const topicConfig = require('../../app-topic-config');
const { activeTopic, topics } = topicConfig;

interface UseTopicRingsProps {
  config?: RingConfig;
  userId?: string;
}

// Storage key for persisting rings data
const RINGS_STORAGE_KEY = 'topicRings_';

// Enhanced interface for question mapping
interface QuestionMapping {
  topic: string;
  subtopic?: string;
}

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

  // Determine if we should use sub-topics
  const shouldUseSubTopics = activeTopic !== 'default' && topics[activeTopic]?.subTopics;

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
            isSubTopic: ring.isSubTopic,
            parentTopic: ring.parentTopic,
          };
        });
        
        await AsyncStorage.setItem(storageKey, JSON.stringify(safeRingsData));
        console.log('Rings saved to storage using fallback method');
      } catch (fallbackError) {
        console.error('Fallback rings save method also failed:', fallbackError);
      }
    }
  }, [getStorageKey, userId]);

  // Enhanced persistent topic map that stores both topic and subtopic
  const [persistentTopicMap, setPersistentTopicMap] = useState<Map<string, QuestionMapping>>(new Map());

  // Load rings and enhanced topic map on component mount or user change
  useEffect(() => {
    loadRingsFromStorage();
    
    // Load the enhanced persistent topic map from storage
    (async () => {
      try {
        const storageKey = `${getStorageKey()}_topicMap`;
        const storedTopicMap = await AsyncStorage.getItem(storageKey);
        const restoredMap = new Map<string, QuestionMapping>();
        
        if (storedTopicMap) {
          const parsedMap = JSON.parse(storedTopicMap);
          Object.entries(parsedMap).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null && 'topic' in value && typeof (value as any).topic === 'string') {
              restoredMap.set(key, value as QuestionMapping);
            } else if (typeof value === 'string') {
              // Backward compatibility: convert old string format to new object format
              restoredMap.set(key, { topic: value });
            }
          });
        }
        
        setPersistentTopicMap(restoredMap);
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

  // Update the persistent map whenever we see new questions in the feed
  useEffect(() => {
    let hasUpdates = false;
    const newMap = new Map(persistentTopicMap);
    
    personalizedFeed.forEach(item => {
      const existingMapping = newMap.get(item.id);
      const newMapping: QuestionMapping = { 
        topic: item.topic, 
        subtopic: item.subtopic 
      };
      
      if (!existingMapping || 
          existingMapping.topic !== newMapping.topic || 
          existingMapping.subtopic !== newMapping.subtopic) {
        newMap.set(item.id, newMapping);
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
    // Use the enhanced persistent map that remembers ALL questions we've seen
    return persistentTopicMap;
  }, [persistentTopicMap]);

  // Create a memoized count of correct answers by topic to prevent unnecessary ring updates
  const correctAnswersByTopic = useMemo(() => {
    const counts: { [topic: string]: number } = {};
    
    // Only count questions that are answered correctly
    Object.entries(questions).forEach(([questionId, questionState]) => {
      if (questionState.status === 'answered' && questionState.isCorrect) {
        const mapping = feedItemsMap.get(questionId);
        if (mapping?.topic) {
          counts[mapping.topic] = (counts[mapping.topic] || 0) + 1;
        }
      }
    });
    
    return counts;
  }, [questions, feedItemsMap]);

  // Create a memoized count of correct answers by sub-topic using the enhanced map
  const correctAnswersBySubTopic = useMemo(() => {
    const counts: { [subTopic: string]: number } = {};
    
    if (shouldUseSubTopics) {
      // Use the persistent map instead of personalizedFeed for reliability
      Object.entries(questions).forEach(([questionId, questionState]) => {
        if (questionState.status === 'answered' && questionState.isCorrect) {
          const mapping = feedItemsMap.get(questionId);
          if (mapping && 
              mapping.topic === topics[activeTopic]?.dbTopicName && 
              mapping.subtopic) {
            counts[mapping.subtopic] = (counts[mapping.subtopic] || 0) + 1;
          }
        }
      });
    }
    
    return counts;
  }, [questions, feedItemsMap, shouldUseSubTopics, activeTopic]);

  // Get correct answers count for a topic from the memoized counts
  const getCorrectAnswersForTopic = (topic: string): number => {
    return correctAnswersByTopic[topic] || 0;
  };

  // Get correct answers count for a sub-topic from the memoized counts
  const getCorrectAnswersForSubTopic = (subTopic: string): number => {
    return correctAnswersBySubTopic[subTopic] || 0;
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
        maxDisplayLevel: config.maxDisplayLevel,
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
      
      // Calculate level progression for inner ring
      newRing.levelProgress = Math.min(newRing.level / config.maxDisplayLevel, 1);
      
      return newRing;
    }

    // Update existing ring - ALWAYS refresh icon and color to get latest mappings
    const updatedRing = { 
      ...existingRing,
      // Always update icon and color to ensure latest mappings
      icon: TOPIC_ICONS[topic] || TOPIC_ICONS.default,
      color: getTopicColor(topic).hex,
      maxDisplayLevel: config.maxDisplayLevel,
    };

    // Check if correct answers have changed
    if (updatedRing.totalCorrectAnswers !== correctAnswers) {
      updatedRing.totalCorrectAnswers = correctAnswers;
      
      // Recalculate level and progress
      let currentLevel = 1;
      let remainingAnswers = correctAnswers;
      
      while (remainingAnswers >= calculateTargetAnswers(currentLevel)) {
        remainingAnswers -= calculateTargetAnswers(currentLevel);
        currentLevel++;
      }
      
      updatedRing.level = Math.min(currentLevel, config.maxDisplayLevel);
      updatedRing.currentProgress = remainingAnswers;
      updatedRing.targetAnswers = calculateTargetAnswers(updatedRing.level);
      
      // Update level progression for inner ring
      updatedRing.levelProgress = Math.min(updatedRing.level / config.maxDisplayLevel, 1);
    }
    
    return updatedRing;
  }, [calculateTargetAnswers, config.maxDisplayLevel]);

  // Create or update ring progress for sub-topics
  const createSubTopicRingProgress = useCallback((subTopic: string, correctAnswers: number, existingRing?: TopicRingProgress): TopicRingProgress => {
    const subTopicConfig = topics[activeTopic]?.subTopics?.[subTopic];
    
    if (!existingRing) {
      const targetAnswers = calculateTargetAnswers(1);
      const newRing: TopicRingProgress = {
        topic: subTopic,
        level: 1,
        currentProgress: Math.min(correctAnswers, targetAnswers),
        targetAnswers,
        totalCorrectAnswers: correctAnswers,
        color: subTopicConfig?.color || getTopicColor(subTopic).hex,
        icon: subTopicConfig?.icon || getSubTopicIcon(subTopic, activeTopic),
        isSubTopic: true,
        parentTopic: activeTopic,
        maxDisplayLevel: config.maxDisplayLevel,
      };
      
      // Handle level ups for new rings
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
      
      // Calculate level progression for inner ring
      newRing.levelProgress = Math.min(newRing.level / config.maxDisplayLevel, 1);
      
      return newRing;
    }

    // Update existing sub-topic ring
    const updatedRing = { 
      ...existingRing,
      icon: subTopicConfig?.icon || getSubTopicIcon(subTopic, activeTopic),
      color: subTopicConfig?.color || getTopicColor(subTopic).hex,
      isSubTopic: true,
      parentTopic: activeTopic,
      maxDisplayLevel: config.maxDisplayLevel,
    };

    // Check if correct answers have changed
    if (updatedRing.totalCorrectAnswers !== correctAnswers) {
      updatedRing.totalCorrectAnswers = correctAnswers;
      
      // Recalculate level and progress for sub-topic
      let currentLevel = 1;
      let remainingAnswers = correctAnswers;
      
      while (remainingAnswers >= calculateTargetAnswers(currentLevel)) {
        remainingAnswers -= calculateTargetAnswers(currentLevel);
        currentLevel++;
      }
      
      updatedRing.level = Math.min(currentLevel, config.maxDisplayLevel);
      updatedRing.currentProgress = remainingAnswers;
      updatedRing.targetAnswers = calculateTargetAnswers(updatedRing.level);
      
      // Update level progression for inner ring
      updatedRing.levelProgress = Math.min(updatedRing.level / config.maxDisplayLevel, 1);
    }
    
    return updatedRing;
  }, [calculateTargetAnswers, config.maxDisplayLevel, activeTopic]);

  // Reload topic map periodically to catch updates from storeQuestionTopic
  useEffect(() => {
    if (!isLoaded) return;
    
    const reloadTopicMap = async () => {
      try {
        const storageKey = `${getStorageKey()}_topicMap`;
        const storedTopicMap = await AsyncStorage.getItem(storageKey);
        const restoredMap = new Map<string, QuestionMapping>();
        
        if (storedTopicMap) {
          const parsedMap = JSON.parse(storedTopicMap);
          Object.entries(parsedMap).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null && 'topic' in value && typeof (value as any).topic === 'string') {
              restoredMap.set(key, value as QuestionMapping);
            } else if (typeof value === 'string') {
              // Backward compatibility: convert old string format to new object format
              restoredMap.set(key, { topic: value });
            }
          });
        }
        
        // Only update if the map has actually changed
        if (restoredMap.size !== persistentTopicMap.size) {
          setPersistentTopicMap(restoredMap);
        }
      } catch (error) {
        console.error('Error reloading topic map from storage:', error);
      }
    };
    
    // Reload every 2 seconds to catch updates from other sources
    const interval = setInterval(reloadTopicMap, 2000);
    return () => clearInterval(interval);
  }, [isLoaded, getStorageKey, persistentTopicMap.size]);

  // Update rings when correct answers change - MODIFIED to handle sub-topics
  useEffect(() => {
    if (userProfile?.topics && isLoaded && questionsLoaded) {
      let hasChanges = false;
      const newRings = { ...ringsState.rings };
      
      if (shouldUseSubTopics) {
        // Sub-topic mode: get available sub-topics from the persistent map instead of personalizedFeed
        const subTopicsConfig = topics[activeTopic]?.subTopics || {};
        
        // Get all unique sub-topics from the persistent map that match our current topic
        const availableSubTopics = new Set<string>();
        persistentTopicMap.forEach((mapping) => {
          if (mapping.topic === topics[activeTopic]?.dbTopicName && mapping.subtopic) {
            availableSubTopics.add(mapping.subtopic);
          }
        });
        
        // console.log(`[SUB-TOPIC MODE] Found ${availableSubTopics.size} sub-topics in persistent map:`, Array.from(availableSubTopics));
        
        // Process sub-topics that are both configured and have questions
        Object.keys(subTopicsConfig).forEach(subTopic => {
          if (availableSubTopics.has(subTopic)) {
            const reduxCorrectCount = getCorrectAnswersForSubTopic(subTopic);
            const existingRing = ringsState.rings[subTopic];
            
            const correctAnswersToUse = Math.max(reduxCorrectCount, existingRing?.totalCorrectAnswers || 0);
            
            if (!existingRing || existingRing.totalCorrectAnswers !== correctAnswersToUse) {
              const oldCount = existingRing?.totalCorrectAnswers || 0;
              
              if (correctAnswersToUse > oldCount) {
                // console.log(`[SUB-TOPIC RING PROGRESS] ${subTopic}: Adding ${correctAnswersToUse - oldCount} new correct answers (${oldCount} → ${correctAnswersToUse})`);
              }
              
              const newRing = createSubTopicRingProgress(subTopic, correctAnswersToUse, existingRing);
              // console.log(`[SUB-TOPIC RING UPDATE] "${subTopic}": ${newRing.totalCorrectAnswers} correct → Level ${newRing.level}, Progress ${newRing.currentProgress}/${newRing.targetAnswers}`);
              newRings[subTopic] = newRing;
              hasChanges = true;
            }
          }
        });

        // Also process any sub-topics that exist in the data but aren't configured
        // This makes the system more robust
        availableSubTopics.forEach(subTopic => {
          if (!subTopicsConfig[subTopic]) {
            const reduxCorrectCount = getCorrectAnswersForSubTopic(subTopic);
            const existingRing = ringsState.rings[subTopic];
            
            const correctAnswersToUse = Math.max(reduxCorrectCount, existingRing?.totalCorrectAnswers || 0);
            
            if (correctAnswersToUse > 0 && (!existingRing || existingRing.totalCorrectAnswers !== correctAnswersToUse)) {
              const oldCount = existingRing?.totalCorrectAnswers || 0;
              
              if (correctAnswersToUse > oldCount) {
                // console.log(`[SUB-TOPIC RING PROGRESS] ${subTopic} (unconfigured): Adding ${correctAnswersToUse - oldCount} new correct answers (${oldCount} → ${correctAnswersToUse})`);
              }
              
              const newRing = createSubTopicRingProgress(subTopic, correctAnswersToUse, existingRing);
              // console.log(`[SUB-TOPIC RING UPDATE] "${subTopic}" (unconfigured): ${newRing.totalCorrectAnswers} correct → Level ${newRing.level}, Progress ${newRing.currentProgress}/${newRing.targetAnswers}`);
              newRings[subTopic] = newRing;
              hasChanges = true;
            }
          }
        });
      } else {
        // Regular topic mode: use existing logic
        Object.keys(userProfile.topics).forEach(topic => {
          const reduxCorrectCount = getCorrectAnswersForTopic(topic);
          const existingRing = ringsState.rings[topic];
          
          const correctAnswersToUse = Math.max(reduxCorrectCount, existingRing?.totalCorrectAnswers || 0);
          
          if (!existingRing || existingRing.totalCorrectAnswers !== correctAnswersToUse) {
            const oldCount = existingRing?.totalCorrectAnswers || 0;
            
            if (correctAnswersToUse > oldCount) {
              // console.log(`[RING PROGRESS] ${topic}: Adding ${correctAnswersToUse - oldCount} new correct answers (${oldCount} → ${correctAnswersToUse})`);
            }
            
            const newRing = createRingProgress(topic, correctAnswersToUse, existingRing);
            // console.log(`[RING UPDATE] "${topic}": ${newRing.totalCorrectAnswers} correct → Level ${newRing.level}, Progress ${newRing.currentProgress}/${newRing.targetAnswers}`);
            
            newRings[topic] = newRing;
            hasChanges = true;
          }
        });
      }
      
      // Apply changes
      if (hasChanges) {
        // console.log(`[RING EFFECT] Applying ring state changes (sub-topic mode: ${shouldUseSubTopics})`);
        setRingsState(prev => ({
          ...prev,
          rings: newRings
        }));
      }
    }
  }, [correctAnswersByTopic, correctAnswersBySubTopic, userProfile, isLoaded, questionsLoaded, persistentTopicMap, shouldUseSubTopics]);

  // Calculate top rings - modified for sub-topic support
  const topRings = useMemo((): TopicRingProgress[] => {
    const ringsWithProgress = Object.values(ringsState.rings)
      .filter(ring => ring && ring.totalCorrectAnswers > 0);

    if (shouldUseSubTopics) {
      // In sub-topic mode, use same logic as default: top 3 + most recent
      const subTopicRings = ringsWithProgress
        .filter(ring => ring.isSubTopic)
        .sort((a, b) => b.totalCorrectAnswers - a.totalCorrectAnswers);

      // Get top 3 sub-topic rings by progress
      const top3SubTopicRings = subTopicRings.slice(0, 3);
      const top3SubTopics = new Set(top3SubTopicRings.map(ring => ring.topic));

      // Find the most recent sub-topic ring that's not in top 3
      let recentSubTopicRing: TopicRingProgress | null = null;
      
      if (subTopicRings.length > 3) {
        // Get all sub-topic rings not in top 3
        const nonTop3SubTopicRings = subTopicRings.filter(ring => !top3SubTopics.has(ring.topic));
        
        if (nonTop3SubTopicRings.length > 0) {
          // Find the most recently answered sub-topic by checking Redux questions
          let mostRecentSubTopic: string | null = null;
          
          // Get all correct answers for non-top-3 sub-topics
          const correctAnswersForNonTop3SubTopics: {topic: string, questionId: string}[] = [];
          
          Object.entries(questions).forEach(([questionId, questionState]) => {
            if (questionState.status === 'answered' && questionState.isCorrect) {
              const questionMapping = feedItemsMap.get(questionId);
              if (questionMapping?.subtopic && !top3SubTopics.has(questionMapping.subtopic) &&
                  questionMapping.topic === topics[activeTopic]?.dbTopicName) {
                correctAnswersForNonTop3SubTopics.push({topic: questionMapping.subtopic, questionId});
              }
            }
          });
          
          // If we have correct answers for non-top-3 sub-topics, take the last one
          if (correctAnswersForNonTop3SubTopics.length > 0) {
            const lastCorrectAnswer = correctAnswersForNonTop3SubTopics[correctAnswersForNonTop3SubTopics.length - 1];
            mostRecentSubTopic = lastCorrectAnswer.topic;
          }
          
          // If we found a recent sub-topic, find its ring
          if (mostRecentSubTopic) {
            recentSubTopicRing = nonTop3SubTopicRings.find(ring => ring.topic === mostRecentSubTopic) || null;
          }
          
          // If no recent sub-topic found from questions, use the highest progress non-top-3 ring
          if (!recentSubTopicRing && nonTop3SubTopicRings.length > 0) {
            recentSubTopicRing = nonTop3SubTopicRings[0];
          }
        }
      }

      // Combine top 3 + recent sub-topic ring
      const finalSubTopicRings = [...top3SubTopicRings];
      if (recentSubTopicRing) {
        finalSubTopicRings.push(recentSubTopicRing);
      }
      
      // console.log(`[SUB-TOPIC RINGS] Showing ${finalSubTopicRings.length} sub-topic rings (top 3 + recent):`, 
      //   finalSubTopicRings.map(ring => `${ring.topic} (${ring.totalCorrectAnswers} correct)`).join(', ')
      // );
      
      return finalSubTopicRings;
    } else {
      // Regular topic mode logic
      const regularRings = ringsWithProgress
        .filter(ring => !ring.isSubTopic)
        .sort((a, b) => b.totalCorrectAnswers - a.totalCorrectAnswers);

      // Get top 3 rings by progress
      const top3Rings = regularRings.slice(0, 3);
      const top3Topics = new Set(top3Rings.map(ring => ring.topic));

      // Find the most recent ring that's not in top 3
      let recentRing: TopicRingProgress | null = null;
      
      if (regularRings.length > 3) {
        // Get all rings not in top 3
        const nonTop3Rings = regularRings.filter(ring => !top3Topics.has(ring.topic));
        
        if (nonTop3Rings.length > 0) {
          // Find the most recently answered topic by checking Redux questions
          let mostRecentTopic: string | null = null;
          let mostRecentQuestionId: string | null = null;
          
          // Get all correct answers for non-top-3 topics
          const correctAnswersForNonTop3: {topic: string, questionId: string}[] = [];
          
          Object.entries(questions).forEach(([questionId, questionState]) => {
            if (questionState.status === 'answered' && questionState.isCorrect) {
              const questionMapping = feedItemsMap.get(questionId);
              if (questionMapping?.topic && !top3Topics.has(questionMapping.topic)) {
                correctAnswersForNonTop3.push({topic: questionMapping.topic, questionId});
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
        }
      }

      // Combine top 3 + recent ring
      const finalRings = [...top3Rings];
      if (recentRing) {
        finalRings.push(recentRing);
      }

      return finalRings;
    }
  }, [ringsState.rings, questions, feedItemsMap, shouldUseSubTopics]);

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
      newMap.set(questionId, { topic });
      
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

  // Function to discover all unique sub-topics from feed data
  const discoverUniqueSubTopics = useCallback((targetTopic: string): Set<string> => {
    const subtopics = new Set<string>();
    
    personalizedFeed.forEach(item => {
      if (item.topic === targetTopic && item.subtopic) {
        subtopics.add(item.subtopic);
      }
    });
    
    return subtopics;
  }, [personalizedFeed]);

  // Get all available sub-topics for logging and debugging
  const availableSubTopics = useMemo(() => {
    if (shouldUseSubTopics && topics[activeTopic]?.dbTopicName) {
      return discoverUniqueSubTopics(topics[activeTopic].dbTopicName);
    }
    return new Set<string>();
  }, [shouldUseSubTopics, activeTopic, discoverUniqueSubTopics]);

  // Log discovered sub-topics when they change
  useEffect(() => {
    if (shouldUseSubTopics && availableSubTopics.size > 0) {
      // console.log(`[SUB-TOPIC DISCOVERY] Found ${availableSubTopics.size} sub-topics for ${activeTopic}:`, 
      //   Array.from(availableSubTopics).sort().join(', ')
      // );
      
      // Check for missing icon mappings
      const missingIcons: string[] = [];
      availableSubTopics.forEach(subTopic => {
        const hasConfigIcon = topics[activeTopic]?.subTopics?.[subTopic]?.icon;
        const hasDefaultIcon = SUB_TOPIC_ICONS[subTopic];
        
        if (!hasConfigIcon && !hasDefaultIcon) {
          missingIcons.push(subTopic);
        }
      });
      
      if (missingIcons.length > 0) {
        console.warn(`[SUB-TOPIC ICONS] Missing icon mappings for: ${missingIcons.join(', ')} (falling back to parent topic icon)`);
      }
    }
  }, [shouldUseSubTopics, availableSubTopics, activeTopic]);

  return {
    topRings,
    allRings: ringsState.rings,
    onRingComplete,
    lastUpdated: ringsState.lastUpdated,
    isLoaded,
    clearStoredRings,
    addQuestionTopic,
    // Expose sub-topic mode status for components
    isSubTopicMode: shouldUseSubTopics,
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