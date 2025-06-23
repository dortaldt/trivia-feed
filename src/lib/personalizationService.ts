import { FeedItem } from './triviaService';
import { getColdStartFeed } from './coldStartStrategy';
import { WeightChange } from '../types/trackerTypes';
import { ALL_TOPICS } from '../constants/topics';

// Simple cache for question score calculations
const scoreCache = new Map<string, { score: number; explanations: string[]; profileHash: string }>();

// Helper function to create a hash of relevant user profile parts for a question
function getProfileHashForQuestion(userProfile: UserProfile, question: FeedItem): string {
  const topic = question.topic;
  const subtopic = question.subtopic || 'General';
  const branch = question.branch || 'General';
  
  const topicData = userProfile.topics[topic];
  const interaction = userProfile.interactions[question.id];
  
  return JSON.stringify({
    topicWeight: topicData?.weight,
    subtopicWeight: topicData?.subtopics[subtopic]?.weight,
    branchWeight: topicData?.subtopics[subtopic]?.branches[branch]?.weight,
    interaction: interaction,
    lastRefreshed: userProfile.lastRefreshed
  });
}

// Types for user interaction metrics
export type QuestionInteraction = {
  timeSpent: number;
  wasCorrect?: boolean;
  wasSkipped: boolean;
  viewedAt: number; // timestamp
};

// Topic tree node types
export type TopicBranch = {
  weight: number;
  lastViewed?: number;
};

export type SubTopic = {
  weight: number;
  branches: { [branchName: string]: TopicBranch };
  lastViewed?: number;
};

export type RootTopic = {
  weight: number;
  subtopics: { [subtopicName: string]: SubTopic };
  lastViewed?: number;
};

// User profile including topic preferences
export type UserProfile = {
  topics: { [topicName: string]: RootTopic };
  interactions: { [questionId: string]: QuestionInteraction };
  lastRefreshed: number;
  coldStartComplete?: boolean; // Flag to indicate if cold start is complete
  totalQuestionsAnswered?: number; // Track total questions answered
  coldStartState?: any; // Track cold start state for persistence
  lastQuestionAnswered?: {
    questionId: string;
    answer?: string;
    correct?: boolean;
    skipped?: boolean;
    topic: string;
  }; // Track the last question answered for cold start algorithm
};

const DEFAULT_TOPIC_WEIGHT = 0.5;
const DEFAULT_SUBTOPIC_WEIGHT = 0.5;
const DEFAULT_BRANCH_WEIGHT = 0.5;

// Weight factors for scoring algorithm
const WEIGHTS = {
  accuracy: 0.25,
  timeSpent: 0.15,
  skipPenalty: -0.2,
  topicAffinity: 0.3,
  novelty: 0.15,
  cooldown: 0.1,
  
  // Decay rates (per day)
  weightDecay: 0.05,
  
  // Time thresholds (ms)
  fastAnswerThreshold: 3000, // 3 seconds
  longAnswerThreshold: 15000, // 15 seconds
};

// Exploration percentages
const EXPLORATION = {
  newRootTopics: 0.05, // 5%
  newSubtopics: 0.10, // 10%
  newBranches: 0.15, // 15%
};

/**
 * Calculates the score for a question based on the user profile and interaction history
 */
