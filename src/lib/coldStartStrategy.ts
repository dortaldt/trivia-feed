import { FeedItem } from './triviaService';
import { UserProfile } from './personalizationService';
import { ALL_TOPICS, INITIAL_EXPLORATION_TOPICS, getDefaultTopicWeights } from '../constants/topics';
import { logger } from '../utils/logger';

// Define types for categorizing questions
type Topic = string;
type Subtopic = string;
type Branch = string;

// Default weight threshold that separates preferred topics from exploration topics
const PREFERRED_TOPIC_THRESHOLD = 0.5;

// Maximum number of consecutive questions allowed from the same topic
const MAX_CONSECUTIVE_TOPIC = 2;

// Track question selection for the cold start phases
interface ColdStartState {
  phase: 'exploration' | 'branching' | 'normal'; // Three phases: Exploration (1-5), Branching (6-20), Normal (20+)
  questionsShown: number;                       // Total questions shown to the user
  topicsShown: Set<string>;                     // Topic names already shown
  shownQuestionIds: Set<string>;                // Question IDs that have been shown already
  subtopicsShown: Map<Topic, Set<Subtopic>>;    // Subtopics shown by topic
  recentTopics: string[];                       // Recently shown topics (for diversity mechanism)
  correctAnsweredByTopic: Map<Topic, number>;   // Number of correctly answered questions by topic
  wrongAnsweredByTopic: Map<Topic, number>;     // Number of incorrectly answered questions by topic
  skippedByTopic: Map<Topic, number>;           // Number of skipped questions by topic
  previouslyInterestedTopics: string[];         // Topics the user previously answered (right or wrong)
  isExplorationQuestion: Set<string>;           // Question IDs that were presented as exploration questions
  topicWeights: Map<Topic, number>;             // In-session topic weights
  topicCountInCurrentBatch: Map<Topic, number>; // Count of each topic in the current batch (for diversity)
  lastSelectedTopics: string[];                 // Last N topics selected (for limiting consecutive selections)
}

// Initialize cold start state
function initColdStartState(): ColdStartState {
  return {
    phase: 'exploration',
    questionsShown: 0,
    topicsShown: new Set(),
    shownQuestionIds: new Set(),
    subtopicsShown: new Map(),
    recentTopics: [],
    correctAnsweredByTopic: new Map(),
    wrongAnsweredByTopic: new Map(),
    skippedByTopic: new Map(),
    previouslyInterestedTopics: [],
    isExplorationQuestion: new Set(),
    topicWeights: new Map(),
    topicCountInCurrentBatch: new Map(),
    lastSelectedTopics: []
  };
}

// Group questions by topic and subtopic
function groupQuestionsByTopic(allQuestions: FeedItem[]): Map<Topic, Map<Subtopic, FeedItem[]>> {
  console.log('📊 [groupQuestionsByTopic] Starting with', allQuestions.length, 'questions');
  const groupedQuestions = new Map<Topic, Map<Subtopic, FeedItem[]>>();

  // Get topic configuration from app config
  let filterByTopic = false;
  let topicToFilter: string | undefined;
  
  try {
    const Constants = require('expo-constants');
    const expoExtra = Constants.expoConfig?.extra;
    const activeTopic = expoExtra?.activeTopic;
    const filterContentByTopic = expoExtra?.filterContentByTopic;
    
    console.log('📊 [groupQuestionsByTopic] App config:', {
      activeTopic,
      filterContentByTopic,
      hasExtra: !!expoExtra
    });
    
    if (filterContentByTopic && activeTopic && activeTopic !== 'default') {
      filterByTopic = true;
      topicToFilter = activeTopic;
      logger.info('ColdStart', `Cold start strategy: Filtering questions by topic: ${topicToFilter}`);
      console.log('🔍 [groupQuestionsByTopic] Topic filtering enabled for:', topicToFilter);
    }
  } catch (e) {
    logger.error('ColdStart', 'Error checking topic config in cold start strategy:', String(e));
  }

  try {
    allQuestions.forEach(question => {
      const topic = question.topic;
      
      // Skip questions that don't match the filter topic when filter is enabled
      if (filterByTopic && topicToFilter && topic !== topicToFilter) {
        return;
      }
      
      const subtopic = question.tags?.[0] || 'General';
      
      if (!groupedQuestions.has(topic)) {
        groupedQuestions.set(topic, new Map<Subtopic, FeedItem[]>());
      }
      
      const topicMap = groupedQuestions.get(topic)!;
      
      if (!topicMap.has(subtopic)) {
        topicMap.set(subtopic, []);
      }
      
      topicMap.get(subtopic)!.push(question);
    });

    // Log detailed structure of grouped questions (commented out to reduce spam)
    // console.log('📊 [groupQuestionsByTopic] Final grouping structure:');
    // Array.from(groupedQuestions.entries()).forEach(([topic, subtopicMap]) => {
    //   console.log(`  📂 Topic: ${topic} (${subtopicMap.size} subtopics)`);
    //   Array.from(subtopicMap.entries()).forEach(([subtopic, questions]) => {
    //     console.log(`    📝 Subtopic: ${subtopic} (${questions.length} questions)`);
    //   });
    // });

    // Log how many questions were kept after filtering
    if (filterByTopic && topicToFilter) {
      let totalQuestions = 0;
      groupedQuestions.forEach((subtopicMap) => {
        subtopicMap.forEach((questions) => {
          totalQuestions += questions.length;
        });
      });
      logger.info('ColdStart', `Cold start strategy: After topic filtering - ${totalQuestions} questions match topic ${topicToFilter}`);
      console.log('🔍 [groupQuestionsByTopic] After filtering:', totalQuestions, 'questions for topic', topicToFilter);
    }
    
    console.log('📊 [groupQuestionsByTopic] COMPLETED - Total topics:', groupedQuestions.size);
    return groupedQuestions;
  } catch (error) {
    console.error('❌ [groupQuestionsByTopic] Error grouping questions by topic:', error);
    return new Map();
  }
}

// Helper function to check if a topic is allowed based on diversity requirements
function isTopicAllowedForDiversity(state: ColdStartState, topic: string): boolean {
  // First check if we're in single topic mode using the flags added to state
  const isInSingleTopicMode = (state as any).isInSingleTopicMode;
  const activeTopicName = (state as any).activeTopicName;
  
  // If in single topic mode and this matches the active topic, always allow it
  if (isInSingleTopicMode && activeTopicName === topic) {
    logger.info('ColdStart', `Single topic mode active for ${activeTopicName}, allowing ${topic} regardless of diversity rules`);
    return true;
  }
  
  // Get topic configuration from app config as backup method - Skip diversity checks in single topic mode
  try {
    const Constants = require('expo-constants');
    const expoExtra = Constants.expoConfig?.extra;
    const activeTopic = expoExtra?.activeTopic;
    const filterContentByTopic = expoExtra?.filterContentByTopic;
    
    // If we're in single topic mode and this is the active topic, always allow it
    if (filterContentByTopic && activeTopic && activeTopic !== 'default' && topic === activeTopic) {
      logger.info('ColdStart', `Single topic mode active (${activeTopic}), bypassing diversity checks for ${topic}`);
      return true;
    }
  } catch (e) {
    logger.error('ColdStart', 'Error checking topic config:', String(e));
  }
  
  // Check if this would be the third consecutive question from the same topic
  if (state.lastSelectedTopics.length >= MAX_CONSECUTIVE_TOPIC) {
    const recentTopics = state.lastSelectedTopics.slice(0, MAX_CONSECUTIVE_TOPIC);
    if (recentTopics.every(t => t === topic)) {
      logger.info('ColdStart', `Topic ${topic} rejected: would be ${MAX_CONSECUTIVE_TOPIC + 1} consecutive questions from same topic`);
      return false;
    }
  }
  
  // Check if this topic appears too frequently in recent history
  // For branching phase, we want to strongly discourage repeated topics
  if (state.phase === 'branching') {
    const topicOccurrences = state.lastSelectedTopics.filter(t => t === topic).length;
    if (topicOccurrences >= 1) {
      logger.info('ColdStart', `Topic ${topic} rejected in branching phase: already used ${topicOccurrences} times recently`);
      return false;
    }
  }
  
  // Additional check for normal phase to ensure better topic distribution
  if (state.phase === 'normal') {
    // Get the count of this topic in the current batch
    const topicCount = state.topicCountInCurrentBatch.get(topic) || 0;
    
    // Get the total count of all topics
    const totalCount = Array.from(state.topicCountInCurrentBatch.values()).reduce((sum, count) => sum + count, 0);
    
    // If we have at least 4 questions and this topic is already overrepresented, reject
    if (totalCount >= 4) {
      const expectedProportion = 1 / (state.topicCountInCurrentBatch.size || 1);
      const actualProportion = topicCount / totalCount;
      
      if (actualProportion >= expectedProportion * 2) {
        logger.info('ColdStart', `Topic ${topic} rejected in normal phase: already overrepresented (${topicCount}/${totalCount} questions, ${(actualProportion * 100).toFixed(1)}%)`);
        return false;
      }
    }
  }
  
  return true;
}



