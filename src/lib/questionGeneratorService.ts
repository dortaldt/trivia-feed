import { supabase } from './supabaseClient';
import { generateQuestions, GeneratedQuestion, generateQuestionFingerprint, checkQuestionExists, GenerationConfig, determineGenerationConfig } from './openaiService';
import { dbEventEmitter, logGeneratorEvent } from './syncService';
import { logDbOperation } from './simplifiedSyncService';
import { UserProfile } from './personalizationService';
import { getTriviaTableName } from '../utils/tableUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

// Interface for the question category item from the database
interface QuestionCategoryItem {
  topic: string;
  category?: string; // Keep for backwards compatibility
  [key: string]: any;
}

// Interface for user answer item with joined question data
interface UserAnswerWithQuestion {
  question_id: string;
  questions: {
    topic: string;
    category?: string; // Keep for backwards compatibility
    [key: string]: any;
  } | null;
  [key: string]: any;
}

// Interface for the user profile from the database
// NOTE: This interface is commented out to avoid conflict with imported UserProfile
// interface UserProfile {
//   id: string;
//   topics: Record<string, { weight: number }>;
//   topic_weights?: Record<string, number>; // Legacy format
//   subtopics?: Record<string, { topic: string, weight: number }>; // Added for subtopic weights
//   recentGenerationTopics?: string[]; // Added for cyclic selection tracking
//   [key: string]: any;
// }

// Local implementation of the TopicMapper to avoid import errors
class TopicMapper {
  // Map of topics to related topics
  private TOPIC_RELATIONS: Record<string, string[]> = {
    // Science topics
    'Science': ['Physics', 'Biology', 'Chemistry', 'Astronomy', 'Technology'],
    'Physics': ['Science', 'Astronomy', 'Mathematics'],
    'Biology': ['Science', 'Medicine', 'Nature'],
    'Chemistry': ['Science', 'Medicine', 'Physics'],
    'Astronomy': ['Science', 'Physics', 'Space'],
    'Technology': ['Science', 'Computers', 'Engineering'],
    
    // History topics
    'History': ['Ancient History', 'Modern History', 'Politics', 'Geography'],
    'Ancient History': ['History', 'Archaeology', 'Mythology'],
    'Modern History': ['History', 'Politics', 'Geography'],
    
    // Geography topics
    'Geography': ['History', 'Nature', 'Countries'],
    'Countries': ['Geography', 'Culture', 'Politics'],
    
    // Arts and Entertainment
    'Arts': ['Literature', 'Music', 'Visual Arts', 'Movies'],
    'Literature': ['Arts', 'History', 'Language'],
    'Music': ['Arts', 'Entertainment', 'Culture'],
    'Movies': ['Arts', 'Entertainment', 'Pop Culture'],
    
    // General Knowledge
    'General Knowledge': ['Trivia', 'Facts', 'Science', 'History'],
    'Trivia': ['General Knowledge', 'Entertainment', 'Pop Culture'],
  };

  // Default related topics when a specific mapping isn't found
  private DEFAULT_RELATED_TOPICS = ['General Knowledge', 'Trivia', 'Science', 'History'];

