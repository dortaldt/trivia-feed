import { FeedItem } from './triviaService';
import { getColdStartFeed } from './coldStartStrategy';

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
  const explanations: string[] = [];
  let score = 0;
  
  // Get topic structure from question
  const topic = question.category;
  const subtopic = question.tags?.[0] || 'General';
  const branch = question.tags?.[1] || 'General';
  
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
): UserProfile {
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
  const topic = question.category;
  const subtopic = question.tags?.[0] || 'General';
  const branch = question.tags?.[1] || 'General';
  
  // Ensure topic tree structure exists
  if (!updatedProfile.topics[topic]) {
    updatedProfile.topics[topic] = {
      weight: DEFAULT_TOPIC_WEIGHT,
      subtopics: {},
      lastViewed: currentTime
    };
  }
  
  if (!updatedProfile.topics[topic].subtopics[subtopic]) {
    updatedProfile.topics[topic].subtopics[subtopic] = {
      weight: DEFAULT_SUBTOPIC_WEIGHT,
      branches: {},
      lastViewed: currentTime
    };
  }
  
  if (!updatedProfile.topics[topic].subtopics[subtopic].branches[branch]) {
    updatedProfile.topics[topic].subtopics[subtopic].branches[branch] = {
      weight: DEFAULT_BRANCH_WEIGHT,
      lastViewed: currentTime
    };
  }
  
  // Update weights
  const topicNode = updatedProfile.topics[topic];
  const subtopicNode = topicNode.subtopics[subtopic];
  const branchNode = subtopicNode.branches[branch];
  
  // Update timestamps
  topicNode.lastViewed = currentTime;
  subtopicNode.lastViewed = currentTime;
  branchNode.lastViewed = currentTime;
  
  // If question was correct, increase weights
  if (interaction.wasCorrect) {
    topicNode.weight = Math.min(1.0, topicNode.weight + 0.05);
    subtopicNode.weight = Math.min(1.0, subtopicNode.weight + 0.08);
    branchNode.weight = Math.min(1.0, branchNode.weight + 0.1);
  } 
  // If question was answered incorrectly, slight decrease
  else if (interaction.wasCorrect === false) {
    // Less decrease for incorrect answers since they still show engagement
    topicNode.weight = Math.max(0.1, topicNode.weight - 0.02);
    subtopicNode.weight = Math.max(0.1, subtopicNode.weight - 0.03);
    branchNode.weight = Math.max(0.1, branchNode.weight - 0.05);
  }
  // If question was skipped, larger decrease
  else if (interaction.wasSkipped) {
    topicNode.weight = Math.max(0.1, topicNode.weight - 0.05);
    subtopicNode.weight = Math.max(0.1, subtopicNode.weight - 0.07);
    branchNode.weight = Math.max(0.1, branchNode.weight - 0.1);
  }
  
  return updatedProfile;
}

/**
 * Applies weight decay to inactive topics/subtopics/branches
 */