// Get questions for the exploration phase (1-5)
function getExplorationPhaseQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Topic, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): FeedItem[] {
  console.log('🎯 [getExplorationPhaseQuestions] Starting with:', {
    allQuestionsCount: allQuestions.length,
    groupedQuestionsSize: groupedQuestions.size,
    availableTopics: Array.from(groupedQuestions.keys()).slice(0, 5)
  });
  
  logger.info('ColdStart', "Getting Initial Exploration phase questions (1-5) - STRICT ONE PER TOPIC");
  
  // Initialize topic weights from userProfile
  initializeTopicWeights(state, userProfile, Array.from(groupedQuestions.keys()));

  // Clear the topic count for this new batch
  state.topicCountInCurrentBatch.clear();
  
  // Check if this is a niche app and use subtopic variety from the start
  const nicheAppCheck = isNicheApp();
  const isSingleTopicMode = groupedQuestions.size === 1; // Fallback: if only 1 topic, treat as niche
  const shouldUseSubtopicVariety = nicheAppCheck || isSingleTopicMode;
  
  console.log('🔍 [getExplorationPhaseQuestions] Niche detection:', {
    nicheAppCheck,
    isSingleTopicMode,
    groupedTopicsCount: groupedQuestions.size,
    shouldUseSubtopicVariety
  });
  
  if (shouldUseSubtopicVariety) {
    console.log('🎯 [getExplorationPhaseQuestions] Single topic/Niche mode detected - using subtopic variety selection');
    
    const nicheQuestions = selectQuestionsWithSubtopicVariety(groupedQuestions, state, 5);
    
    console.log(`📋 [getExplorationPhaseQuestions] Subtopic variety returned ${nicheQuestions.length} questions`);
    
    // Track diversity for all selected questions
    nicheQuestions.forEach(question => {
      trackTopicForDiversity(state, question.topic);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(question.topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    });
    
    console.log(`🎯 [getExplorationPhaseQuestions] Niche app: COMPLETED - Selected ${nicheQuestions.length} questions with subtopic variety`);
    return nicheQuestions;
  } else {
    console.log('❌ [getExplorationPhaseQuestions] Not a niche app - using regular exploration logic');
  }

  const selectedQuestions: FeedItem[] = [];
  const selectedTopics = new Set<string>(); // Track selected topics to ensure diversity
  
  // Create a prioritized list of initial topics to try
  // We want to try all initial topics first
  let prioritizedTopics = [...INITIAL_EXPLORATION_TOPICS];
  
  // Check if we're in single topic mode and add the active topic
  const isInSingleTopicMode = (state as any).isInSingleTopicMode;
  const activeTopicName = (state as any).activeTopicName;
  
  if (isInSingleTopicMode && activeTopicName) {
    // In single topic mode, prioritize the active topic and include it in exploration
    // Get the DB topic name from available topics in grouped questions
    const availableTopics = Array.from(groupedQuestions.keys());
    const activeDbTopic = availableTopics.find(topic => 
      topic === activeTopicName || 
      topic.toLowerCase().includes(activeTopicName.toLowerCase()) ||
      activeTopicName.toLowerCase().includes(topic.toLowerCase())
    );
    
    if (activeDbTopic && !prioritizedTopics.includes(activeDbTopic)) {
      // Put the active topic first in the list
      prioritizedTopics = [activeDbTopic, ...prioritizedTopics];
      console.log('🎯 [getExplorationPhaseQuestions] Added active topic to exploration:', activeDbTopic);
    }
  }
  
  console.log('🎯 [getExplorationPhaseQuestions] Initial exploration topics:', {
    INITIAL_EXPLORATION_TOPICS: INITIAL_EXPLORATION_TOPICS,
    isInSingleTopicMode: isInSingleTopicMode,
    activeTopicName: activeTopicName,
    prioritizedTopics: prioritizedTopics,
    availableInGrouped: prioritizedTopics.filter(topic => groupedQuestions.has(topic)),
    actualAvailableTopics: Array.from(groupedQuestions.keys())
  });
  
  // FALLBACK: If no initial exploration topics are available but we have grouped questions,
  // use whatever topics are actually available (handles single topic mode when config detection fails)
  if (prioritizedTopics.filter(topic => groupedQuestions.has(topic)).length === 0 && groupedQuestions.size > 0) {
    const actualTopics = Array.from(groupedQuestions.keys());
    console.log('🎯 [getExplorationPhaseQuestions] No initial topics available, using actual topics as fallback:', actualTopics);
    prioritizedTopics = actualTopics;
  }
  
  // Shuffle to get some randomness in selection order, while maintaining the priority of initial topics
  shuffleArray(prioritizedTopics);
  
  logger.info('ColdStart', `Prioritized initial topics (after shuffle): ${prioritizedTopics.join(', ')}`);
  
  // First pass: Try to select one question from each initial topic
  for (const topic of prioritizedTopics) {
    // Skip if we already have 5 questions
    if (selectedQuestions.length >= 5) break;
    
    // Skip if we already selected a question from this topic
    if (selectedTopics.has(topic)) {
      logger.info('ColdStart', `Skipping topic ${topic} - already selected a question from this topic`);
      continue;
    }
    
    const topicMap = groupedQuestions.get(topic);
    if (!topicMap) {
      logger.info('ColdStart', `Topic ${topic} has no questions available in groupedQuestions`);
      continue;
    }
    
    // Get all questions from this topic that haven't been shown
    const availableQuestions = Array.from(topicMap.values()).flat()
      .filter(q => !state.shownQuestionIds.has(q.id));
      
    // logger.info(`Topic ${topic} has ${availableQuestions.length} available questions`);
      
    if (availableQuestions.length > 0) {
      // Randomly select a question from this topic
      const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      selectedQuestions.push(question);
      
      // Track that we've used this topic
      selectedTopics.add(topic);
      
      // Mark as shown and as an exploration question
      state.shownQuestionIds.add(question.id);
      state.topicsShown.add(topic);
      state.isExplorationQuestion.add(question.id);
      
      // Track this topic for diversity
      trackTopicForDiversity(state, topic);
      
      // logger.info(`Added question from initial topic: ${topic} (weight: ${state.topicWeights.get(topic)?.toFixed(2) || 'default'})`);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    } else {
      logger.info('ColdStart', `No unseen questions available for topic ${topic}`);
    }
  }

  // If we still don't have 5 questions, try the initial topics again (allow duplicates if necessary)
  if (selectedQuestions.length < 5) {
    logger.info('ColdStart', `Only selected ${selectedQuestions.length} questions from initial topics, need ${5 - selectedQuestions.length} more`);
    
    // Make a new copy of initial topics and shuffle again for a different order
    const remainingInitialTopics = [...INITIAL_EXPLORATION_TOPICS];
    shuffleArray(remainingInitialTopics);
    
    logger.info('ColdStart', `Trying initial topics again: ${remainingInitialTopics.join(', ')}`);
    
    // Try each initial topic again, even if we've already used it
    for (const topic of remainingInitialTopics) {
      if (selectedQuestions.length >= 5) break;
      
      const topicMap = groupedQuestions.get(topic);
      if (!topicMap) continue;
      
      // Get available questions that haven't been shown yet
      const availableQuestions = Array.from(topicMap.values()).flat()
        .filter(q => !state.shownQuestionIds.has(q.id));
        
      if (availableQuestions.length > 0) {
        // Randomly select a question
        const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        selectedQuestions.push(question);
        
        // Track that we've used this topic
        selectedTopics.add(topic);
        
        // Mark as shown and as an exploration question
        state.shownQuestionIds.add(question.id);
        state.topicsShown.add(topic);
        state.isExplorationQuestion.add(question.id);
        
        // Track this topic for diversity
        trackTopicForDiversity(state, topic);
        
        logger.info('ColdStart', `Added additional question from initial topic: ${topic}`);
        
        // Add to recent topics for diversity tracking
        state.recentTopics.unshift(topic);
        if (state.recentTopics.length > 5) {
          state.recentTopics.pop();
        }
      }
    }
  }
  
  // Last resort: If we still need more questions, use any remaining questions FROM INITIAL TOPICS ONLY
  if (selectedQuestions.length < 5) {
    logger.info('ColdStart', `Still only have ${selectedQuestions.length} questions, need ${5 - selectedQuestions.length} more from INITIAL TOPICS ONLY`);
    
    // Get unused initial topics first - this is the key improvement
    const unusedInitialTopics = INITIAL_EXPLORATION_TOPICS.filter(topic => 
      !Array.from(state.topicsShown).includes(topic) && 
      !selectedQuestions.some(q => q.topic === topic)
    );
    
    logger.info('ColdStart', `Prioritizing unused initial topics: ${unusedInitialTopics.join(', ')}`);
    
    // Filter questions to prioritize unused topics
    const remainingQuestionsFromUnusedTopics = allQuestions
      .filter(q => !state.shownQuestionIds.has(q.id))
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id))
      .filter(q => unusedInitialTopics.includes(q.topic));
      
    // If we still need more, fall back to any initial topic
    const remainingQuestionsFromAnyInitialTopic = allQuestions
      .filter(q => !state.shownQuestionIds.has(q.id))
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id))
      .filter(q => INITIAL_EXPLORATION_TOPICS.includes(q.topic))
      .filter(q => !remainingQuestionsFromUnusedTopics.some(uq => uq.id === q.id));
    
    // Combine with priority for unused topics
    const remainingQuestionsFromUnusedTopicsCopy = [...remainingQuestionsFromUnusedTopics];
    const remainingQuestionsFromAnyInitialTopicCopy = [...remainingQuestionsFromAnyInitialTopic];
    
    shuffleArray(remainingQuestionsFromUnusedTopicsCopy);
    shuffleArray(remainingQuestionsFromAnyInitialTopicCopy);
    
    const remainingQuestions = [
      ...remainingQuestionsFromUnusedTopicsCopy, 
      ...remainingQuestionsFromAnyInitialTopicCopy
    ];
    
    logger.info('ColdStart', `Found ${remainingQuestionsFromUnusedTopics.length} questions from unused topics and ${remainingQuestionsFromAnyInitialTopic.length} from previously used topics`);
    
    // Add questions up to 5 total
    for (const question of remainingQuestions) {
      if (selectedQuestions.length >= 5) break;
      
      selectedQuestions.push(question);
      
      // Mark as shown and as an exploration question
      state.shownQuestionIds.add(question.id);
      state.topicsShown.add(question.topic);
      state.isExplorationQuestion.add(question.id);
      
      // Track this topic for diversity
      trackTopicForDiversity(state, question.topic);
      
      logger.info('ColdStart', `Added question from last-resort (initial topics only): ${question.topic}`);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(question.topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    }
  }
  
  // logger.info(`Selected ${selectedQuestions.length} exploration questions from ${selectedTopics.size} different topics`);
  // logger.info(`Topics used: ${Array.from(selectedTopics).join(', ')}`);
  // logger.info(`Topics now shown: ${Array.from(state.topicsShown).join(', ')}`);
  // logger.info(`Topic distribution: ${Array.from(state.topicCountInCurrentBatch.entries()).map(([topic, count]) => `${topic}: ${count}`).join(', ')}`);

  return selectedQuestions;
}

// Initialize topic weights from userProfile
function initializeTopicWeights(state: ColdStartState, userProfile: UserProfile, allTopics: string[]): void {
  // Add any topics from the user profile that aren't in the state weights
  if (userProfile.topics) {
    Object.entries(userProfile.topics).forEach(([topic, data]) => {
      if (!state.topicWeights.has(topic)) {
        state.topicWeights.set(topic, data.weight);
      }
    });
  }

  // Add default weight (0.5) for any topic not in the weights map
  // First use ALL_TOPICS to ensure all standard topics have weights
  for (const topic of ALL_TOPICS) {
    if (!state.topicWeights.has(topic)) {
      state.topicWeights.set(topic, 0.5);
    }
  }
  
  // Then add any additional topics from the provided list
  for (const topic of allTopics) {
    if (!state.topicWeights.has(topic)) {
      state.topicWeights.set(topic, 0.5);
    }
  }
  
  // logger.info("In-session topic weights:");
  // Array.from(state.topicWeights.entries()).forEach(([topic, weight]) => {
  //   logger.info(`  ${topic}: ${weight.toFixed(2)}`);
  // });
}