  /**
   * Get related topics for a given topic
   */
  getRelatedTopics(topic: string, count: number = 2): string[] {
    // Try to find exact match first
    if (this.TOPIC_RELATIONS[topic]) {
      const related = this.TOPIC_RELATIONS[topic];
      if (related.length <= count) {
        return related;
      }
      
      // Shuffle and take first count elements
      return this.shuffleArray(related).slice(0, count);
    }
    
    // Try case-insensitive match
    const lowerTopic = topic.toLowerCase();
    for (const [key, value] of Object.entries(this.TOPIC_RELATIONS)) {
      if (key.toLowerCase() === lowerTopic) {
        return this.shuffleArray(value).slice(0, count);
      }
    }
    
    // Default topics if no match found
    return this.shuffleArray(this.DEFAULT_RELATED_TOPICS).slice(0, count);
  }
  
  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Singleton instance
let topicMapperInstance: TopicMapper | null = null;

/**
 * Get the TopicMapper instance
 */
function getTopicMapper(): TopicMapper {
  if (!topicMapperInstance) {
    topicMapperInstance = new TopicMapper();
  }
  return topicMapperInstance;
}

/**
 * Get the count of questions for each topic in the database
 */
export async function getTopicQuestionCounts(): Promise<Record<string, number>> {
  try {
    const tableName = getTriviaTableName();
    const { data, error } = await supabase
      .from(tableName)
      .select('topic');
    
    if (error) {
      throw error;
    }
    
    // Count questions by category
    const counts: Record<string, number> = {};
    data?.forEach((item: QuestionCategoryItem) => {
      const category = item.topic || 'Unknown'; // Use topic directly
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return counts;
  } catch (error) {
    logger.error('[GENERATOR]', 'Error getting topic question counts:', error instanceof Error ? error.message : String(error));
    return {};
  }
}

/**
 * Get topics from recent answered questions
 */
export async function getRecentAnsweredTopics(userId: string, count: number = 5): Promise<string[]> {
  try {
    // First, get the recent question IDs from user_answers
    const { data: answerData, error: answerError } = await supabase
      .from('user_answers')
      .select('question_id')
      .eq('user_id', userId)
      .order('answer_time', { ascending: false })
      .limit(count);
    
    if (answerError) {
      logger.error('[GENERATOR]', 'Error getting recent answers:', answerError instanceof Error ? answerError.message : String(answerError));
      return [];
    }
    
    if (!answerData || answerData.length === 0) {
      return [];
    }
    
    // Extract question IDs
    const questionIds = answerData.map((item: { question_id: string }) => item.question_id);
    
    // Now get the categories for these questions with a separate query
    const tableName = getTriviaTableName();
    const { data: questionData, error: questionError } = await supabase
      .from(tableName)
      .select('id, topic')
      .in('id', questionIds);
    
    if (questionError) {
      logger.error('[GENERATOR]', 'Error getting question categories:', questionError instanceof Error ? questionError.message : String(questionError));
      return [];
    }
    
    // Extract unique categories
    const topics = new Set<string>();
    questionData?.forEach((item: { id: string, topic: string }) => {
      if (item.topic) {
        topics.add(item.topic);
      }
    });
    
    return Array.from(topics);
  } catch (error) {
    logger.error('[GENERATOR]', 'Error getting recent answered topics:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Get user's top topics based on scores
 */
export async function getUserTopTopics(userId: string, scoreThreshold: number = 0.5): Promise<string[]> {
  try {
    // Just return a default set of popular topics since topic_weights doesn't exist
    logger.debug('Generator', 'Using default topics (topic_weights not available)');
    return ['Science', 'History', 'Geography'];
    
    /* Original implementation disabled
    const { data, error } = await supabase
      .from('user_profiles')
      .select('topic_weights')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      throw error;
    }
    
    // Extract topics with score > threshold
    const topTopics: string[] = [];
    const topicWeights = data?.topic_weights || {};
    
    for (const [topic, score] of Object.entries(topicWeights)) {
      if (typeof score === 'number' && score > scoreThreshold) {
        topTopics.push(topic);
      }
    }
    
    return topTopics;
    */
  } catch (error) {
    logger.error('[GENERATOR]', 'Error getting user top topics:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

// Track the last generation time for each user
const lastGenerationTimes: Record<string, { timestamp: number, answerCount: number }> = {};

// Add a client-side tracking system for interactions
const clientSideAnswerCounts: Record<string, number> = {};

/**
 * Get the client-side answer count for a user
 * @param userId The user ID to get the count for
 * @returns The number of answers recorded client-side
 */
export function getClientSideAnswerCount(userId: string): number {
  if (!userId) return 0;
  return clientSideAnswerCounts[userId] || 0;
}

/**
 * Register an answer with the client-side tracking system
 * This should be called whenever a user answers a question
 */
export function registerUserAnswer(userId: string): number {
  if (!userId) return 0;
  
  // Initialize if needed
  if (!clientSideAnswerCounts[userId]) {
    clientSideAnswerCounts[userId] = 0;
    console.log(`[REGISTER_ANSWER] Initializing answer count for ${userId}`);
  }
  
  // Get the previous count
  const previousCount = clientSideAnswerCounts[userId];
  
  // Increment and return the new count
  clientSideAnswerCounts[userId]++;
  const newCount = clientSideAnswerCounts[userId];
  
  console.log(`[REGISTER_ANSWER] User ${userId}: ${previousCount} → ${newCount}`);
  
  // Special logging for important milestones
  if (newCount === 6) {
    console.log(`🎯 [REGISTER_ANSWER] MILESTONE: User ${userId} reached 6 answers - should trigger generation!`);
  } else if (newCount % 6 === 0 && newCount > 6) {
    console.log(`🎯 [REGISTER_ANSWER] MILESTONE: User ${userId} reached ${newCount} answers - should trigger generation!`);
  }
  
  return newCount;
}

/**
 * Simple function to get existing topic-intent combinations from the database
 * This helps prevent generating questions with the same intent for the same topic
 */
async function getExistingTopicIntents(topics: string[]): Promise<Map<string, Set<string>>> {
  try {
    const topicIntents = new Map<string, Set<string>>();
    
    // Initialize with empty sets for all topics
    topics.forEach(topic => {
      topicIntents.set(topic, new Set<string>());
    });
    
    // For each topic, get existing questions and extract their intents
    const tableName = getTriviaTableName();
    const { data, error } = await supabase
      .from(tableName)
      .select('question_text, topic')
      .in('topic', topics);
      
    if (error) {
      logger.error('[GENERATOR]', 'Error fetching topic intents:', error instanceof Error ? error.message : String(error));
      return topicIntents;
    }
    
    // Process each question to extract its intent
    data?.forEach((question: { question_text?: string, topic?: string }) => {
      if (!question.question_text || !question.topic) return;
      
      // Import the extractQuestionIntent function from openaiService
      const { generateEnhancedFingerprint } = require('./openaiService');
      
      // Get the first part of the enhanced fingerprint which is the intent
      try {
        const fingerprint = generateEnhancedFingerprint(question.question_text);
        const intent = fingerprint.split('|')[0];
        
        // Add to the appropriate topic's intent set
        if (topicIntents.has(question.topic)) {
          topicIntents.get(question.topic)?.add(intent);
        }
      } catch (e) {
        logger.warn('[GENERATOR]', 'Error extracting intent:', e instanceof Error ? e.message : String(e));
      }
    });
    
    return topicIntents;
  } catch (error) {
    logger.error('[GENERATOR]', 'Error getting topic intents:', error instanceof Error ? error.message : String(error));
    return new Map<string, Set<string>>();
  }
}

/**
 * Check if question generation should be triggered
 * Returns an object with information about why generation should occur
 */
export async function shouldGenerateQuestions(userId: string): Promise<{
  shouldGenerate: boolean;
  reason?: 'question_count' | 'none';
  answerCount?: number;
}> {
  try {
    logger.debug('Generator', `Checking if questions should be generated for user: ${userId}`);
    
    if (!userId) {
      logger.debug('Generator', 'No user ID provided, skipping generation check');
      return { shouldGenerate: false, reason: 'none' };
    }
    
    // Use client-side answer count tracking instead of database query
    // This will work for both guest and logged-in users
    const answerCount = clientSideAnswerCounts[userId] || 0;
    
    logger.info('[GENERATOR]', 'Client-side user answer count:', String(answerCount));
    
    // Not enough answers yet - must have at least 6 interactions before first generation
    if (answerCount < 6) {
      logger.info('[GENERATOR]', 'Not enough questions answered yet:', String(answerCount));
      return { shouldGenerate: false, reason: 'none', answerCount };
    }
    
    // Check if we've recently generated questions for this milestone
    const lastGeneration = lastGenerationTimes[userId];
    if (lastGeneration) {
      // Check if we've already generated for this milestone (same answer count)
      if (lastGeneration.answerCount === answerCount) {
        logger.info('[GENERATOR]', `Already generated questions for milestone ${answerCount}, skipping`);
        return { shouldGenerate: false, reason: 'none', answerCount };
      }
      
      // Check if we've recently generated (within the last 10 seconds)
      const timeSinceLastGeneration = Date.now() - lastGeneration.timestamp;
      if (timeSinceLastGeneration < 10000) { // 10 seconds
        logger.info('[GENERATOR]', `Generated questions recently (${timeSinceLastGeneration}ms ago), throttling`);
        return { shouldGenerate: false, reason: 'none', answerCount };
      }
    }
    
    // Generate new questions every 6 questions answered
    if (answerCount > 0 && answerCount % 6 === 0) {
      logger.info('[GENERATOR]', `User answered ${answerCount} questions (multiple of 6), triggering generation`);
      
      // Record generation time and count
      lastGenerationTimes[userId] = { timestamp: Date.now(), answerCount };
      
      return { 
        shouldGenerate: true, 
        reason: 'question_count', 
        answerCount 
      };
    }
    
    // No other triggers - not a multiple of 6
    logger.info('[GENERATOR]', `User answered ${answerCount} questions (not a multiple of 6), skipping generation`);
    return { shouldGenerate: false, reason: 'none', answerCount };
  } catch (error) {
    logger.error('[GENERATOR]', 'Error checking if questions should be generated:', error instanceof Error ? error.message : String(error));
    return { shouldGenerate: false, reason: 'none' };
  }
}

/**
 * Run the question generation process and save results to database
 * @param userId The user ID to generate questions for
 * @param forcedTopics Optional array of topics to use instead of fetching from DB
 */
export async function runQuestionGeneration(
  userId: string, 
  forcedTopics?: string[],
  clientSubtopics?: string[],
  clientBranches?: string[],
  clientTags?: string[],
  recentQuestions?: {
    id: string, 
    questionText: string,
    topic?: string,
    subtopic?: string,
    branch?: string,
    tags?: string[]
  }[] // Updated to accept full question structure from client
): Promise<boolean> {
  try {
    // Ensure user ID is valid
    if (!userId) {
      logger.error('[GENERATOR]', 'Invalid user ID');
        return false;
      }
    
    // Step 1: Get recent questions to avoid duplication
    let validRecentQuestions: {id: string, questionText: string, topic?: string, subtopic?: string, branch?: string, tags?: string[]}[] = [];
    
    if (recentQuestions && recentQuestions.length > 0) {
      // Client provided recent questions - use those
      logger.info('[GENERATOR]', `Using ${recentQuestions.length} client-provided recent questions`);
      validRecentQuestions = recentQuestions;
      
      // Log a sample for verification
      validRecentQuestions.slice(0, 3).forEach((q, i) => {
        logger.info('[GENERATOR]', `Recent question ${i+1}: ${q.questionText.substring(0, 50)}...`);
      });
    } else {
      // No client-provided questions, fetch from database
      try {
        // Get IDs of questions answered by the user
        let answerData, answerError;
        
        // Try with answer_time ordering first
        try {
          const result = await supabase
            .from('user_answers')
            .select('question_id')
            .eq('user_id', userId)
            .order('answer_time', { ascending: false })
            .limit(10);
          answerData = result.data;
          answerError = result.error;
        } catch (orderError) {
          // If ordering fails, try without ordering
          logger.info('[GENERATOR]', 'Ordering by answer_time failed, trying without ordering');
          const result = await supabase
            .from('user_answers')
            .select('question_id')
            .eq('user_id', userId)
            .limit(10);
          answerData = result.data;
          answerError = result.error;
        }
        
        if (answerError) {
          logger.error('[GENERATOR]', 'Error fetching recent answers:', JSON.stringify({
            message: answerError.message || 'Unknown error',
            code: answerError.code || 'No code',
            details: answerError.details || 'No details',
            hint: answerError.hint || 'No hint',
            fullError: answerError
          }, null, 2));
          logger.info('[GENERATOR]', 'Continuing question generation without recent answers due to database error');
        } else if (answerData && answerData.length > 0) {
          // Get question texts for these IDs
          const questionIds = answerData.map((a: any) => a.question_id);
          
          const tableName = getTriviaTableName();
          const { data: questionData, error: questionError } = await supabase
            .from(tableName)
            .select('id, question_text, topic, subtopic, branch, tags')
            .in('id', questionIds);
            
          if (questionError) {
            logger.error('[GENERATOR]', 'Error fetching recent questions:', JSON.stringify({
              message: questionError.message || 'Unknown error',
              code: questionError.code || 'No code', 
              details: questionError.details || 'No details',
              hint: questionError.hint || 'No hint',
              fullError: questionError
            }, null, 2));
          } else if (questionData && questionData.length > 0) {
            // Map to correct format
            validRecentQuestions = questionData.map((q: any) => ({
              id: q.id,
              questionText: q.question_text || '',
              topic: q.topic,
              subtopic: q.subtopic,
              branch: q.branch,
              tags: q.tags
            }));
            
            logger.info('[GENERATOR]', `Found ${validRecentQuestions.length} recent questions from database`);
          }
        }
      } catch (error) {
        logger.error('[GENERATOR]', 'Error getting recent questions:', JSON.stringify({
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'No error name',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          fullError: error
        }, null, 2));
        logger.info('[GENERATOR]', 'Continuing question generation without recent answers due to catch block error');
      }
    }
    
    // Enhance recent questions - if we have basic ones without hierarchical data
    if (validRecentQuestions.length > 0) {
      // If any recent questions are missing hierarchy data (topic, subtopic, branch), 
      // try to fetch the complete data from the database
      const incompleteQuestions = validRecentQuestions.filter(q => !q.topic || !q.subtopic || !q.branch);
      
      if (incompleteQuestions.length > 0) {
        logger.info('[GENERATOR]', `Enhancing ${incompleteQuestions.length} questions with missing hierarchy data`);
        
        try {
          const questionIds = incompleteQuestions.map(q => q.id);
          const tableName = getTriviaTableName();
          const { data, error } = await supabase
            .from(tableName)
            .select('id, topic, subtopic, branch, tags')
            .in('id', questionIds);
            
          if (error) {
            logger.error('[GENERATOR]', 'Error fetching hierarchy data:', error instanceof Error ? error.message : String(error));
          } else if (data && data.length > 0) {
            // Update the questions with the fetched data
            validRecentQuestions = validRecentQuestions.map(q => {
              const completeData = data.find((d: any) => d.id === q.id);
              if (completeData) {
                return {
                  ...q,
                  topic: completeData.topic || q.topic,
                  subtopic: completeData.subtopic || q.subtopic,
                  branch: completeData.branch || q.branch,
                  tags: completeData.tags || q.tags
                };
              }
              return q;
            });
            
            logger.info('[GENERATOR]', 'Successfully enhanced recent questions with hierarchy data');
          }
        } catch (error) {
          logger.error('[GENERATOR]', 'Error enhancing questions with hierarchy data:', error instanceof Error ? error.message : String(error));
        }
      }
    }
    
    // Step 2: Get primary topics (recent + top user topics) - or use forced topics
    let primaryTopics: string[] = [];
    if (forcedTopics && forcedTopics.length > 0) {
      primaryTopics = forcedTopics;
      logger.debug('Generator', 'Using forced topics:', primaryTopics);
    } else {
      try {
        // Import the user profile fetching function
        const { fetchUserProfile } = await import('./syncService');
        
        // Get user profile to extract top weighted topics
        const userProfile = await fetchUserProfile(userId);
        
        // Step 2.1: Get the most recent answered questions - higher priority
        const recentTopics = await getRecentAnsweredTopics(userId, 10); // Get more recent topics
        logger.info('[GENERATOR]', 'Most recent answered topics (highest priority):', recentTopics.join(', '));
        
        // Step 2.2: Get topics with high weights from user profile
        const weightedTopics: {name: string, weight: number}[] = [];
        
        if (userProfile && userProfile.topics) {
          // Convert topics object to array of {name, weight} pairs
          weightedTopics.push(
            ...Object.entries(userProfile.topics)
              .map(([name, data]) => ({ name, weight: data.weight || 0 }))
              .sort((a, b) => b.weight - a.weight) // Sort by weight descending
          );
        }
        
        // Step 2.3: Create a balanced prioritized topic list
        // Create a score map for topics, combining recency and weight
        const topicScores: Record<string, number> = {};
        
        // Score recent topics (0.5 points for each, with most recent getting more)
        recentTopics.forEach((topic, index) => {
          // Reverse index so most recent gets highest score
          const recencyScore = 0.5 * (recentTopics.length - index) / recentTopics.length;
          topicScores[topic] = (topicScores[topic] || 0) + recencyScore;
        });
        
        // Score weighted topics (direct weight value from profile)
        weightedTopics.forEach(topic => {
          // Weight score (0-1 from profile)
          topicScores[topic.name] = (topicScores[topic.name] || 0) + topic.weight;
        });
        
        // Calculate final scores and sort
        const scoredTopics = Object.entries(topicScores)
          .map(([topic, score]) => ({ topic, score }))
          .sort((a, b) => b.score - a.score);
        
        // Take top topics as prioritized list
        const prioritizedTopics = scoredTopics.slice(0, 6).map(t => t.topic);
        
        // If we don't have enough, add more from recent and weighted
        if (prioritizedTopics.length < 4) {
          // Add any remaining top weighted topics
          weightedTopics.slice(0, 4).forEach(t => {
            if (!prioritizedTopics.includes(t.name)) {
              prioritizedTopics.push(t.name);
            }
          });
          
          // Add any remaining recent topics
          recentTopics.forEach(topic => {
            if (!prioritizedTopics.includes(topic)) {
              prioritizedTopics.push(topic);
            }
          });
        }
        
        // Step 2.4: Extract subtopics from high-weight main topics for additional context
        const subtopicWeights: {topic: string, subtopic: string, weight: number}[] = [];
        
        if (userProfile && userProfile.topics) {
          // Extract subtopics from top weighted topics
          Object.entries(userProfile.topics)
            .filter(([topicName]) => {
              // Include subtopics from any topic with significant weight (>= 0.5)
              const foundTopic = weightedTopics.find(t => t.name === topicName);
              return foundTopic && foundTopic.weight >= 0.5;
            })
            .forEach(([topicName, topicData]) => {
              Object.entries(topicData.subtopics || {}).forEach(([subtopicName, subtopicData]) => {
                subtopicWeights.push({
                  topic: topicName,
                  subtopic: subtopicName,
                  weight: subtopicData.weight || 0
                });
              });
            });
          
          // Log discovered subtopics for debugging
          if (subtopicWeights.length > 0) {
            // Don't log the verbose subtopic details
          }
        }
        
        // Use the prioritized topics as primary topics
        primaryTopics = prioritizedTopics;
        
        // Create combined hierarchical topics (topic:subtopic, topic:branch)
        // We'll add some of these to the primary topics
        const combinedTopics: string[] = [];
        
        // Create topic:subtopic combinations for topics with high weights
        if (subtopicWeights.length > 0) {
          // Sort by weight to prioritize most important combinations
          const sortedSubtopicWeights = [...subtopicWeights].sort((a, b) => b.weight - a.weight);
          
          // Take top 3 subtopics and create combined format
          sortedSubtopicWeights.slice(0, 3).forEach(item => {
            combinedTopics.push(`${item.topic}:${item.subtopic}`);
          });
        }
        
        // Also create topic:branch combinations for branches with high weights
        const branchWeights: {topic: string, subtopic: string, branch: string, weight: number}[] = [];
        
        if (userProfile && userProfile.topics) {
          // Extract branches from top weighted topics
          Object.entries(userProfile.topics).forEach(([topicName, topicData]) => {
            Object.entries(topicData.subtopics || {}).forEach(([subtopicName, subtopicData]) => {
              Object.entries(subtopicData.branches || {}).forEach(([branchName, branchData]) => {
                branchWeights.push({
                  topic: topicName,
                  subtopic: subtopicName,
                  branch: branchName,
                  weight: branchData.weight || 0
                });
              });
            });
          });
          
          // Log discovered branches for debugging
          if (branchWeights.length > 0) {
            // Add top branches to combined topics list
            const sortedBranchWeights = [...branchWeights].sort((a, b) => b.weight - a.weight);
            
            // Take top 2 branches and create combined format
            sortedBranchWeights.slice(0, 2).forEach(item => {
              // Create a topic:branch format
              combinedTopics.push(`${item.topic}:${item.branch}`);
            });
          }
        }
        
        // Add a few of the combined hierarchical topics to the primary topics list
        // Replace some of the lower-priority topics with these combined ones
        if (combinedTopics.length > 0) {
          // Keep the top 3 prioritized topics
          const topPriorityTopics = primaryTopics.slice(0, 3);
          
          // Add combined topics
          const combinedList = [...topPriorityTopics, ...combinedTopics];
          
          // Keep the list size reasonable (not too many topics)
          primaryTopics = combinedList.slice(0, 6);
        }
        
        // Final selection logged only for verification
        logger.info('[GENERATOR]', 'Final prioritized topics in order of importance:', primaryTopics.join(', '));
      } catch (error) {
        logger.error('[GENERATOR]', 'Error getting personalized topics:', error instanceof Error ? error.message : String(error));
        // Fallback to default topics on error
        primaryTopics = ['Science', 'History', 'Geography'];
      }
    }
    
    // If we still don't have any topics, use defaults
    if (primaryTopics.length === 0) {
      primaryTopics = ['Science', 'History', 'Geography'];
      logger.info('[GENERATOR]', 'Using default topics (no topics available)');
    }
    
    // Step 3: Get adjacent topics
    const topicMapper = getTopicMapper();
    const adjacentTopics: string[] = [];
    
    primaryTopics.forEach(topic => {
      const related = topicMapper.getRelatedTopics(topic);
      adjacentTopics.push(...related);
    });
    
    // Deduplicate and remove any that are already in primary topics
    const uniqueAdjacentTopics = Array.from(new Set(adjacentTopics))
      .filter(topic => !primaryTopics.includes(topic));
    
    // Log that generation is starting with reason information
    let reason = forcedTopics ? 'Client-side count: multiple of 6 questions' : 'Server check triggered';
    
    logger.info('[GENERATOR]', 'Primary topics:', primaryTopics.join(', '));
    logger.info('[GENERATOR]', 'Adjacent topics:', uniqueAdjacentTopics.join(', '));
    
    logGeneratorEvent(
      userId,
      primaryTopics,
      uniqueAdjacentTopics,
      0,
      0,
      false,
      undefined,
      `starting - ${reason}`
    );

    // Extract top subtopics, branches, and tags for more detailed prompting
    const topSubtopics: {topic: string, subtopic: string, weight: number}[] = [];
    const topBranches: {topic: string, subtopic: string, branch: string, weight: number}[] = [];
    const topTags: string[] = []; // Tags will be extracted from recent questions
    
    // Get subtopics and branches if user profile is available
    if (!forcedTopics || forcedTopics.length === 0) {
      try {
        // Import the user profile fetching function if not already imported
        let userProfile: UserProfile | null = null;
        try {
          const { fetchUserProfile } = await import('./syncService');
          userProfile = await fetchUserProfile(userId);
        } catch (e) {
          logger.error('[GENERATOR]', 'Error importing or fetching user profile:', e instanceof Error ? e.message : String(e));
        }
        
        if (userProfile && userProfile.topics) {
          // Collect all subtopics with weights
          const allSubtopics: {topic: string, subtopic: string, weight: number}[] = [];
          const allBranches: {topic: string, subtopic: string, branch: string, weight: number}[] = [];
          
          // Extract subtopics and branches
          Object.entries(userProfile.topics).forEach(([topicName, topicData]) => {
            Object.entries(topicData.subtopics || {}).forEach(([subtopicName, subtopicData]) => {
              // Add subtopic with full context
              allSubtopics.push({
                topic: topicName,
                subtopic: subtopicName,
                weight: subtopicData.weight || 0
              });
              
              // Add branches with full context
              Object.entries(subtopicData.branches || {}).forEach(([branchName, branchData]) => {
                allBranches.push({
                  topic: topicName,
                  subtopic: subtopicName,
                  branch: branchName,
                  weight: branchData.weight || 0
                });
              });
            });
          });
          
          // Sort by weight and take top items
          topSubtopics.push(...allSubtopics.sort((a, b) => b.weight - a.weight).slice(0, 5));
          topBranches.push(...allBranches.sort((a, b) => b.weight - a.weight).slice(0, 5));
          
          logger.info('[GENERATOR]', 'Top weighted subtopics:', 
            topSubtopics.map(s => `${s.topic}/${s.subtopic} (${s.weight.toFixed(2)})`).join(', '));
          logger.info('[GENERATOR]', 'Top weighted branches:', 
            topBranches.map(b => `${b.topic}/${b.subtopic}/${b.branch} (${b.weight.toFixed(2)})`).join(', '));
        }
        
        // Get tags from most recent questions the user has answered
        try {
          // Get recent question IDs
          const { data: answerData } = await supabase
            .from('user_answers')
            .select('question_id')
            .eq('user_id', userId)
            .order('answer_time', { ascending: false })
            .limit(10);
          
          if (answerData && answerData.length > 0) {
            const questionIds = answerData.map((item: { question_id: string }) => item.question_id);
            
            // Get tags from these questions
            const tableName = getTriviaTableName();
            const { data: questionData } = await supabase
              .from(tableName)
              .select('tags')
              .in('id', questionIds);
            
            // Extract and flatten all tags
            const allTags: string[] = [];
            questionData?.forEach((item: { tags: string[] }) => {
              if (item.tags && Array.isArray(item.tags)) {
                allTags.push(...item.tags);
              }
            });
            
            // Count tag frequency
            const tagCounts = allTags.reduce((acc: Record<string, number>, tag) => {
              acc[tag] = (acc[tag] || 0) + 1;
              return acc;
            }, {});
            
            // Sort by frequency and take top 8
            topTags.push(
              ...Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([tag]) => tag)
            );
            
            logger.info('[GENERATOR]', 'Top tags from recent questions:', topTags.join(', '));
          }
        } catch (error) {
          logger.error('[GENERATOR]', 'Error fetching question tags:', error instanceof Error ? error.message : String(error));
        }
      } catch (error) {
        logger.error('[GENERATOR]', 'Error extracting subtopics and branches:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Use client-side data if provided, otherwise use data from database/profile
    const finalSubtopics: string[] = [];
    const finalBranches: string[] = [];
    const finalTags: string[] = [];
    
    // PRIORITY 1: Use client-side data if provided (highest priority)
    if (clientSubtopics && clientSubtopics.length > 0) {
      logger.info('[GENERATOR]', 'Using client-side subtopics:', clientSubtopics.join(', '));
      finalSubtopics.push(...clientSubtopics);
    } else {
      // Otherwise use profile data
      finalSubtopics.push(...topSubtopics.map(s => s.subtopic));
    }
    
    if (clientBranches && clientBranches.length > 0) {
      logger.info('[GENERATOR]', 'Using client-side branches:', clientBranches.join(', '));
      finalBranches.push(...clientBranches);
    } else {
      // Otherwise use profile data
      finalBranches.push(...topBranches.map(b => b.branch));
    }
    
    if (clientTags && clientTags.length > 0) {
      logger.info('[GENERATOR]', 'Using client-side tags:', clientTags.join(', '));
      finalTags.push(...clientTags);
    } else {
      // Otherwise use database tags
      finalTags.push(...topTags);
    }
    
    // If profile data is provided, get all the usual profile-based subtopics/branches
    if (!forcedTopics || forcedTopics.length === 0) {
      try {
        // Import the user profile fetching function if not already imported
        let userProfile: UserProfile | null = null;
        try {
          const { fetchUserProfile } = await import('./syncService');
          userProfile = await fetchUserProfile(userId);
        } catch (e) {
          logger.error('[GENERATOR]', 'Error importing or fetching user profile:', e instanceof Error ? e.message : String(e));
        }
        
        if (userProfile && userProfile.topics) {
          // Extract data only if we don't already have client data
          if (finalSubtopics.length === 0 || finalBranches.length === 0) {
            // Collect all subtopics with weights
            const allSubtopics: {topic: string, subtopic: string, weight: number}[] = [];
            const allBranches: {topic: string, subtopic: string, branch: string, weight: number}[] = [];
            
            // Extract subtopics and branches
            Object.entries(userProfile.topics).forEach(([topicName, topicData]) => {
              Object.entries(topicData.subtopics || {}).forEach(([subtopicName, subtopicData]) => {
                // Add subtopic with full context
                allSubtopics.push({
                  topic: topicName,
                  subtopic: subtopicName,
                  weight: subtopicData.weight || 0
                });
                
                // Add branches with full context
                Object.entries(subtopicData.branches || {}).forEach(([branchName, branchData]) => {
                  allBranches.push({
                    topic: topicName,
                    subtopic: subtopicName,
                    branch: branchName,
                    weight: branchData.weight || 0
                  });
                });
              });
            });
            
            // If we don't have subtopics yet, add them from profile
            if (finalSubtopics.length === 0) {
              const sortedSubtopics = allSubtopics.sort((a, b) => b.weight - a.weight).slice(0, 5);
              finalSubtopics.push(...sortedSubtopics.map(s => s.subtopic));
              logger.info('[GENERATOR]', 'Using profile subtopics:', finalSubtopics.join(', '));
            }
            
            // If we don't have branches yet, add them from profile
            if (finalBranches.length === 0) {
              const sortedBranches = allBranches.sort((a, b) => b.weight - a.weight).slice(0, 5);
              finalBranches.push(...sortedBranches.map(b => b.branch));
              logger.info('[GENERATOR]', 'Using profile branches:', finalBranches.join(', '));
            }
          }
        }
        
        // Get tags from database if we don't have them yet
        if (finalTags.length === 0) {
          try {
            // Get recent question IDs
            const { data: answerData } = await supabase
              .from('user_answers')
              .select('question_id')
              .eq('user_id', userId)
              .order('answer_time', { ascending: false })
              .limit(10);
            
            if (answerData && answerData.length > 0) {
              const questionIds = answerData.map((item: { question_id: string }) => item.question_id);
              
              // Get tags from these questions
              const tableName = getTriviaTableName();
              const { data: questionData } = await supabase
                .from(tableName)
                .select('tags')
                .in('id', questionIds);
              
              // Extract and flatten all tags
              const allTags: string[] = [];
              questionData?.forEach((item: { tags: string[] }) => {
                if (item.tags && Array.isArray(item.tags)) {
                  allTags.push(...item.tags);
                }
              });
              
              // Count tag frequency
              const tagCounts = allTags.reduce((acc: Record<string, number>, tag) => {
                acc[tag] = (acc[tag] || 0) + 1;
                return acc;
              }, {});
              
              // Sort by frequency and take top 8
              finalTags.push(
                ...Object.entries(tagCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([tag]) => tag)
              );
              
              logger.info('[GENERATOR]', 'Using database tags:', finalTags.join(', '));
            }
          } catch (error) {
            logger.error('[GENERATOR]', 'Error fetching question tags:', error instanceof Error ? error.message : String(error));
          }
        }
      } catch (error) {
        logger.error('[GENERATOR]', 'Error extracting subtopics and branches:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Step 4: Removed topic-intent combinations section
    
    // Step 5: Call the OpenAI service for generation
    try {
      // Ensure we have at least some primary topics
      if (primaryTopics.length === 0) {
        primaryTopics = ['General Knowledge', 'Trivia'];
        logger.info('[GENERATOR]', 'Using fallback topics as no primary topics were found');
      }

      // Collection of preferred subtopics from client or user profile
      let preferredSubtopics = clientSubtopics || [];
    
      // Try to get preferred subtopics from user profile for exploration questions
      try {
        const { fetchUserProfile } = await import('./syncService');
        const userProfile = await fetchUserProfile(userId);
        
        if (userProfile && userProfile.topics) {
          // Sort topics by weight
          const weightedTopics: [string, number][] = [];
          
          Object.entries(userProfile.topics).forEach(([topic, data]) => {
            if (typeof data === 'object' && data !== null && data.weight !== undefined) {
              weightedTopics.push([topic, data.weight]);
            }
          });
          
          // Sort by weight (highest first)
          weightedTopics.sort((a, b) => b[1] - a[1]);
          
          // Reorder primary topics based on weight
          if (weightedTopics.length > 0) {
            // Create a map for quick lookup
            const topicSet = new Set(primaryTopics);
            
            // Add weighted topics that exist in primaryTopics at the beginning
            const orderedPrimaryTopics = weightedTopics
              .filter(([topic]) => topicSet.has(topic))
              .map(([topic]) => topic);
            
            // Add any remaining topics that weren't in the weighted list
            const remainingTopics = primaryTopics.filter(topic => !orderedPrimaryTopics.includes(topic));
            
            // Create the final ordered list
            primaryTopics = [...orderedPrimaryTopics, ...remainingTopics];
            
            logger.info('[GENERATOR]', 'Ordered primary topics by weight:', primaryTopics.join(', '));
          }
          
          // Try to extract subtopics for the highest weighted topic for question 10
          // Look for subtopics in user_answers with the top topic
          if (primaryTopics.length > 0) {
            const topTopic = primaryTopics[0];
            
            try {
              // Get recently answered questions for this topic
              const { data: topicAnswers, error: topicError } = await supabase
                .from('user_answers')
                .select('questions:question_id(subtopic)')
                .eq('user_id', userId)
                .eq('questions.topic', topTopic)
                .order('answer_time', { ascending: false })
                .limit(5);
              
              if (!topicError && topicAnswers && topicAnswers.length > 0) {
                // Count subtopics to find the most common ones
                const subtopicCount = new Map<string, number>();
                
                topicAnswers.forEach((answer: any) => {
                  if (answer.questions && answer.questions.subtopic) {
                    const subtopic = answer.questions.subtopic;
                    subtopicCount.set(subtopic, (subtopicCount.get(subtopic) || 0) + 1);
                  }
                });
                
                // Convert to array and sort by count
                const sortedSubtopics = Array.from(subtopicCount.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([subtopic]) => subtopic);
                
                // Add these subtopics to the preferred list
                if (sortedSubtopics.length > 0) {
                  preferredSubtopics = [...sortedSubtopics, ...preferredSubtopics];
                  logger.info('[GENERATOR]', 'Added top subtopics for exploration:', sortedSubtopics.join(', '));
                }
              }
            } catch (subtopicError) {
              logger.error('[GENERATOR]', 'Error fetching subtopics for top topic:', subtopicError instanceof Error ? subtopicError.message : String(subtopicError));
            }
          }
        }
      } catch (profileError) {
        logger.error('[GENERATOR]', 'Error processing user profile for subtopics:', profileError instanceof Error ? profileError.message : String(profileError));
      }

      // Prepare variables for OpenAI call  
      const preferredBranches = clientBranches || [];
      const preferredTags = clientTags || [];
      
      // Prepare recent questions with full hierarchy
      const enhancedRecentQuestions = validRecentQuestions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        topic: q.topic || '',
        subtopic: q.subtopic || '',
        branch: q.branch || '',
        tags: q.tags || []
      }));

      // Removed topic-intent combinations section
      
      // Determine generation configuration based on app settings
      const generationConfig = determineGenerationConfig();
      
      // Log the generation mode being used
      logger.info('[GENERATOR]', `Using ${generationConfig.mode} generation mode`);
      logger.info('[GENERATOR]', `Target table: ${generationConfig.targetTable}`);
      
      // Generate questions
      logger.info('[GENERATOR]', 'Calling OpenAI with preferred subtopics:', preferredSubtopics.join(', '));
    const generatedQuestions = await generateQuestions(
      primaryTopics,
        adjacentTopics,
        6, // primaryCount
        6, // adjacentCount
        preferredSubtopics,
        preferredBranches,
        preferredTags,
        enhancedRecentQuestions,
        generationConfig // Pass the generation configuration
    );
    
      // Step 6: Filter out duplicates and save to database using the appropriate table
    const savedCount = await saveUniqueQuestions(generatedQuestions, generationConfig.targetTable);
    
    logger.info('[GENERATOR]', `Generated ${generatedQuestions.length} questions, saved ${savedCount}`);
    
    // Log generation results
    logGeneratorEvent(
      userId,
      primaryTopics,
      adjacentTopics,
      generatedQuestions.length,
      savedCount,
      savedCount > 0,
      undefined,
      `completed - ${reason}`
    );
    
    return savedCount > 0;
  } catch (error) {
      logger.error('[GENERATOR]', 'Error during question generation:', error instanceof Error ? error.message : String(error));
      
      logGeneratorEvent(
        userId,
        [],
        [],
        0,
        0,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      return false;
    }
  } catch (error) {
    logger.error('[GENERATOR]', 'Error during question generation:', error instanceof Error ? error.message : String(error));
    
    logGeneratorEvent(
      userId,
      [],
      [],
      0,
      0,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return false;
  }
}

/**
 * Save generated questions to the database, avoiding duplicates
 */
async function saveUniqueQuestions(questions: GeneratedQuestion[], targetTable?: string): Promise<number> {
  try {
    let savedCount = 0;
    
    // ENHANCEMENT: Group questions by normalized answer for additional duplicate checking
    const questionsByAnswer = new Map<string, GeneratedQuestion[]>();
    
    // First pass: organize by answer
    for (const question of questions) {
      // Find the correct answer
      const correctAnswer = question.answers.find(a => a.isCorrect)?.text || '';
      
      // Skip questions without answers
      if (!correctAnswer) continue;
      
      // Normalize the answer for comparison
      const normalizedAnswer = correctAnswer.toLowerCase().trim();
      
      // Create entry if this is the first question with this answer
      if (!questionsByAnswer.has(normalizedAnswer)) {
        questionsByAnswer.set(normalizedAnswer, []);
      }
      
      // Add this question to its answer group
      questionsByAnswer.get(normalizedAnswer)?.push(question);
    }
    
    // Second pass: identify duplicates among questions with the same answer
    for (const [answer, answerQuestions] of Array.from(questionsByAnswer.entries())) {
      // If we have multiple questions with the same answer, further analyze them
      if (answerQuestions.length > 1) {
        logger.info('[GENERATOR]', `Analyzing ${answerQuestions.length} questions with answer "${answer}"`);
        
        // Import functions from openaiService
        const { generateEnhancedFingerprint, calculateFingerprintSimilarity } = require('./openaiService');
        
        // Keep track of questions to remove
        for (let i = 1; i < answerQuestions.length; i++) {
          // Compare each question to the first one (which we're planning to keep)
          const mainQuestion = answerQuestions[0];
          const compareQuestion = answerQuestions[i];
          
          try {
            // Generate enhanced fingerprints for better semantic comparison
            const mainFingerprint = generateEnhancedFingerprint(mainQuestion.question);
            const compareFingerprint = generateEnhancedFingerprint(compareQuestion.question);
            
            // Calculate similarity between fingerprints
            const similarity = calculateFingerprintSimilarity(mainFingerprint, compareFingerprint);
            
            // If similarity is too high, mark as duplicate
            if (similarity > 0.6) {
              logger.info('[GENERATOR]', `Duplicate detected with similarity ${similarity.toFixed(2)}:`);
              logger.info('[GENERATOR]', `  - Main: ${mainQuestion.question}`);
              logger.info('[GENERATOR]', `  - Dupe: ${compareQuestion.question}`);
              
              // Mark this question as a duplicate
              compareQuestion.isDuplicate = true;
            }
          } catch (e) {
            logger.warn('[GENERATOR]', 'Error comparing fingerprints:', e instanceof Error ? e.message : String(e));
          }
        }
      }
    }
    
    // Third pass: process all questions, skipping marked duplicates
    for (const question of questions) {
      // Skip questions marked as duplicates
      if ((question as any).isDuplicate) {
        logger.info('[GENERATOR]', `Skipping duplicate question: ${question.question.substring(0, 30) + '...'}`);
        continue;
      }
      
      // Generate fingerprint for deduplication
      const fingerprint = generateQuestionFingerprint(question.question, question.tags || []);
      
      // Check if this question already exists
      const exists = await checkQuestionExists(fingerprint);
      if (exists) {
        logger.info('[GENERATOR]', `Skipping duplicate question: ${question.question.substring(0, 30) + '...'}`);
        continue;
      }
      
      // Prepare question for insertion
      const {
        question: questionText,
        answers,
        category,
        subtopic,
        branch,
        difficulty,
        learningCapsule,
        tags,
        tone,
        format,
        source,
        created_at
      } = question;
      
      // Map answers to the required format for trivia_questions
      const answerChoices = answers.map(a => a.text);
      const correctAnswer = answers.find(a => a.isCorrect)?.text || answerChoices[0];
      
      // Insert the question
      const tableName = targetTable || getTriviaTableName();
      const { error } = await supabase
        .from(tableName)
        .insert({
          id: 'gen_' + Math.random().toString(36).substring(2, 10), // Generate a unique text ID
          question_text: questionText,
          answer_choices: answerChoices,
          correct_answer: correctAnswer,
          difficulty: difficulty || 'medium',
          language: 'en', // Default to English
          topic: category, // Map category to topic
          subtopic: subtopic || '', // Use provided subtopic or default empty
          branch: branch || '', // Use provided branch or default empty
          tags: tags || [],
          tone: tone || 'neutral', // Use provided tone or default
          format: format || 'multiple_choice', // Use provided format or default
          learning_capsule: learningCapsule || '',
          source: source || 'generated',
          created_at: created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          fingerprint: fingerprint // Store the fingerprint for future deduplication
        });
      
      // Log the insert operation
      logDbOperation(
        'sent',
        tableName,
        'insert',
        1,
        {
          question_text: questionText?.substring(0, 50) + '...',
          topic: category,
          subtopic: subtopic,
          difficulty: difficulty || 'medium'
        },
        'generator',
        error ? 'error' : 'success',
        error?.message
      );
      
      if (error) {
        logger.error('[GENERATOR]', 'Error saving question:', error instanceof Error ? error.message : String(error));
        
        // If the error is due to missing fingerprint column, try again without it
        if (error.message.includes('column "fingerprint" does not exist')) {
          logger.info('[GENERATOR]', 'Fingerprint column not found, retrying without fingerprint');
          
          // Retry insert without fingerprint column
          const { error: retryError } = await supabase
            .from(tableName)
            .insert({
              id: 'gen_' + Math.random().toString(36).substring(2, 10),
              question_text: questionText,
              answer_choices: answerChoices,
              correct_answer: correctAnswer,
              difficulty: difficulty || 'medium',
              language: 'en',
              topic: category,
              subtopic: subtopic || '',
              branch: branch || '',
              tags: tags || [],
              tone: tone || 'neutral',
              format: format || 'multiple_choice',
              learning_capsule: learningCapsule || '',
              source: source || 'generated',
              created_at: created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          // Log the retry insert operation  
          logDbOperation(
            'sent',
            tableName,
            'insert',
            1,
            {
              question_text: questionText?.substring(0, 50) + '...',
              topic: category,
              subtopic: subtopic,
              difficulty: difficulty || 'medium',
              retry: true
            },
            'generator',
            retryError ? 'error' : 'success',
            retryError?.message
          );
            
          if (retryError) {
            logger.error('[GENERATOR]', 'Error in retry save without fingerprint:', retryError instanceof Error ? retryError.message : String(retryError));
            continue;
          }
        } else {
          continue; // Skip this question if there was a non-fingerprint error
        }
      }
      
      savedCount++;
      logger.info('[GENERATOR]', `Saved question with fingerprint: ${question.question.substring(0, 30) + '...'}`);
    }
    
    return savedCount;
  } catch (error) {
    logger.error('[GENERATOR]', 'Error saving unique questions:', error instanceof Error ? error.message : String(error));
    return 0;
  }
}

 