export function calculateQuestionScore(
  question: FeedItem,
  userProfile: UserProfile
): { score: number; explanations: string[] } {
  // Check cache first
  const cacheKey = question.id;
  const profileHash = getProfileHashForQuestion(userProfile, question);
  const cached = scoreCache.get(cacheKey);
  
  if (cached && cached.profileHash === profileHash) {
    return { score: cached.score, explanations: cached.explanations };
  }

  const explanations: string[] = [];
  let score = 0;
  
  // Get topic structure from question
  const topic = question.topic;
  const subtopic = question.subtopic || 'General';
  const branch = question.branch || 'General';
  
  // 1. Topic Affinity
  const topicWeight = userProfile.topics[topic]?.weight || DEFAULT_TOPIC_WEIGHT;
  const subtopicWeight = userProfile.topics[topic]?.subtopics[subtopic]?.weight || DEFAULT_SUBTOPIC_WEIGHT;
  const branchWeight = userProfile.topics[topic]?.subtopics[subtopic]?.branches[branch]?.weight || DEFAULT_BRANCH_WEIGHT;
  
  const topicAffinity = (topicWeight + subtopicWeight + branchWeight) / 3;
  score += topicAffinity * WEIGHTS.topicAffinity;
  explanations.push(`Topic affinity: ${topicAffinity.toFixed(2)} (${topic}/${subtopic}/${branch})`);
  
  // 2. Previous interaction with this question
  const interaction = userProfile.interactions[question.id];
  if (interaction) {
    // 2.1 Accuracy component
    if (interaction.wasCorrect !== undefined) {
      const accuracyScore = interaction.wasCorrect ? WEIGHTS.accuracy : -WEIGHTS.accuracy;
      score += accuracyScore;
      explanations.push(`Previous accuracy: ${interaction.wasCorrect ? '+' : '-'}${WEIGHTS.accuracy.toFixed(2)}`);
    }
    
    // 2.2 Time spent component
    if (interaction.timeSpent !== undefined) {
      let timeScore = 0;
      if (interaction.timeSpent < WEIGHTS.fastAnswerThreshold) {
        timeScore = WEIGHTS.timeSpent; // Fast answer = positive
      } else if (interaction.timeSpent > WEIGHTS.longAnswerThreshold) {
        timeScore = -WEIGHTS.timeSpent; // Very slow answer = negative
      }
      score += timeScore;
      explanations.push(`Time spent: ${timeScore.toFixed(2)} (${interaction.timeSpent}ms)`);
    }
    
    // 2.3 Skip penalty
    if (interaction.wasSkipped) {
      score += WEIGHTS.skipPenalty;
      explanations.push(`Skip penalty: ${WEIGHTS.skipPenalty.toFixed(2)}`);
    }
    
    // 2.4 Novelty/cooldown bonus
    const daysSinceLastView = (Date.now() - interaction.viewedAt) / (1000 * 60 * 60 * 24);
    const cooldownBonus = Math.min(daysSinceLastView * WEIGHTS.cooldown, 0.5);
    score += cooldownBonus;
    explanations.push(`Cooldown bonus: +${cooldownBonus.toFixed(2)} (${daysSinceLastView.toFixed(1)} days)`);
  } else {
    // 3. Novelty bonus for unseen questions
    score += WEIGHTS.novelty;
    explanations.push(`Novelty bonus: +${WEIGHTS.novelty.toFixed(2)} (never seen)`);
  }
  
  // Cache the result before returning
  scoreCache.set(cacheKey, { score, explanations, profileHash });
  
  // Limit cache size to prevent memory leaks
  if (scoreCache.size > 1000) {
    const firstKey = scoreCache.keys().next().value;
    if (firstKey) {
      scoreCache.delete(firstKey);
    }
  }
  
  return { score, explanations };
}

/**
 * Updates user profile based on interaction with a question
 */