export function applyWeightDecay(userProfile: UserProfile): UserProfile {
  const currentTime = Date.now();
  const daysSinceLastRefresh = (currentTime - userProfile.lastRefreshed) / (1000 * 60 * 60 * 24);
  
  // Only apply decay if it's been at least a day
  if (daysSinceLastRefresh < 1) {
    return userProfile;
  }
  
  const decayFactor = daysSinceLastRefresh * WEIGHTS.weightDecay;
  const updatedProfile = { ...userProfile, lastRefreshed: currentTime };
  
  // Apply decay to all topics
  Object.keys(updatedProfile.topics).forEach(topicName => {
    const topic = updatedProfile.topics[topicName];
    
    // Decay topic weight
    const daysSinceTopicViewed = (currentTime - (topic.lastViewed || 0)) / (1000 * 60 * 60 * 24);
    if (daysSinceTopicViewed > 1) {
      topic.weight = Math.max(0.1, topic.weight - decayFactor);
    }
    
    // Decay subtopics
    Object.keys(topic.subtopics).forEach(subtopicName => {
      const subtopic = topic.subtopics[subtopicName];
      
      // Decay subtopic weight
      const daysSinceSubtopicViewed = (currentTime - (subtopic.lastViewed || 0)) / (1000 * 60 * 60 * 24);
      if (daysSinceSubtopicViewed > 1) {
        subtopic.weight = Math.max(0.1, subtopic.weight - decayFactor);
      }
      
      // Decay branches
      Object.keys(subtopic.branches).forEach(branchName => {
        const branch = subtopic.branches[branchName];
        
        // Decay branch weight
        const daysSinceBranchViewed = (currentTime - (branch.lastViewed || 0)) / (1000 * 60 * 60 * 24);
        if (daysSinceBranchViewed > 1) {
          branch.weight = Math.max(0.1, branch.weight - decayFactor);
        }
      });
    });
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
  // Check if we should use cold start strategy
  const totalInteractions = Object.keys(userProfile.interactions).length;
  const totalQuestionsAnswered = userProfile.totalQuestionsAnswered || 0;
  
  // Use cold start strategy if user has interacted with fewer than 20 questions
  // or if coldStartComplete flag is not set to true
  if (totalInteractions < 20 || totalQuestionsAnswered < 20 || !userProfile.coldStartComplete) {
    console.log('Using Cold Start Strategy for feed personalization');
    const coldStartResult = getColdStartFeed(allItems, userProfile, count);
    
    // If we're in the final phase, mark cold start as complete
    if (coldStartResult.state.phase === 4 && coldStartResult.state.questionsShown >= 20) {
      // This will be saved to userProfile when updateUserProfile is called
      userProfile.coldStartComplete = true;
    }
    
    return {
      items: coldStartResult.items,
      explanations: coldStartResult.explanations
    };
  }
  
  // Otherwise, continue with standard personalization logic
  console.log('Using Standard Personalization Strategy for feed');
  
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
    const topic = item.category;
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
  
  // Calculate item counts for each category
  const newTopicCount = Math.floor(count * EXPLORATION.newRootTopics);
  const newSubtopicCount = Math.floor(count * EXPLORATION.newSubtopics);
  const newBranchCount = Math.floor(count * EXPLORATION.newBranches);
  const knownItemCount = count - newTopicCount - newSubtopicCount - newBranchCount;
  
  // Combine the categories with explanations
  const selectedItems: FeedItem[] = [];
  const explanations: { [questionId: string]: string[] } = {};
  
  // Add known items (highest priority)
  knownItems.slice(0, knownItemCount).forEach(({ item, explanations: itemExplanations }) => {
    selectedItems.push(item);
    explanations[item.id] = itemExplanations;
  });
  
  // Add exploration items
  newBranchItems.slice(0, newBranchCount).forEach(({ item, explanations: itemExplanations }) => {
    selectedItems.push(item);
    explanations[item.id] = [...itemExplanations, 'Exploration: New branch within known subtopic'];
  });
  
  newSubtopicItems.slice(0, newSubtopicCount).forEach(({ item, explanations: itemExplanations }) => {
    selectedItems.push(item);
    explanations[item.id] = [...itemExplanations, 'Exploration: New subtopic within known topic'];
  });
  
  newTopicItems.slice(0, newTopicCount).forEach(({ item, explanations: itemExplanations }) => {
    selectedItems.push(item);
    explanations[item.id] = [...itemExplanations, 'Exploration: Entirely new topic'];
  });
  
  // Fill remaining slots from known items if needed
  if (selectedItems.length < count) {
    const remainingCount = count - selectedItems.length;
    knownItems.slice(knownItemCount, knownItemCount + remainingCount).forEach(({ item, explanations: itemExplanations }) => {
      selectedItems.push(item);
      explanations[item.id] = itemExplanations;
    });
  }
  
  return { 
    items: selectedItems, 
    explanations
  };
}

/**
 * Creates an initial empty user profile
 */
export function createInitialUserProfile(): UserProfile {
  return {
    topics: {},
    interactions: {},
    lastRefreshed: Date.now(),
    coldStartComplete: false,
    totalQuestionsAnswered: 0
  };
} 