// Get questions for the initial branching phase (6-20)
function getBranchingPhaseQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Topic, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): FeedItem[] {
  // Performance tracker ⏱️ - Cold Start Phase Calculation START
  const coldStartPhaseStart = performance.now();
  // console.log(`[Performance tracker ⏱️] Cold Start Phase Calculation (Branching) - Started: ${coldStartPhaseStart.toFixed(2)}ms`);
  
  // Add detailed debug logging
  logger.info('ColdStart', "Getting Branching phase questions (6-12 answered)");
  
  // Initialize or update topic weights
  initializeTopicWeights(state, userProfile, Array.from(groupedQuestions.keys()));
  
  // Clear the topic count for this new batch
  state.topicCountInCurrentBatch.clear();
  
  // Check if this is a niche app and use subtopic variety
  const nicheAppCheck = isNicheApp();
  const isSingleTopicMode = groupedQuestions.size === 1;
  const shouldUseSubtopicVariety = nicheAppCheck || isSingleTopicMode;
  
  if (shouldUseSubtopicVariety) {
    console.log('🎯 [getBranchingPhaseQuestions] Single topic/Niche mode detected - using subtopic variety selection');
    
    const nicheQuestions = selectQuestionsWithSubtopicVariety(groupedQuestions, state, 4);
    
    // Track diversity for all selected questions
    nicheQuestions.forEach(question => {
      trackTopicForDiversity(state, question.topic);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(question.topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    });
    
    console.log(`🎯 [getBranchingPhaseQuestions] Single topic/Niche mode: Selected ${nicheQuestions.length} questions with subtopic variety`);
    return nicheQuestions;
  }
  
  // Log in-session weights
  // logger.info("Current in-session topic weights for normal phase:");
  // Array.from(state.topicWeights.entries()).forEach(([topic, weight]) => {
  //   logger.info(`  ${topic}: ${weight.toFixed(2)}`);
  // });
  logger.info('ColdStart', "===========================================");

  logger.info('ColdStart', "Getting Initial Branching phase questions (6-20)");

  const selectedQuestions: FeedItem[] = [];
  
  // Step 1: Select exactly 2 questions based on user interaction (topic/subtopic weights)
  const interactedTopics = new Set<string>();
  const onlySkippedTopics = new Set<string>();
  let hasAnsweredTopics = false;
  
  // Collect topics where the user has answered questions (right or wrong)
  state.correctAnsweredByTopic.forEach((count, topic) => {
    if (count > 0) {
      interactedTopics.add(topic);
      hasAnsweredTopics = true;
      logger.info('ColdStart', `Topic ${topic} was answered correctly ${count} times`);
    }
  });
  
  state.wrongAnsweredByTopic.forEach((count, topic) => {
    if (count > 0) {
      interactedTopics.add(topic);
      hasAnsweredTopics = true;
      logger.info('ColdStart', `Topic ${topic} was answered incorrectly ${count} times`);
    }
  });
  
  // Collect topics that were only skipped
  state.skippedByTopic.forEach((count, topic) => {
    if (count > 0 && !interactedTopics.has(topic)) {
      onlySkippedTopics.add(topic);
      logger.info('ColdStart', `Topic ${topic} was only skipped (${count} times)`);
    }
  });

  logger.info('ColdStart', `Has answered topics: ${hasAnsweredTopics}`);
  logger.info('ColdStart', `Interacted topics: ${Array.from(interactedTopics).join(', ')}`);
  logger.info('ColdStart', `Only skipped topics: ${Array.from(onlySkippedTopics).join(', ')}`);

  // Update the stored list of previously interested topics
  state.previouslyInterestedTopics = Array.from(interactedTopics);
  
  const userPreferredQuestions: FeedItem[] = [];
  
  // If user has answered questions, prioritize those topics with higher weights
  if (hasAnsweredTopics) {
    logger.info('ColdStart', "User has answered questions, selecting from answered topics");
    
    // Create an array of topics with their weights from in-session state
    const topicsWithWeights = Array.from(interactedTopics).map(topic => {
      // Use in-session state weights
      const weight = state.topicWeights.get(topic) || 0.5;
      
      // NEW: Calculate a diversity score (penalize recently used topics)
      const recentOccurrences = state.lastSelectedTopics.filter(t => t === topic).length;
      const diversityFactor = Math.max(0, 1 - (recentOccurrences * 0.3));
      
      // Combine weight with diversity factor
      const adjustedWeight = weight * diversityFactor;
      
      return { topic, weight: adjustedWeight, originalWeight: weight };
    });
    
    // Sort topics by adjusted weight (descending)
    topicsWithWeights.sort((a, b) => b.weight - a.weight);
    
    logger.info('ColdStart', "Answered topics sorted by weight with diversity adjustment:");
    topicsWithWeights.forEach(({ topic, weight, originalWeight }) => {
      logger.info('ColdStart', `  ${topic}: ${weight.toFixed(2)} (original: ${originalWeight.toFixed(2)})`);
    });
    
    // Prioritize topics with original weight > 0.5 (preferred topics)
    const preferredTopics = topicsWithWeights
      .filter(({ originalWeight }) => originalWeight > PREFERRED_TOPIC_THRESHOLD)
      .map(({ topic }) => topic);
    
    // If no preferred topics, use all topics sorted by adjusted weight
    const topicsArray = preferredTopics.length > 0 
      ? preferredTopics 
      : topicsWithWeights.map(t => t.topic);
    
    logger.info('ColdStart', `Using topics: ${topicsArray.join(', ')}`);
    
    for (const topic of topicsArray) {
      if (userPreferredQuestions.length >= 2) break;
      
      // Skip if this topic would violate diversity requirements
      if (!isTopicAllowedForDiversity(state, topic)) {
        logger.info('ColdStart', `Skipping topic ${topic} for diversity reasons`);
        continue;
      }
      
      const topicMap = groupedQuestions.get(topic);
      if (!topicMap) continue;
      
      // Get all questions from this topic that haven't been shown
      const availableQuestions = Array.from(topicMap.values()).flat()
        .filter(q => !state.shownQuestionIds.has(q.id));
      
      // logger.info(`Topic ${topic} has ${availableQuestions.length} available questions (weight: ${state.topicWeights.get(topic)?.toFixed(2) || 'default'})`);
        
      if (availableQuestions.length > 0) {
        // Randomly select a question from this topic
        const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        userPreferredQuestions.push(question);
        
        // Mark as shown but NOT as an exploration question
        state.shownQuestionIds.add(question.id);
        state.topicsShown.add(topic); // Ensure topic is marked as shown
        
        // Track this topic for diversity
        trackTopicForDiversity(state, topic);
        
        logger.info('ColdStart', `Selected question from answered topic ${topic}: "${question.question?.substring(0, 30)}..."`);
        
        // Add to recent topics for diversity tracking
        state.recentTopics.unshift(topic);
        if (state.recentTopics.length > 5) {
          state.recentTopics.pop();
        }
      }
    }
  }
  // If user has only skipped questions, select from ANY unused topics
  else {
    logger.info('ColdStart', "User has only skipped questions, selecting from unused topics");
    
    // Get ALL unused topics
    const allUnusedTopics = Array.from(groupedQuestions.keys())
      .filter(topic => !state.topicsShown.has(topic));
    
    // logger.info(`Found ${allUnusedTopics.length} unused topics: ${allUnusedTopics.join(', ')}`);
    
    if (allUnusedTopics.length > 0) {
      // NEW: Prioritize topics that are not in the last used topics
      const topicsWithDiversityScore = allUnusedTopics.map(topic => {
        const weight = state.topicWeights.get(topic) || 0.5;
        
        // Check if this topic appears in the recent topics list
        const isRecentlyUsed = state.lastSelectedTopics.includes(topic);
        
        // Higher score for topics not recently used
        const diversityScore = isRecentlyUsed ? 0 : 1;
        
        // Combine weight with diversity score
        const adjustedWeight = weight * (1 + diversityScore);
        
        return { topic, weight, adjustedWeight };
      });
      
      // Sort by adjusted weight (descending)
      topicsWithDiversityScore.sort((a, b) => b.adjustedWeight - a.adjustedWeight);
      
      // logger.info("Unused topics with adjusted weights for diversity:");
      // topicsWithDiversityScore.forEach(({ topic, weight, adjustedWeight }) => {
      //   logger.info(`  ${topic}: ${weight.toFixed(2)} (adjusted: ${adjustedWeight.toFixed(2)})`);
      // });
      
      // Get preferred topics (weight > 0.5)
      const preferredUnusedTopics = topicsWithDiversityScore
        .filter(({ weight }) => weight > PREFERRED_TOPIC_THRESHOLD)
        .map(({ topic }) => topic);
      
      // logger.info(`Found ${preferredUnusedTopics.length} unused preferred topics (weight > ${PREFERRED_TOPIC_THRESHOLD})`);
          
      // If we have preferred topics, use them, otherwise use all sorted by weight
      let sortedUnusedTopics = preferredUnusedTopics.length > 0 
        ? preferredUnusedTopics 
        : topicsWithDiversityScore.map(t => t.topic);
      
      // logger.info(`Final sorted unused topics: ${sortedUnusedTopics.join(', ')}`);
      
      // Try to select 2 questions from preferred unused topics
      for (const topic of sortedUnusedTopics) {
        if (userPreferredQuestions.length >= 2) break;
          
        // Skip if this topic would violate diversity requirements
        if (!isTopicAllowedForDiversity(state, topic)) {
          logger.info('ColdStart', `Skipping topic ${topic} for diversity reasons`);
          continue;
        }
        
        const topicMap = groupedQuestions.get(topic);
        if (!topicMap) {
          logger.info('ColdStart', `No questions available for topic ${topic}`);
          continue;
        }
        
        // Get all questions from this topic that haven't been shown
        const availableQuestions = Array.from(topicMap.values()).flat()
          .filter(q => !state.shownQuestionIds.has(q.id));
        
        // console.log(`Unused topic ${topic} has ${availableQuestions.length} available questions (weight: ${state.topicWeights.get(topic)?.toFixed(2) || 'default'})`);
          
        if (availableQuestions.length > 0) {
          // Randomly select a question from this topic
          const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
          userPreferredQuestions.push(question);
          
          // Mark as shown but NOT as an exploration question
          state.shownQuestionIds.add(question.id);
          state.topicsShown.add(topic); // Mark topic as shown
            
          // Track this topic for diversity
          trackTopicForDiversity(state, topic);
            
          console.log(`Added question from unused topic: ${topic} - "${question.question?.substring(0, 30)}..."`);
          
          // Add to recent topics for diversity tracking
          state.recentTopics.unshift(topic);
          if (state.recentTopics.length > 5) {
            state.recentTopics.pop();
          }
        }
      }
    }
  }
  
  // Step 2: Select exactly 2 exploration questions from topics that haven't been shown yet
  const explorationQuestions: FeedItem[] = [];
  
  // Get a complete list of all possible topics from groupedQuestions
  const allAvailableTopics = Array.from(groupedQuestions.keys());
  console.log(`All available topics (${allAvailableTopics.length}): ${allAvailableTopics.join(', ')}`);
  
  // Find topics that haven't been shown OR interacted with at all
  // This is the key improvement - we need to consider both shown and skipped topics as "used"
  const completelyNewTopics = allAvailableTopics.filter(topic => 
    !state.topicsShown.has(topic) && 
    !state.skippedByTopic.has(topic) &&
    !userPreferredQuestions.some(q => q.topic === topic) &&
    !state.lastSelectedTopics.includes(topic)
  );
  
  // console.log(`EXPLORATION IMPROVEMENT: Found ${completelyNewTopics.length} completely new topics: ${completelyNewTopics.join(', ')}`);
  
  // Fallback to topics that haven't been shown but may have been skipped
  const unusedButMaybeSkippedTopics = allAvailableTopics.filter(topic => 
    !state.topicsShown.has(topic) && 
    !userPreferredQuestions.some(q => q.topic === topic) &&
    !state.lastSelectedTopics.includes(topic)
  );
  
  // console.log(`Unused but maybe skipped topics: ${unusedButMaybeSkippedTopics.length} topics: ${unusedButMaybeSkippedTopics.join(', ')}`);
  
  // Fall back to any topic not recently used if needed
  const notRecentlyUsedTopics = allAvailableTopics.filter(topic => 
    !state.lastSelectedTopics.includes(topic) &&
    !userPreferredQuestions.some(q => q.topic === topic)
  );
  
  // console.log(`Not recently used topics: ${notRecentlyUsedTopics.length} topics: ${notRecentlyUsedTopics.join(', ')}`);
  
  // Prioritize in this order: completely new > unused but skipped > not recently used
  const prioritizedExplorationTopics = [
    ...completelyNewTopics,
    ...unusedButMaybeSkippedTopics.filter(t => !completelyNewTopics.includes(t)),
    ...notRecentlyUsedTopics.filter(t => 
      !completelyNewTopics.includes(t) && 
      !unusedButMaybeSkippedTopics.includes(t)
    )
  ];
  
  // Add some randomness to avoid always picking the same topics
  shuffleArray(prioritizedExplorationTopics);
  
  // console.log(`Final prioritized exploration topics (after shuffle): ${prioritizedExplorationTopics.slice(0, 10).join(', ')}${prioritizedExplorationTopics.length > 10 ? '...' : ''}`);
  
  // First try to get questions from prioritized exploration topics
  for (const topic of prioritizedExplorationTopics) {
    if (explorationQuestions.length >= 2) break;
    
    // Skip topics already used in userPreferredQuestions
    if (userPreferredQuestions.some(q => q.topic === topic)) {
      console.log(`Skipping topic ${topic} for exploration as it was already used for user-preferred questions`);
      continue;
    }
    
    // Skip if this topic would violate diversity requirements
    if (!isTopicAllowedForDiversity(state, topic)) {
      logger.info('ColdStart', `Skipping topic ${topic} for diversity reasons`);
      continue;
    }
    
    const topicMap = groupedQuestions.get(topic);
    if (!topicMap) {
      logger.info('ColdStart', `No questions available for topic ${topic}`);
      continue;
    }
    
    // Get all questions from this topic that haven't been shown
    const availableQuestions = Array.from(topicMap.values()).flat()
      .filter(q => !state.shownQuestionIds.has(q.id));
    
    // console.log(`Exploration topic ${topic} has ${availableQuestions.length} available questions (weight: ${state.topicWeights.get(topic)?.toFixed(2) || 'default'})`);
      
    if (availableQuestions.length > 0) {
      // Randomly select a question from this topic
      const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      explorationQuestions.push(question);
      
      // Mark as shown AND as an exploration question
      state.shownQuestionIds.add(question.id);
      state.topicsShown.add(topic);
      state.isExplorationQuestion.add(question.id);
      
      // Track this topic for diversity
      trackTopicForDiversity(state, topic);
      
      console.log(`Added exploration question from topic: ${topic} - "${question.question?.substring(0, 30)}..."`);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    }
  }
  
  // If still don't have enough exploration questions, use any unseen questions from any topic
  if (explorationQuestions.length < 2) {
    console.log("Still need more exploration questions, using any unseen questions");
    
    const remainingQuestions = allQuestions
      .filter(q => !state.shownQuestionIds.has(q.id))
      .filter(q => !userPreferredQuestions.some(pq => pq.id === q.id))
      .filter(q => !explorationQuestions.some(eq => eq.id === q.id));
      
    shuffleArray(remainingQuestions);
    
    for (const question of remainingQuestions) {
      if (explorationQuestions.length >= 2) break;
      
      // Skip if this topic would violate diversity requirements
      if (!isTopicAllowedForDiversity(state, question.topic)) {
        // Check if we're in single topic mode first
        const isInSingleTopicMode = (state as any).isInSingleTopicMode;
        const activeTopicName = (state as any).activeTopicName;
        
        // If in single topic mode and this is the active topic, don't skip it
        if (isInSingleTopicMode && activeTopicName === question.topic) {
          console.log(`Overriding diversity check for topic ${question.topic} in single topic mode`);
        } else {
          logger.info('ColdStart', `Skipping random question from topic ${question.topic} for diversity reasons`);
          continue;
        }
      }
      
      explorationQuestions.push(question);
      
      // Mark as shown AND as an exploration question
      state.shownQuestionIds.add(question.id);
      state.isExplorationQuestion.add(question.id);
      
      // Track this topic for diversity
      trackTopicForDiversity(state, question.topic);
      
      // console.log(`Selected final exploration question from topic: ${question.topic} (weight: ${state.topicWeights.get(question.topic)?.toFixed(2) || 'default'})`);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(question.topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    }
  }
  
  // Combine the preferred and exploration questions
  selectedQuestions.push(...userPreferredQuestions, ...explorationQuestions);
  
  // Log comprehensive info about the selection
  // console.log(`Returning ${userPreferredQuestions.length} user preferred questions and ${explorationQuestions.length} exploration questions`);
  // console.log(`Selected topics: ${selectedQuestions.map(q => q.topic).join(', ')}`);
  // console.log(`Topics now shown: ${Array.from(state.topicsShown).join(', ')}`);
  // console.log(`Topic distribution in this batch: ${Array.from(state.topicCountInCurrentBatch.entries()).map(([topic, count]) => `${topic}: ${count}`).join(', ')}`);
  
  // Performance tracker ⏱️ - Cold Start Phase Calculation END
  const coldStartPhaseEnd = performance.now();
  // console.log(`[Performance tracker ⏱️] Cold Start Phase Calculation (Branching) - Ended: ${coldStartPhaseEnd.toFixed(2)}ms | Duration: ${(coldStartPhaseEnd - coldStartPhaseStart).toFixed(2)}ms`);
  
  return selectedQuestions;
}

// Get questions for the normal state (beyond 20 questions)
function getNormalPhaseQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Topic, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): FeedItem[] {
  // Performance tracker ⏱️ - Cold Start Phase Calculation START (Normal)
  const normalPhaseStart = performance.now();
  // console.log(`[Performance tracker ⏱️] Cold Start Phase Calculation (Normal) - Started: ${normalPhaseStart.toFixed(2)}ms`);
  
  logger.info('ColdStart', "Getting Normal phase questions (beyond 20)");

  // Initialize or update topic weights
  initializeTopicWeights(state, userProfile, Array.from(groupedQuestions.keys()));
  
  // Clear the topic count for this new batch
  state.topicCountInCurrentBatch.clear();
  
  // Check if this is a niche app and use subtopic variety
  const nicheAppCheck = isNicheApp();
  const isSingleTopicMode = groupedQuestions.size === 1;
  const shouldUseSubtopicVariety = nicheAppCheck || isSingleTopicMode;
  
  if (shouldUseSubtopicVariety) {
    console.log('🎯 [getNormalPhaseQuestions] Single topic/Niche mode detected - using subtopic variety selection');
    
    const nicheQuestions = selectQuestionsWithSubtopicVariety(groupedQuestions, state, 4);
    
    // Track diversity for all selected questions
    nicheQuestions.forEach(question => {
      trackTopicForDiversity(state, question.topic);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(question.topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    });
    
    console.log(`🎯 [getNormalPhaseQuestions] Single topic/Niche mode: Selected ${nicheQuestions.length} questions with subtopic variety`);
    return nicheQuestions;
  }
  
  // Log in-session weights
  // console.log("Current in-session topic weights for normal phase:");
  // Array.from(state.topicWeights.entries()).forEach(([topic, weight]) => {
  //   console.log(`  ${topic}: ${weight.toFixed(2)}`);
  // });

  const selectedQuestions: FeedItem[] = [];
  
  // Get topics sorted by weight (descending)
  const sortedTopics = Array.from(state.topicWeights.entries())
    .sort((a, b) => b[1] - a[1]);
  
  // Get preferred topics (those with weight > PREFERRED_TOPIC_THRESHOLD)
  const preferredTopics: {topic: string, weight: number}[] = [];
    
  // Add topics with high weights first
  for (const [topic, weight] of sortedTopics) {
    if (weight > PREFERRED_TOPIC_THRESHOLD) {
      preferredTopics.push({topic, weight});
    }
  }
  
  // console.log(`Found ${preferredTopics.length} preferred topics (weight > ${PREFERRED_TOPIC_THRESHOLD}): ${preferredTopics.map(t => t.topic).join(', ')}`);
  
  // Calculate selection probability based on weight
  const totalPreferredWeight = preferredTopics.reduce((sum, t) => sum + (t.weight - PREFERRED_TOPIC_THRESHOLD), 0);
  const normalizedPreferredTopics = preferredTopics.map(({topic, weight}) => {
    // Normalize probability based on how much higher than threshold
    const normalizedWeight = (weight - PREFERRED_TOPIC_THRESHOLD) / totalPreferredWeight;
    return {topic, weight, normalizedWeight};
  });
  
  // console.log("Preferred topics with normalized weights for proportional selection:");
  // normalizedPreferredTopics.forEach(({topic, weight, normalizedWeight}) => {
  //   console.log(`  ${topic}: Weight ${weight.toFixed(2)}, Selection Probability: ${(normalizedWeight * 100).toFixed(1)}%`);
  // });
  
  // If we don't have enough preferred topics, add the top 3 topics by weight
  if (preferredTopics.length < 3) {
    // Filter out topics we've already added
    const remainingTopics = sortedTopics
      .filter(([topic, _]) => !preferredTopics.some(pt => pt.topic === topic));
  
    // Add the top remaining topics
    const additionalTopics = remainingTopics.slice(0, 3 - preferredTopics.length).map(([topic, weight]) => ({
      topic,
      weight,
      normalizedWeight: 0.1 // Give lower probability to added topics
    }));
    
    normalizedPreferredTopics.push(...additionalTopics);
    
    // console.log(`Added ${additionalTopics.length} additional topics to reach minimum 3 preferred topics: ${additionalTopics.map(t => t.topic).join(', ')}`);
  }
  
  // Get questions from preferred topics (70%)
  const preferredCount = Math.ceil(4 * 0.7); // 70% of 4 = 3 questions (rounded up)
  const preferredQuestions: FeedItem[] = [];
  
  // Keep track of used topics for diversity
  const usedTopics = new Set<string>();
  
  // Check for underrepresented topics that should be prioritized
  const underrepresentedTopics = normalizedPreferredTopics
    .filter(({topic}) => {
      const currentCount = state.topicCountInCurrentBatch.get(topic) || 0;
      const normalizedWeight = normalizedPreferredTopics.find(t => t.topic === topic)?.normalizedWeight || 0;
      // Topic is underrepresented if its count percentage is below its weight percentage
      const isUnderrepresented = currentCount === 0 && normalizedWeight > 0.1;
      if (isUnderrepresented) {
        console.log(`Topic ${topic} is underrepresented (count: ${currentCount}, weight: ${normalizedWeight.toFixed(2)}) - prioritizing`);
      }
      return isUnderrepresented;
    })
    .map(({topic}) => topic);
  
  // First pass: try to include underrepresented topics
  if (underrepresentedTopics.length > 0) {
    console.log(`Prioritizing ${underrepresentedTopics.length} underrepresented topics: ${underrepresentedTopics.join(', ')}`);
    
    for (const topic of underrepresentedTopics) {
    if (preferredQuestions.length >= preferredCount) break;
      
      // Skip if this topic would violate diversity requirements
      if (!isTopicAllowedForDiversity(state, topic)) {
        logger.info('ColdStart', `Skipping underrepresented topic ${topic} for diversity reasons`);
        continue;
      }
    
    const topicMap = groupedQuestions.get(topic);
    if (!topicMap) continue;
    
    // Get all questions from this topic that haven't been shown
    const availableQuestions = Array.from(topicMap.values()).flat()
      .filter(q => !state.shownQuestionIds.has(q.id));
      
    if (availableQuestions.length > 0) {
      // Randomly select a question from this topic
      const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      preferredQuestions.push(question);
      
      // Mark as shown but NOT as an exploration question
      state.shownQuestionIds.add(question.id);
      usedTopics.add(topic);
        
        // Track this topic for diversity
        trackTopicForDiversity(state, topic);
        
        // console.log(`Selected preferred question from underrepresented topic ${topic} (weight: ${state.topicWeights.get(topic)?.toFixed(2) || 'default'})`);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
        }
      }
    }
  }
  
  // Second pass: select remaining preferred questions using weighted probability
  const attemptsLimit = 20; // Avoid infinite loop if we can't find suitable questions
  let attempts = 0;
  
  while (preferredQuestions.length < preferredCount && attempts < attemptsLimit) {
    attempts++;
    
    // Select topic with probability proportional to weight
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    let selectedTopic: string | null = null;
    
    // Skip topics that would violate diversity requirements
    const eligibleTopics = normalizedPreferredTopics
      .filter(({topic}) => !usedTopics.has(topic) && isTopicAllowedForDiversity(state, topic));
    
    // Recalculate probabilities for remaining topics
    const eligibleTotalWeight = eligibleTopics.reduce((sum, t) => sum + t.normalizedWeight, 0);
    
    for (const {topic, normalizedWeight} of eligibleTopics) {
      // Adjust probability based on remaining eligible topics
      const adjustedProbability = normalizedWeight / eligibleTotalWeight;
      cumulativeProbability += adjustedProbability;
      
      if (randomValue <= cumulativeProbability) {
        selectedTopic = topic;
        break;
      }
    }
    
    // If no topic was selected by probability (e.g., all filtered out), pick a random eligible topic
    if (!selectedTopic && eligibleTopics.length > 0) {
      selectedTopic = eligibleTopics[Math.floor(Math.random() * eligibleTopics.length)].topic;
      console.log(`No topic selected by probability, randomly selected ${selectedTopic}`);
    }
    
    if (!selectedTopic) {
      // No eligible topics available for selection on attempt
      continue;
    }
    
    // Topic selected based on weight probability
    
    const topicMap = groupedQuestions.get(selectedTopic);
    if (!topicMap) continue;
    
    // Get all questions from this topic that haven't been shown
    const availableQuestions = Array.from(topicMap.values()).flat()
      .filter(q => !state.shownQuestionIds.has(q.id));
      
    if (availableQuestions.length > 0) {
      // Randomly select a question from this topic
      const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      preferredQuestions.push(question);
      
      // Mark as shown but NOT as an exploration question
      state.shownQuestionIds.add(question.id);
      usedTopics.add(selectedTopic);
      
      // Track this topic for diversity
      trackTopicForDiversity(state, selectedTopic);
      
      // Selected preferred question from topic
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(selectedTopic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    } else {
      // console.log(`Topic ${selectedTopic} has no available questions, skipping`);
    }
  }
  
  // If we still need more preferred questions, get questions from any topic with weight > 0.3
  if (preferredQuestions.length < preferredCount) {
    const mediumWeightTopics = Array.from(state.topicWeights.entries())
      .filter(([topic, weight]) => weight > 0.3 && !usedTopics.has(topic))
      .map(([topic, _]) => topic);
    
    // Found medium-weight topics for additional preferred questions
    
    shuffleArray(mediumWeightTopics);
    
    for (const topic of mediumWeightTopics) {
      if (preferredQuestions.length >= preferredCount) break;
      
      // Skip if this topic would violate diversity requirements
      if (!isTopicAllowedForDiversity(state, topic)) {
        logger.info('ColdStart', `Skipping medium-weight topic ${topic} for diversity reasons`);
        continue;
      }
      
      const topicMap = groupedQuestions.get(topic);
      if (!topicMap) continue;
      
      // Get all questions from this topic that haven't been shown
      const availableQuestions = Array.from(topicMap.values()).flat()
        .filter(q => !state.shownQuestionIds.has(q.id));
        
      if (availableQuestions.length > 0) {
        // Randomly select a question from this topic
        const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        preferredQuestions.push(question);
        
        // Mark as shown but NOT as an exploration question
        state.shownQuestionIds.add(question.id);
        usedTopics.add(topic);
        
        // Track this topic for diversity
        trackTopicForDiversity(state, topic);
        
        // Selected additional preferred question from medium-weight topic
        
        // Add to recent topics for diversity tracking
        state.recentTopics.unshift(topic);
        if (state.recentTopics.length > 5) {
          state.recentTopics.pop();
        }
      }
    }
  }
  
  // Get exploration questions (30%)
  const explorationCount = 4 - preferredQuestions.length; // Remaining questions (should be 1 typically)
  const explorationQuestions: FeedItem[] = [];
  
  // Improved exploration topic logic for normal phase - get completely new topics first
  // Get a complete list of all possible topics from groupedQuestions
  const allAvailableTopics = Array.from(groupedQuestions.keys());
  // All available topics for normal phase
  
  // Find completely new topics that haven't been shown at all
  const completelyNewTopics = allAvailableTopics.filter(topic => 
    // Never shown before
    !state.topicsShown.has(topic) &&
    // Not already used in this batch
    !usedTopics.has(topic) &&
    // Not in recent topics
    !state.recentTopics.includes(topic) &&
    // Not in already selected questions
    !preferredQuestions.some(q => q.topic === topic)
  );
  
  // console.log(`NORMAL PHASE: Found ${completelyNewTopics.length} completely new topics: ${completelyNewTopics.join(', ')}`);
  
  // Get topics with low weights (≤ PREFERRED_TOPIC_THRESHOLD) for exploration
  const lowWeightTopics = Array.from(state.topicWeights.entries())
    .filter(([topic, weight]) => 
      weight <= PREFERRED_TOPIC_THRESHOLD && 
      !usedTopics.has(topic) &&
      !preferredQuestions.some(q => q.topic === topic)
    )
    .map(([topic, _]) => topic);
    
  // console.log(`NORMAL PHASE: Found ${lowWeightTopics.length} low-weight exploration candidates: ${lowWeightTopics.join(', ')}`);
  
  // Prioritize in this order: completely new topics > low weight topics > any unused topic
  const prioritizedExplorationTopics = [
    ...completelyNewTopics,
    ...lowWeightTopics.filter(t => !completelyNewTopics.includes(t)),
    ...allAvailableTopics.filter(t => 
      !completelyNewTopics.includes(t) && 
      !lowWeightTopics.includes(t) &&
      !usedTopics.has(t) &&
      !preferredQuestions.some(q => q.topic === t)
    )
  ];
  
  // Add randomness to exploration topics to prevent always picking the same ones
  shuffleArray(prioritizedExplorationTopics);
  
  // console.log(`NORMAL PHASE: Prioritized exploration topics: ${prioritizedExplorationTopics.slice(0, 10).join(', ')}${prioritizedExplorationTopics.length > 10 ? '...' : ''}`);
  
  // First try to get questions from prioritized exploration topics
  for (const topic of prioritizedExplorationTopics) {
    if (explorationQuestions.length >= explorationCount) break;
    
    // Skip if this topic would violate diversity requirements
    if (!isTopicAllowedForDiversity(state, topic)) {
      logger.info('ColdStart', `Skipping exploration topic ${topic} for diversity reasons`);
      continue;
    }
    
    const topicMap = groupedQuestions.get(topic);
    if (!topicMap) {
      logger.info('ColdStart', `No questions available for topic ${topic}`);
      continue;
    }
    
    // Get all questions from this topic that haven't been shown
    const availableQuestions = Array.from(topicMap.values()).flat()
      .filter(q => !state.shownQuestionIds.has(q.id));
      
    if (availableQuestions.length > 0) {
      // Randomly select a question from this topic
      const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      explorationQuestions.push(question);
      
      // Mark as shown AND as an exploration question
      state.shownQuestionIds.add(question.id);
      state.isExplorationQuestion.add(question.id);
      
      // Track this topic for diversity
      trackTopicForDiversity(state, topic);
      
      // console.log(`NORMAL PHASE: Selected exploration question from topic ${topic} (weight: ${state.topicWeights.get(topic)?.toFixed(2) || 'default'})`);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    }
  }
  
  // If we still don't have enough exploration questions, pick from any remaining topic
  if (explorationQuestions.length < explorationCount) {
    // console.log("NORMAL PHASE: Still need more exploration questions, using any remaining questions");
    
    // Get all remaining questions that aren't in shown question IDs or selected questions
    const remainingQuestions = allQuestions
      .filter(q => !state.shownQuestionIds.has(q.id))
      .filter(q => !preferredQuestions.some(pq => pq.id === q.id))
      .filter(q => !explorationQuestions.some(eq => eq.id === q.id));
      
    // console.log(`NORMAL PHASE: Found ${remainingQuestions.length} remaining questions for exploration`);
      
    // Add randomness to prevent always picking the same fallback questions
    shuffleArray(remainingQuestions);
    
    // Use a different approach to select questions - prioritize by topic diversity
    for (const question of remainingQuestions) {
      if (explorationQuestions.length >= explorationCount) break;
      
      // Skip if topic is already used in this batch
      if (usedTopics.has(question.topic) || 
          preferredQuestions.some(q => q.topic === question.topic) ||
          explorationQuestions.some(q => q.topic === question.topic)) {
        continue;
      }
      
      // Skip if this topic would violate diversity requirements
      if (!isTopicAllowedForDiversity(state, question.topic)) {
        logger.info('ColdStart', `Skipping fallback question from topic ${question.topic} for diversity reasons`);
        continue;
      }
      
      explorationQuestions.push(question);
      
      // Mark as shown AND as an exploration question
      state.shownQuestionIds.add(question.id);
      state.isExplorationQuestion.add(question.id);
      
      // Track this topic for diversity
      trackTopicForDiversity(state, question.topic);
      
      // console.log(`NORMAL PHASE: Selected final exploration question from topic ${question.topic} (weight: ${state.topicWeights.get(question.topic)?.toFixed(2) || 'default'})`);
      
      // Add to recent topics for diversity tracking
      state.recentTopics.unshift(question.topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    }
  }
  
  // Combine the preferred and exploration questions
  selectedQuestions.push(...preferredQuestions, ...explorationQuestions);
  
  // Log comprehensive info about the selection
  // console.log(`NORMAL PHASE: Returning ${preferredQuestions.length} preferred questions and ${explorationQuestions.length} exploration questions`);
  // console.log(`NORMAL PHASE: Selected topics: ${selectedQuestions.map(q => q.topic).join(', ')}`);
  // console.log(`NORMAL PHASE: Topic distribution in this batch: ${Array.from(state.topicCountInCurrentBatch.entries()).map(([topic, count]) => `${topic}: ${count}`).join(', ')}`);
  
  // Performance tracker ⏱️ - Cold Start Phase Calculation END (Normal)
  const normalPhaseEnd = performance.now();
  // console.log(`[Performance tracker ⏱️] Cold Start Phase Calculation (Normal) - Ended: ${normalPhaseEnd.toFixed(2)}ms | Duration: ${(normalPhaseEnd - normalPhaseStart).toFixed(2)}ms`);
  
  return selectedQuestions;
}

// Helper function to shuffle an array in-place
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Helper function to filter by difficulty
function filterByDifficulty(questions: FeedItem[], state: ColdStartState): FeedItem[] {
  if (state.questionsShown < 10) {
    // First 10 questions should be easy or medium only
    return questions.filter(q => 
      (q.difficulty?.toLowerCase() === 'easy' || q.difficulty?.toLowerCase() === 'medium')
    );
  }
  return questions;
}

// Helper function to convert a ColdStartState to a serializable object
function serializeColdStartState(state: ColdStartState): any {
  return {
    phase: state.phase,
    questionsShown: state.questionsShown,
    topicsShown: Array.from(state.topicsShown),
    shownQuestionIds: Array.from(state.shownQuestionIds),
    subtopicsShown: Array.from(state.subtopicsShown.entries()).map(([topic, subtopics]) => 
      [topic, Array.from(subtopics)]
    ),
    recentTopics: state.recentTopics,
    correctAnsweredByTopic: Array.from(state.correctAnsweredByTopic.entries()),
    wrongAnsweredByTopic: Array.from(state.wrongAnsweredByTopic.entries()),
    skippedByTopic: Array.from(state.skippedByTopic.entries()),
    previouslyInterestedTopics: state.previouslyInterestedTopics,
    isExplorationQuestion: Array.from(state.isExplorationQuestion),
    topicWeights: Array.from(state.topicWeights.entries()),
    topicCountInCurrentBatch: Array.from(state.topicCountInCurrentBatch.entries()),
    lastSelectedTopics: state.lastSelectedTopics
  };
}

// Helper function to convert a serialized state back to a ColdStartState
function deserializeColdStartState(serializedState: any): ColdStartState {
  const state = initColdStartState();
  
  state.phase = serializedState.phase;
  state.questionsShown = serializedState.questionsShown;
  
  // Convert arrays back to Sets
  if (Array.isArray(serializedState.topicsShown)) {
    state.topicsShown = new Set(serializedState.topicsShown);
  }
  
  if (Array.isArray(serializedState.shownQuestionIds)) {
    state.shownQuestionIds = new Set(serializedState.shownQuestionIds);
  }
  
  // Convert array of entries back to Maps
  if (Array.isArray(serializedState.correctAnsweredByTopic)) {
    state.correctAnsweredByTopic = new Map(serializedState.correctAnsweredByTopic);
  }
  
  if (Array.isArray(serializedState.wrongAnsweredByTopic)) {
    state.wrongAnsweredByTopic = new Map(serializedState.wrongAnsweredByTopic);
  }
  
  if (Array.isArray(serializedState.skippedByTopic)) {
    state.skippedByTopic = new Map(serializedState.skippedByTopic);
  }
  
  // Handle subtopicsShown Map<Topic, Set<Subtopic>>
  if (Array.isArray(serializedState.subtopicsShown)) {
    state.subtopicsShown = new Map();
    serializedState.subtopicsShown.forEach(([topic, subtopics]: [Topic, any[]]) => {
      state.subtopicsShown.set(topic, new Set(subtopics));
    });
  }
  
  // Simple arrays
  state.recentTopics = serializedState.recentTopics || [];
  state.previouslyInterestedTopics = serializedState.previouslyInterestedTopics || [];
  
  // Convert exploration question array back to Set
  if (Array.isArray(serializedState.isExplorationQuestion)) {
    state.isExplorationQuestion = new Set(serializedState.isExplorationQuestion);
  }
  
  // Convert topicWeights array back to Map
  if (Array.isArray(serializedState.topicWeights)) {
    state.topicWeights = new Map(serializedState.topicWeights);
  }
  
  // Convert topicCountInCurrentBatch array back to Map
  if (Array.isArray(serializedState.topicCountInCurrentBatch)) {
    state.topicCountInCurrentBatch = new Map(serializedState.topicCountInCurrentBatch);
  }
  
  // Convert lastSelectedTopics array back to array
  state.lastSelectedTopics = serializedState.lastSelectedTopics || [];
  
  return state;
}

// Main function to get the cold start feed
export function getColdStartFeed(
  allQuestions: FeedItem[],
  userProfile: UserProfile,
  groupedQuestions: Map<Topic, Map<Subtopic, FeedItem[]>> | Record<string, any> = new Map(),
  forcedPhase?: 'exploration' | 'branching' | 'normal' // Add parameter to force a specific phase
): { items: FeedItem[], state: ColdStartState, explanations: { [questionId: string]: string[] } } {
  let state: ColdStartState;
  const explanations: { [questionId: string]: string[] } = {};
  
  // Check if we're in single topic mode
  let isInSingleTopicMode = false;
  let activeTopicName: string | undefined;
  
  try {
    const Constants = require('expo-constants');
    const expoExtra = Constants.expoConfig?.extra;
    const activeTopic = expoExtra?.activeTopic;
    const filterContentByTopic = expoExtra?.filterContentByTopic;
    
    console.log('🎯 [getColdStartFeed] Topic detection:', {
      activeTopic: activeTopic,
      filterContentByTopic: filterContentByTopic,
      expoExtra: expoExtra
    });
    
    if (filterContentByTopic && activeTopic && activeTopic !== 'default') {
      isInSingleTopicMode = true;
      activeTopicName = activeTopic;
      console.log(`🔍 Cold start strategy: Operating in SINGLE TOPIC MODE (${activeTopic})`);
      console.log(`🔍 Diversity checks will be bypassed for topic ${activeTopic}`);
    } else {
      console.log('🎯 [getColdStartFeed] Not in single topic mode:', {
        filterContentByTopic,
        activeTopic,
        isDefault: activeTopic === 'default'
      });
    }
  } catch (e) {
    console.error('Error checking topic config in cold start feed:', e);
  }
  
  // Check if we need to create a new cold start state
  if (!userProfile.coldStartState) {
    console.log("Initializing new cold start state");
    state = initColdStartState();
  } else {
    console.log("Loading existing cold start state");
    state = deserializeColdStartState(userProfile.coldStartState);
  }
  
  // Add information about single topic mode to the state
  if (isInSingleTopicMode && activeTopicName) {
    // Store the info in a temp var to pass to other functions
    (state as any).isInSingleTopicMode = isInSingleTopicMode;
    (state as any).activeTopicName = activeTopicName;
  }
  
  // Handle previous question answers if they exist
  if (userProfile.lastQuestionAnswered) {
    const { questionId, answer, correct, skipped, topic } = userProfile.lastQuestionAnswered;
  
    // Skip if we've already processed this question
    if (!state.shownQuestionIds.has(questionId)) {
      console.log(`Question ${questionId} was not in shown question IDs, can't process answer`);
    } else {
      console.log(`Processing answer for question ${questionId} (topic: ${topic})`);
      
      // Increment the appropriate counter
      if (skipped) {
        const count = state.skippedByTopic.get(topic) || 0;
        state.skippedByTopic.set(topic, count + 1);
        console.log(`Recorded skipped question in ${topic}`);
      } else if (correct) {
        const count = state.correctAnsweredByTopic.get(topic) || 0;
        state.correctAnsweredByTopic.set(topic, count + 1);
        console.log(`Recorded correctly answered question in ${topic}`);
    
        // Update in-session weight for correct answers - increase weight
        const currentWeight = state.topicWeights.get(topic) || 0.5;
        const newWeight = Math.min(1.0, currentWeight + 0.1);
        state.topicWeights.set(topic, newWeight);
        console.log(`Updated weight for ${topic} after correct answer: ${currentWeight.toFixed(2)} -> ${newWeight.toFixed(2)}`);
      } else {
        const count = state.wrongAnsweredByTopic.get(topic) || 0;
        state.wrongAnsweredByTopic.set(topic, count + 1);
        console.log(`Recorded incorrectly answered question in ${topic}`);
        
        // Update in-session weight for wrong answers - still increase, but less
        const currentWeight = state.topicWeights.get(topic) || 0.5;
        const newWeight = Math.min(1.0, currentWeight + 0.05);
        state.topicWeights.set(topic, newWeight);
        console.log(`Updated weight for ${topic} after wrong answer: ${currentWeight.toFixed(2)} -> ${newWeight.toFixed(2)}`);
      }
      
      // For exploration questions that were answered (not skipped), adjust other weights
      if (!skipped && state.isExplorationQuestion.has(questionId)) {
        console.log(`Question ${questionId} was an exploration question and was answered (correct: ${correct})`);
        
        // If user engaged with an exploration topic, slightly decrease other weights
        Object.keys(userProfile.topics || {}).forEach(otherTopic => {
          if (otherTopic !== topic) {
            const currentWeight = state.topicWeights.get(otherTopic) || 0.5;
            const newWeight = Math.max(0.1, currentWeight - 0.02);
            state.topicWeights.set(otherTopic, newWeight);
          }
        });
        
        console.log(`Adjusted weights of other topics after exploration question was answered`);
      }
    }
    
    // Clear the last answered question to avoid double processing
    userProfile.lastQuestionAnswered = undefined;
  }
  
  // Filter questions by difficulty for the first 10 questions
  const filteredQuestions = filterByDifficulty(allQuestions, state);
  console.log('🎯 [getColdStartFeed] After difficulty filtering:', {
    originalCount: allQuestions.length,
    filteredCount: filteredQuestions.length
  });
  
  // Ensure we have a Map for grouped questions and that it's not empty
  const filteredGroupedQuestions = (groupedQuestions instanceof Map && Array.from(groupedQuestions.keys()).length > 0)
    ? groupedQuestions
    : groupQuestionsByTopic(filteredQuestions);
  
  console.log('🎯 [getColdStartFeed] Grouped questions:', {
    isMap: filteredGroupedQuestions instanceof Map,
    topicsCount: Array.from(filteredGroupedQuestions.keys()).length,
    topics: Array.from(filteredGroupedQuestions.keys()).slice(0, 5),
    allTopics: Array.from(filteredGroupedQuestions.keys())
  });
  
  // Add debug logging to see if grouped questions is properly populated
  
  // Determine the phase based on questions shown
  if (state.questionsShown < 5) {
    state.phase = 'exploration';
  } else if (state.questionsShown < 20) {
    state.phase = 'branching';
  } else {
    state.phase = 'normal';
  }
  
  // Override the phase if forced, but only after determining the natural phase first
  if (forcedPhase) {
    console.log(`Forcing phase to ${forcedPhase} (overriding ${state.phase})`);
    state.phase = forcedPhase;
  }
  
  
  console.log('🎯 [getColdStartFeed] Determined phase:', {
    phase: state.phase,
    questionsShown: state.questionsShown,
    forcedPhase: forcedPhase
  });
  
  // Get questions for the current phase
  let phaseQuestions: FeedItem[] = [];
  
  switch (state.phase) {
    case 'exploration':
      console.log('🎯 [getColdStartFeed] Getting exploration phase questions...');
      phaseQuestions = getExplorationPhaseQuestions(filteredQuestions, filteredGroupedQuestions, state, userProfile);
      break;
    case 'branching':
      console.log('🎯 [getColdStartFeed] Getting branching phase questions...');
      phaseQuestions = getBranchingPhaseQuestions(filteredQuestions, filteredGroupedQuestions, state, userProfile);
      break;
    case 'normal':
      console.log('🎯 [getColdStartFeed] Getting normal phase questions...');
      phaseQuestions = getNormalPhaseQuestions(filteredQuestions, filteredGroupedQuestions, state, userProfile);
      break;
    default:
      console.log('🎯 [getColdStartFeed] Getting default (exploration) phase questions...');
      phaseQuestions = getExplorationPhaseQuestions(filteredQuestions, filteredGroupedQuestions, state, userProfile);
      break;
  }
  
  console.log('🎯 [getColdStartFeed] Phase questions result:', {
    phase: state.phase,
    questionsCount: phaseQuestions.length,
    questionIds: phaseQuestions.slice(0, 3).map(q => q.id)
  });
  
  // Update question count
  state.questionsShown += phaseQuestions.length;
  
  // Calculate the actual total questions answered/shown for user
  const totalQuestionsAnswered = userProfile.totalQuestionsAnswered || 0;
  const totalInteractions = Object.keys(userProfile.interactions || {}).length;
  const isDuringColdStart = !userProfile.coldStartComplete && totalQuestionsAnswered < 20;
  
  // Add explanations for each question
  phaseQuestions.forEach(question => {
    explanations[question.id] = [];
    
    // Add explanation about the question's selection
    if (state.isExplorationQuestion.has(question.id)) {
      const weight = state.topicWeights.get(question.topic)?.toFixed(2) || '0.50';
      explanations[question.id].push(`Exploration question from ${question.topic} (weight: ${weight})`);
    } else {
      const weight = state.topicWeights.get(question.topic)?.toFixed(2) || '0.50';
      explanations[question.id].push(`Preferred question from ${question.topic} (weight: ${weight})`);
    }
    
    // Add explanation about the phase based on the ACTUAL user progress, not forced phase
    // This is the key fix - we need to use the user's progress to determine the phase explanation
    if (isDuringColdStart) {
      if (totalQuestionsAnswered < 5) {
        explanations[question.id].push(`Initial exploration phase (questions 1-5)`);
        explanations[question.id].push(`Selection mechanism: initial exploration`);
      } else if (totalQuestionsAnswered < 20) {
        explanations[question.id].push(`Branching phase (questions 6-20)`);
        
        // Add the specific branching phase selection mechanism
        if (state.isExplorationQuestion.has(question.id)) {
          explanations[question.id].push(`Selection mechanism: branching-exploration`);
        } else {
          explanations[question.id].push(`Selection mechanism: branching-preference`);
        }
      }
    } else {
      // Past cold start - show normal phase explanation
      explanations[question.id].push(`Normal phase (beyond question 20)`);
      explanations[question.id].push(`Selection mechanism: normal-personalization`);
    }
    
    // If this is a forced phase, add explanation about why
    if (forcedPhase) {
      if (forcedPhase === 'exploration' && state.questionsShown >= 5) {
        explanations[question.id].push(`Added at cold start checkpoint position ${state.questionsShown}`);
        explanations[question.id].push(`Selection mechanism: forced-exploration`);
      } else if (forcedPhase === 'branching' && state.questionsShown >= 5) { 
        explanations[question.id].push(`Added at cold start checkpoint position ${state.questionsShown}`);
        explanations[question.id].push(`Selection mechanism: forced-branching`);
      } else if (forcedPhase === 'normal' && isDuringColdStart) {
        explanations[question.id].push(`Added after skip (during cold start)`);
        explanations[question.id].push(`Selection mechanism: normal-fallback`);
      } else if (forcedPhase === 'normal' && !isDuringColdStart) {
        explanations[question.id].push(`Added after skip (past cold start)`);
        explanations[question.id].push(`Selection mechanism: normal-fallback`);
      }
    }
  });
  
  // Update the state in the user profile
  userProfile.coldStartState = serializeColdStartState(state);
  
  return {
    items: phaseQuestions,
    state: state,
    explanations: explanations
  };
}

// Update the reconstructStateFromUserProfile function to use position-based phase detection
function reconstructStateFromUserProfile(
  userProfile: UserProfile,
  allQuestions: FeedItem[]
): ColdStartState {
  console.log("===== Reconstructing Cold Start State =====");
  const state = initColdStartState();
  
  // Calculate the number of questions the user has interacted with
  const interactionCount = Object.keys(userProfile.interactions || {}).length;
  console.log(`Found ${interactionCount} total interactions in user profile`);
  
  // Track the current position (1-indexed)
  const currentPosition = interactionCount + 1;
  
  // Set the phase based on the position rather than just interaction count
  if (currentPosition < 5) {
    state.phase = 'exploration';
  } else if (currentPosition < 20) {
    state.phase = 'branching';
  } else {
    state.phase = 'normal';
  }
  console.log(`Set phase to ${state.phase} based on position ${currentPosition} (${interactionCount} past interactions)`);
  
  state.questionsShown = interactionCount;
  
  // Track skipped and answered topics separately
  const skippedTopics = new Set<string>();
  const answeredTopics = new Set<string>();
  
  console.log(`Processing ${Object.keys(userProfile.interactions || {}).length} past interactions`);
  
  // Process past interactions to update the state
  Object.entries(userProfile.interactions || {}).forEach(([questionId, interaction]) => {
    // Find the question in allQuestions
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) {
      console.log(`Question ${questionId} not found in allQuestions, skipping`);
      return;
    }
    
    // Mark question as shown
    state.shownQuestionIds.add(questionId);
    
    // Track the topic
    const topic = question.topic;
    console.log(`Processing interaction for question ${questionId} (${topic}): ${JSON.stringify(interaction)}`);
    
    // Add to recent topics if not already there
    if (!state.recentTopics.includes(topic)) {
      state.recentTopics.unshift(topic);
      if (state.recentTopics.length > 5) {
        state.recentTopics.pop();
      }
    }
    
    // Process interaction data
    if (interaction.wasCorrect === true) {
      // Correct answer - this topic should be in topicsShown
      const count = state.correctAnsweredByTopic.get(topic) || 0;
      state.correctAnsweredByTopic.set(topic, count + 1);
      state.topicsShown.add(topic);
      answeredTopics.add(topic);
      console.log(`Topic ${topic} was answered correctly (count: ${count + 1}) - added to topicsShown`);
    } else if (interaction.wasCorrect === false) {
      // Wrong answer - this topic should be in topicsShown
      const count = state.wrongAnsweredByTopic.get(topic) || 0;
      state.wrongAnsweredByTopic.set(topic, count + 1);
      state.topicsShown.add(topic);
      answeredTopics.add(topic);
      console.log(`Topic ${topic} was answered incorrectly (count: ${count + 1}) - added to topicsShown`);
    } else if (interaction.wasSkipped) {
      // Skipped question - this topic should NOT be in topicsShown
      // unless the user has also answered a question from this topic
      const count = state.skippedByTopic.get(topic) || 0;
      state.skippedByTopic.set(topic, count + 1);
      skippedTopics.add(topic);
      console.log(`Topic ${topic} was skipped (count: ${count + 1})`);
      
      // Only add to topicsShown if also answered (this is the key fix)
      if (answeredTopics.has(topic)) {
        console.log(`Topic ${topic} was skipped but also has answers - adding to topicsShown`);
        state.topicsShown.add(topic);
      } else {
        // Make sure skipped-only topics are NOT in topicsShown
        if (state.topicsShown.has(topic)) {
          console.log(`FIXING INCONSISTENCY: Topic ${topic} was only skipped but was in topicsShown - removing it`);
          state.topicsShown.delete(topic);
        }
      }
    }
  });
  
  // Log the state information after reconstruction
  console.log(`Reconstructed state summary:`);
  console.log(`Phase: ${state.phase}`);
  console.log(`Questions shown: ${state.questionsShown}`);
  console.log(`Topics shown (only answered topics): ${Array.from(state.topicsShown).join(', ')}`);
  console.log(`Skipped-only topics (not counted as shown): ${Array.from(skippedTopics).filter(t => !answeredTopics.has(t)).join(', ')}`);
  console.log(`Topics with answers: ${Array.from(answeredTopics).join(', ')}`);
  console.log(`Skipped topics: ${Array.from(state.skippedByTopic.entries()).map(([topic, count]) => `${topic}(${count})`).join(', ')}`);
  console.log(`Answered topics: ${Array.from(state.correctAnsweredByTopic.entries()).map(([topic, count]) => `${topic}(${count})`).join(', ')} and ${Array.from(state.wrongAnsweredByTopic.entries()).map(([topic, count]) => `${topic}(${count})`).join(', ')}`);
  console.log("============================================");
  
  return state;
}

// Helper function to ensure a topic has a default weight in the in-session state
function ensureTopicHasDefaultWeight(state: ColdStartState, userProfile: UserProfile, topic: string): void {
  // If we already have a weight for this topic in the in-session state, don't overwrite it
  if (state.topicWeights.has(topic)) {
    return;
  }
  
  // Try to get the weight from the user profile
  const topicWeight = userProfile.topics?.[topic]?.weight;
  
  // Set the weight to profile value or default (0.5)
  state.topicWeights.set(topic, topicWeight !== undefined ? topicWeight : 0.5);
  
  console.log(`Set default weight for topic ${topic}: ${state.topicWeights.get(topic)?.toFixed(2)}`);
} 

/**
 * NICHE APP SUBTOPIC VARIETY FEATURE
 * 
 * For niche apps (apps focused on a single topic with isNiche: true), 
 * this feature ensures variety in question selection by using subtopics 
 * instead of topics for randomization from the very start.
 * 
 * Key benefits:
 * - Prevents monotony in single-topic apps
 * - Ensures diverse subtopic coverage from exploration phase onwards
 * - Maintains personalization while adding variety
 */

// Helper function to check if we're in a niche app
function isNicheApp(): boolean {
  try {
    const Constants = require('expo-constants');
    const expoExtra = Constants.expoConfig?.extra;
    const activeTopic = expoExtra?.activeTopic;
    const topics = expoExtra?.topics || {};
    const filterContentByTopic = expoExtra?.filterContentByTopic;
    
    console.log('🔍 NICHE APP CHECK:', {
      activeTopic,
      hasTopics: !!topics,
      topicKeys: Object.keys(topics),
      filterContentByTopic,
      fullExpoExtra: expoExtra,
      isNiche: activeTopic && activeTopic !== 'default' && topics[activeTopic] ? topics[activeTopic].isNiche === true : false
    });
    
    // Method 1: Check if we have an activeTopic with isNiche flag
    if (activeTopic && activeTopic !== 'default' && topics[activeTopic]) {
      const isNiche = topics[activeTopic].isNiche === true;
      console.log(`🎯 Method 1: Niche app detection result: ${isNiche} for topic: ${activeTopic}`);
      return isNiche;
    }
    
    // Method 2: Check if we're in single topic filtering mode (fallback for runtime detection)
    if (filterContentByTopic && activeTopic && activeTopic !== 'default') {
      console.log(`🎯 Method 2: Single topic filtering detected for: ${activeTopic} - treating as niche app`);
      return true;
    }
    
    // Method 3: Check if Constants has a different structure (debug what's actually there)
    console.log('🔍 Debug Constants structure:', {
      manifest: Constants.manifest,
      manifest2: Constants.manifest2,
      executionEnvironment: Constants.executionEnvironment
    });
    
  } catch (e) {
    console.error('❌ Error checking if niche app:', e);
  }
  console.log('❌ Not a niche app - fallback to false');
  return false;
}

// Simple helper to select questions with subtopic variety for niche apps
function selectQuestionsWithSubtopicVariety(
  groupedQuestions: Map<Topic, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  targetCount: number
): FeedItem[] {
  // console.log('🌈 SUBTOPIC VARIETY SELECTION START:', { targetCount });
  // console.log('📊 Grouped questions structure:', {
  //   topicCount: groupedQuestions.size,
  //   topics: Array.from(groupedQuestions.keys()),
  //   shownQuestionIds: state.shownQuestionIds.size
  // });

  const selectedQuestions: FeedItem[] = [];
  const usedSubtopics = new Set<string>();
  
  // Get all available subtopics with their questions
  const subtopicData: { subtopic: string, questions: FeedItem[] }[] = [];
  
  Array.from(groupedQuestions.entries()).forEach(([topic, subtopicMap]) => {
    // console.log(`📂 Processing topic: ${topic}, subtopics: ${subtopicMap.size}`);
    Array.from(subtopicMap.entries()).forEach(([subtopic, questions]) => {
      const availableQuestions = questions.filter(q => !state.shownQuestionIds.has(q.id));
      // console.log(`  📝 Subtopic "${subtopic}": ${availableQuestions.length}/${questions.length} available questions`);
      if (availableQuestions.length > 0) {
        subtopicData.push({ subtopic, questions: availableQuestions });
      }
    });
  });
  
  // console.log(`🎲 Found ${subtopicData.length} subtopics with available questions:`, 
  //   subtopicData.map(s => `${s.subtopic}(${s.questions.length})`));
  
  if (subtopicData.length === 0) {
    // console.log('❌ No subtopics with available questions - returning empty array');
    return selectedQuestions;
  }
  
  // Shuffle subtopics to randomize order
  shuffleArray(subtopicData);
  // console.log('🔀 Shuffled subtopic order:', subtopicData.map(s => s.subtopic));
  
  // Strategy: Try to get one question from each different subtopic first
  for (const { subtopic, questions } of subtopicData) {
    if (selectedQuestions.length >= targetCount) break;
    
    if (!usedSubtopics.has(subtopic)) {
      // Randomly select a question from this subtopic
      const question = questions[Math.floor(Math.random() * questions.length)];
      selectedQuestions.push(question);
      usedSubtopics.add(subtopic);
      
      // Mark as shown
      state.shownQuestionIds.add(question.id);
      state.topicsShown.add(question.topic);
      state.isExplorationQuestion.add(question.id);
      
      // console.log(`✅ Selected question ${selectedQuestions.length}/${targetCount} from subtopic "${subtopic}": "${question.question?.substring(0, 50)}..."`);
    }
  }
  
  // If we still need more questions, cycle through subtopics again
  if (selectedQuestions.length < targetCount) {
    // console.log(`🔄 Need ${targetCount - selectedQuestions.length} more questions, cycling through subtopics again`);
    
    for (const { subtopic, questions } of subtopicData) {
      if (selectedQuestions.length >= targetCount) break;
      
      // Get questions not already selected
      const remainingQuestions = questions.filter(q => !state.shownQuestionIds.has(q.id));
      if (remainingQuestions.length > 0) {
        const question = remainingQuestions[Math.floor(Math.random() * remainingQuestions.length)];
        selectedQuestions.push(question);
        
        // Mark as shown
        state.shownQuestionIds.add(question.id);
        state.topicsShown.add(question.topic);
        state.isExplorationQuestion.add(question.id);
        
        // console.log(`🔄 Additional question ${selectedQuestions.length}/${targetCount} from subtopic "${subtopic}": "${question.question?.substring(0, 50)}..."`);
      }
    }
  }
  
  // console.log(`🎯 SUBTOPIC VARIETY SELECTION COMPLETE: Selected ${selectedQuestions.length}/${targetCount} questions from ${usedSubtopics.size} different subtopics`);
  
  return selectedQuestions;
}

// Helper function to update diversity trackers when a question is selected
function trackTopicForDiversity(state: ColdStartState, topic: string): void {
  // Update last selected topics
  state.lastSelectedTopics.unshift(topic);
  if (state.lastSelectedTopics.length > MAX_CONSECUTIVE_TOPIC * 2) {
    state.lastSelectedTopics.pop();
  }
  
  // Update count in current batch
  const currentCount = state.topicCountInCurrentBatch.get(topic) || 0;
  state.topicCountInCurrentBatch.set(topic, currentCount + 1);
  
  // logger.info(`Topic diversity tracking updated: ${topic} now has count ${currentCount + 1}, last topics: [${state.lastSelectedTopics.join(', ')}]`);
} 