export function updateUserProfile(
  userProfile: UserProfile,
  questionId: string,
  interaction: Partial<QuestionInteraction>,
  question: FeedItem
): { updatedProfile: UserProfile; weightChange: WeightChange | null } {
  // Use JSON parse/stringify for a full deep clone to avoid extensibility issues
  const updatedProfile = JSON.parse(JSON.stringify(userProfile)) as UserProfile;
  
  // 1. Update interaction history
  const currentTime = Date.now();
  const existingInteraction = updatedProfile.interactions[questionId] || {
    timeSpent: 0,
    wasSkipped: false,
    viewedAt: currentTime
  };
  
  updatedProfile.interactions[questionId] = {
    ...existingInteraction,
    ...interaction,
    viewedAt: currentTime
  };
  
  // Track total questions answered
  if (interaction.wasCorrect !== undefined) {
    updatedProfile.totalQuestionsAnswered = (updatedProfile.totalQuestionsAnswered || 0) + 1;
  }
  
  // 2. Update topic weights based on interaction
  const topic = question.topic;
  const subtopic = question.subtopic || 'General';
  const branch = question.branch || 'General';
  
  // Ensure topic tree structure exists - use explicit default values
  let topicData = updatedProfile.topics[topic];
  if (!topicData) {
    topicData = { 
      weight: DEFAULT_TOPIC_WEIGHT,
      subtopics: {},
      lastViewed: currentTime
    };
    updatedProfile.topics[topic] = topicData;
  }
  
  // Ensure subtopic exists with default weight
  if (!topicData.subtopics) {
    topicData.subtopics = {};
  }
  if (!topicData.subtopics[subtopic]) {
    topicData.subtopics[subtopic] = { 
      weight: DEFAULT_SUBTOPIC_WEIGHT,
      branches: {},
      lastViewed: currentTime
    };
  }
  
  // Ensure branch exists with default weight
  if (!topicData.subtopics[subtopic].branches) {
    topicData.subtopics[subtopic].branches = {};
  }
  if (!topicData.subtopics[subtopic].branches![branch]) {
    topicData.subtopics[subtopic].branches![branch] = { 
      weight: DEFAULT_BRANCH_WEIGHT,
      lastViewed: currentTime
    };
  }
  
  // Update weights
  const topicNode = updatedProfile.topics[topic];
  const subtopicNode = topicNode.subtopics[subtopic];
  const branchNode = subtopicNode.branches[branch];
  
  // Store old weights before updating - ensure we're using the actual current values
  const oldWeights = {
    topicWeight: topicNode.weight,
    subtopicWeight: subtopicNode.weight,
    branchWeight: branchNode.weight
  };
  
  // Update timestamps
  topicNode.lastViewed = currentTime;
  subtopicNode.lastViewed = currentTime;
  branchNode.lastViewed = currentTime;
  
  // Determine interaction type
  let interactionType: 'correct' | 'incorrect' | 'skipped' = 'skipped';
  if (interaction.wasCorrect === true) {
    interactionType = 'correct';
  } else if (interaction.wasCorrect === false) {
    interactionType = 'incorrect';
  }
  
  // Check if this question was previously skipped
  const wasSkippedPreviously = existingInteraction.wasSkipped === true;
  
  // Define compensations for previously skipped questions that are now being answered
  let skipCompensation = {
    applied: false,
    topicCompensation: 0,
    subtopicCompensation: 0,
    branchCompensation: 0
  };
  
  // If question was correct, increase weights
  if (interaction.wasCorrect) {
    // Significant weight increase for correct answers (per new requirements)
    topicNode.weight = Math.min(1.0, topicNode.weight + 0.1);
    subtopicNode.weight = Math.min(1.0, subtopicNode.weight + 0.15);
    branchNode.weight = Math.min(1.0, branchNode.weight + 0.2);
    
    // If previously skipped, compensate for the previous skip penalty
    if (wasSkippedPreviously) {
      skipCompensation.applied = true;
      skipCompensation.topicCompensation = 0.05; // Match the skip penalty
      skipCompensation.subtopicCompensation = 0.07;
      skipCompensation.branchCompensation = 0.1;
      
      // Apply compensations (with upper limit of 1.0)
      topicNode.weight = Math.min(1.0, topicNode.weight + skipCompensation.topicCompensation);
      subtopicNode.weight = Math.min(1.0, subtopicNode.weight + skipCompensation.subtopicCompensation);
      branchNode.weight = Math.min(1.0, branchNode.weight + skipCompensation.branchCompensation);
    }
  }
  // If question was answered incorrectly, moderate increase (user still engaged)
  else if (interaction.wasCorrect === false) {
    // Moderate weight increase for incorrect answers (per new requirements)
    topicNode.weight = Math.min(1.0, topicNode.weight + 0.05);
    subtopicNode.weight = Math.min(1.0, subtopicNode.weight + 0.07);
    branchNode.weight = Math.min(1.0, branchNode.weight + 0.1);
    
    // If previously skipped, add compensation (they engaged but got it wrong)
    if (wasSkippedPreviously) {
      skipCompensation.applied = true;
      skipCompensation.topicCompensation = 0.03;
      skipCompensation.subtopicCompensation = 0.04;
      skipCompensation.branchCompensation = 0.05;
      
      // Apply compensations (with upper limit of 1.0)
      topicNode.weight = Math.min(1.0, topicNode.weight + skipCompensation.topicCompensation);
      subtopicNode.weight = Math.min(1.0, subtopicNode.weight + skipCompensation.subtopicCompensation);
      branchNode.weight = Math.min(1.0, branchNode.weight + skipCompensation.branchCompensation);
    }
  }
  // If question was skipped, decrease weights (per new requirements)
  else if (interaction.wasSkipped) {
    // Store values before changes
    const prevTopicWeight = topicNode.weight;
    const prevSubtopicWeight = subtopicNode.weight;
    const prevBranchWeight = branchNode.weight;
    
    // Apply weight reductions - using explicit calculation to avoid precision issues
    const newTopicWeight = Math.max(0.1, topicNode.weight - 0.05);
    const newSubtopicWeight = Math.max(0.1, subtopicNode.weight - 0.07);
    const newBranchWeight = Math.max(0.1, branchNode.weight - 0.1);
    
    // Force explicit numeric assignment
    topicNode.weight = Number(newTopicWeight);
    subtopicNode.weight = Number(newSubtopicWeight);
    branchNode.weight = Number(newBranchWeight);
    
    // Double-check and log if weights remained unchanged
    if (Math.abs(topicNode.weight - prevTopicWeight) < 0.001) {
      console.warn(`[WEIGHT UPDATE] Warning: Topic weight didn't change for ${topic}. Before: ${prevTopicWeight}, After: ${topicNode.weight}`);
      
      // Force the change if it didn't take effect
      if (Math.abs(prevTopicWeight - 0.5) < 0.001) {
        topicNode.weight = 0.45; // Force to expected value if it was default
      }
    }
    
    if (Math.abs(subtopicNode.weight - prevSubtopicWeight) < 0.001) {
      console.warn(`[WEIGHT UPDATE] Warning: Subtopic weight didn't change for ${subtopic}. Before: ${prevSubtopicWeight}, After: ${subtopicNode.weight}`);
      
      // Force the change if it didn't take effect
      if (Math.abs(prevSubtopicWeight - 0.5) < 0.001) {
        subtopicNode.weight = 0.43; // Force to expected value if it was default
      }
    }
    
    if (Math.abs(branchNode.weight - prevBranchWeight) < 0.001) {
      console.warn(`[WEIGHT UPDATE] Warning: Branch weight didn't change for ${branch}. Before: ${prevBranchWeight}, After: ${branchNode.weight}`);
      
      // Force the change if it didn't take effect
      if (Math.abs(prevBranchWeight - 0.5) < 0.001) {
        branchNode.weight = 0.4; // Force to expected value if it was default
      }
    }
  }
  
  // Create weight change record - make sure it uses real weight values
  const weightChange: WeightChange = {
    timestamp: currentTime,
    questionId,
    interactionType,
    questionText: question.question || `Question ${questionId.substring(0, 5)}...`,
    topic: topic,
    subtopic,
    branch,
    oldWeights: {
      topicWeight: oldWeights.topicWeight,
      subtopicWeight: oldWeights.subtopicWeight,
      branchWeight: oldWeights.branchWeight
    },
    newWeights: {
      // Ensure these are numeric values
      topicWeight: Number(topicNode.weight),
      subtopicWeight: Number(subtopicNode.weight),
      branchWeight: Number(branchNode.weight)
    },
    // Add skip compensation information if applicable
    skipCompensation: skipCompensation.applied ? skipCompensation : undefined
  };
  
  return { updatedProfile, weightChange };
}

/**
 * Applies weight decay to inactive topics/subtopics/branches
 */
export function applyWeightDecay(userProfile: UserProfile): UserProfile {
  const updatedProfile = JSON.parse(JSON.stringify(userProfile)) as UserProfile;
  const currentTime = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  Object.entries(updatedProfile.topics).forEach(([topic, topicData]) => {
    const daysSinceLastViewed = (currentTime - (topicData.lastViewed || currentTime)) / oneDayMs;
    
    if (daysSinceLastViewed > 1) {
      // Apply decay to topic weight
      const decayAmount = Math.min(daysSinceLastViewed * WEIGHTS.weightDecay, 0.4); // Max decay of 0.4
      topicData.weight = Math.max(0.1, topicData.weight - decayAmount);
      
      // Apply decay to subtopics
      Object.entries(topicData.subtopics).forEach(([subtopic, subtopicData]) => {
        const subtopicDaysSinceLastViewed = (currentTime - (subtopicData.lastViewed || currentTime)) / oneDayMs;
        
        if (subtopicDaysSinceLastViewed > 1) {
          const subtopicDecayAmount = Math.min(subtopicDaysSinceLastViewed * WEIGHTS.weightDecay, 0.4);
          subtopicData.weight = Math.max(0.1, subtopicData.weight - subtopicDecayAmount);
          
          // Apply decay to branches
          Object.entries(subtopicData.branches).forEach(([branch, branchData]) => {
            const branchDaysSinceLastViewed = (currentTime - (branchData.lastViewed || currentTime)) / oneDayMs;
            
            if (branchDaysSinceLastViewed > 1) {
              const branchDecayAmount = Math.min(branchDaysSinceLastViewed * WEIGHTS.weightDecay, 0.4);
              branchData.weight = Math.max(0.1, branchData.weight - branchDecayAmount);
            }
          });
        }
      });
    }
  });
  
  return updatedProfile;
}

/**
 * Selects feed items based on personalization logic
 * May include exploration items to ensure diversity
 */
export function getPersonalizedFeed(
  allItems: FeedItem[],
  userProfile: UserProfile,
  count: number = 20
): { items: FeedItem[], explanations: { [questionId: string]: string[] } } {
  console.log('🎯 [getPersonalizedFeed] Starting with:', {
    allItemsCount: allItems.length,
    userProfileExists: !!userProfile,
    totalQuestionsAnswered: userProfile?.totalQuestionsAnswered || 0,
    coldStartComplete: userProfile?.coldStartComplete,
    requestedCount: count
  });
  
  // Check if we should use cold start strategy
  const totalQuestionsAnswered = userProfile.totalQuestionsAnswered || 0;
  const shouldUseColdStart = !userProfile.coldStartComplete && totalQuestionsAnswered < 20;
  
  console.log('🎯 [getPersonalizedFeed] shouldUseColdStart:', shouldUseColdStart);
  
  if (shouldUseColdStart) {
    console.log('🎯 [getPersonalizedFeed] Using cold start strategy');
    const result = getColdStartFeed(allItems, userProfile);
    console.log('🎯 [getPersonalizedFeed] Cold start result:', {
      itemsCount: result.items.length,
      explanationsCount: Object.keys(result.explanations).length
    });
    
    return result;
  }
  
  // Otherwise, continue with normal personalization logic
  
  // Apply weight decay to inactive topics/subtopics/branches
  const updatedProfile = applyWeightDecay(userProfile);
  
  // Score all items
  const scoredItems = allItems.map(item => {
    const { score, explanations } = calculateQuestionScore(item, updatedProfile);
    return { item, score, explanations };
  });
  
  // Split into categories:
  // 1. Items from entirely new root topics (for exploration)
  // 2. Items from known topics but new subtopics (for subtopic exploration)
  // 3. Items from known subtopics but new branches (for branch exploration)
  // 4. Items from known branches (for personalized selection)
  
  const knownTopics = new Set(Object.keys(updatedProfile.topics));
  const knownSubtopics = new Map<string, Set<string>>();
  const knownBranches = new Map<string, Map<string, Set<string>>>();
  
  // Build known subtopics and branches lookup maps
  Object.keys(updatedProfile.topics).forEach(topic => {
    knownSubtopics.set(topic, new Set(Object.keys(updatedProfile.topics[topic].subtopics)));
    knownBranches.set(topic, new Map());
    
    Object.keys(updatedProfile.topics[topic].subtopics).forEach(subtopic => {
      const branches = new Set(Object.keys(updatedProfile.topics[topic].subtopics[subtopic].branches));
      knownBranches.get(topic)?.set(subtopic, branches);
    });
  });
  
  // Categorize items
  const newTopicItems: typeof scoredItems = [];
  const newSubtopicItems: typeof scoredItems = [];
  const newBranchItems: typeof scoredItems = [];
  const knownItems: typeof scoredItems = [];
  
  scoredItems.forEach(scoredItem => {
    const { item } = scoredItem;
    const topic = item.topic;
    const subtopic = item.tags?.[0] || 'General';
    const branch = item.tags?.[1] || 'General';
    
    if (!knownTopics.has(topic)) {
      newTopicItems.push(scoredItem);
    } else if (!knownSubtopics.get(topic)?.has(subtopic)) {
      newSubtopicItems.push(scoredItem);
    } else if (!knownBranches.get(topic)?.get(subtopic)?.has(branch)) {
      newBranchItems.push(scoredItem);
    } else {
      knownItems.push(scoredItem);
    }
  });
  
  // Sort each category by score
  newTopicItems.sort((a, b) => b.score - a.score);
  newSubtopicItems.sort((a, b) => b.score - a.score);
  newBranchItems.sort((a, b) => b.score - a.score);
  knownItems.sort((a, b) => b.score - a.score);
  
  // Calculate item counts based on the new 70/30 split for normal state
  const preferredCount = Math.floor(count * 0.7); // 70% from preferred topics
  const explorationCount = count - preferredCount; // 30% for exploration
  
  // Combine the categories with explanations
  const selectedItems: FeedItem[] = [];
  const explanations: { [questionId: string]: string[] } = {};
  
  // Use a Set to track IDs we've already added to prevent duplicates
  const addedItemIds = new Set<string>();
  
  // Use a Set to track topics already used for exploration questions
  const usedExplorationTopics = new Set<string>();
  
  // Track whether each question is an exploration question
  const isExplorationQuestion = new Set<string>();
  
  // Helper function to add item only if not already added
  const addItemIfUnique = (item: FeedItem, itemExplanations: string[], isExploration: boolean = false) => {
    if (!addedItemIds.has(item.id)) {
      // For exploration questions, enforce topic diversity
      if (isExploration) {
        // Skip if we've already used this topic for exploration
        if (usedExplorationTopics.has(item.topic)) {
          return false;
        }
        usedExplorationTopics.add(item.topic);
        isExplorationQuestion.add(item.id);
        
        // Add exploration marker to explanations
        if (!itemExplanations.some(exp => exp.includes('Exploration:'))) {
          itemExplanations.push('Exploration: Discovering new content');
        }
      } else {
        // Add preferred marker to explanations
        if (!itemExplanations.some(exp => exp.includes('Preferred:'))) {
          itemExplanations.push('Preferred: Based on your interests');
        }
      }
      
      selectedItems.push(item);
      explanations[item.id] = itemExplanations;
      addedItemIds.add(item.id);
      return true;
    }
    return false;
  };
  
  // Step 1: Add preferred items from known topics (70% of total)
  let i = 0;
  let added = 0;
  
  // Track used preferred topics for diversity
  const usedPreferredTopics = new Set<string>();
  
  // First, try to add items from high-weight topics (weight > 0.5)
  while (added < preferredCount && i < knownItems.length) {
    const { item, explanations: itemExplanations } = knownItems[i];
    
    // Get topic weight
    const topicWeight = updatedProfile.topics[item.topic]?.weight || 0.5;
    
    // If weight is high enough and we haven't used this topic too much
    if (topicWeight > 0.5 && (!usedPreferredTopics.has(item.topic) || usedPreferredTopics.size >= 3)) {
      if (addItemIfUnique(item, [...itemExplanations], false)) {
      added++;
        usedPreferredTopics.add(item.topic);
      }
    }
    i++;
  }
  
  // If we still need more preferred items, add from medium-weight topics (0.3 < weight <= 0.5)
  i = 0;
  while (added < preferredCount && i < knownItems.length) {
    const { item, explanations: itemExplanations } = knownItems[i];
    
    // Get topic weight
    const topicWeight = updatedProfile.topics[item.topic]?.weight || 0.5;
    
    // If weight is medium and we haven't used this topic too much
    if (topicWeight > 0.3 && topicWeight <= 0.5 && (!usedPreferredTopics.has(item.topic) || usedPreferredTopics.size >= 5)) {
      if (addItemIfUnique(item, [...itemExplanations], false)) {
        added++;
        usedPreferredTopics.add(item.topic);
      }
    }
    i++;
  }
  
  // If we still need more, fill from any remaining known items
  i = 0;
  while (added < preferredCount && i < knownItems.length) {
    const { item, explanations: itemExplanations } = knownItems[i];
    
    if (addItemIfUnique(item, [...itemExplanations], false)) {
      added++;
    }
    i++;
  }
  
  // Step 2: Add exploration items (30% of total)
  let explorationAdded = 0;
  
  // First, try to add new branch items (most conservative exploration)
  i = 0;
  while (explorationAdded < explorationCount && i < newBranchItems.length) {
    const { item, explanations: itemExplanations } = newBranchItems[i];
    
    if (addItemIfUnique(item, [...itemExplanations], true)) {
      explorationAdded++;
    }
    i++;
  }
  
  // Then, add new subtopic items (moderate exploration)
  i = 0;
  while (explorationAdded < explorationCount && i < newSubtopicItems.length) {
    const { item, explanations: itemExplanations } = newSubtopicItems[i];
    
    if (addItemIfUnique(item, [...itemExplanations], true)) {
      explorationAdded++;
    }
    i++;
  }
  
  // Finally, add new topic items (most aggressive exploration)
  i = 0;
  while (explorationAdded < explorationCount && i < newTopicItems.length) {
    const { item, explanations: itemExplanations } = newTopicItems[i];
    
    if (addItemIfUnique(item, [...itemExplanations], true)) {
      explorationAdded++;
    }
    i++;
  }
  
  // If we still haven't filled our target, add any remaining items
  const allRemainingItems = [
    ...newBranchItems,
    ...newSubtopicItems, 
    ...newTopicItems,
    ...knownItems
  ].filter(({ item }) => !addedItemIds.has(item.id));
  
  i = 0;
  while (selectedItems.length < count && i < allRemainingItems.length) {
    const { item, explanations: itemExplanations } = allRemainingItems[i];
    
    if (addItemIfUnique(item, [...itemExplanations], false)) {
      // This counts as filler, not specifically preferred or exploration
    }
    i++;
  }
  
  console.log('🎯 [getPersonalizedFeed] Normal personalization result:', {
    selectedItemsCount: selectedItems.length,
    explanationsCount: Object.keys(explanations).length,
    requestedCount: count
  });
  
  return { items: selectedItems, explanations };
}

/**
 * Creates an initial user profile with default weights
 */
export function createInitialUserProfile(): UserProfile {
  // Create empty topics object
  const initialTopics: { [topicName: string]: RootTopic } = {};
  
  // Add all known topics with exact DEFAULT weights (0.5)
  ALL_TOPICS.forEach(topic => {
    initialTopics[topic] = {
      weight: DEFAULT_TOPIC_WEIGHT, // Explicitly use 0.5
      subtopics: {
        'General': {
          weight: DEFAULT_SUBTOPIC_WEIGHT, // Explicitly use 0.5
          branches: {
            'General': {
              weight: DEFAULT_BRANCH_WEIGHT // Explicitly use 0.5
            }
          },
          lastViewed: Date.now()
        }
      },
      lastViewed: Date.now()
    };
  });
  
  return {
    topics: initialTopics,
    interactions: {},
    lastRefreshed: Date.now(),
    coldStartComplete: false,
    totalQuestionsAnswered: 0
  };
} 