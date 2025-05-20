import { supabase } from './supabaseClient';
import { generateQuestions, generateQuestionFingerprint, checkQuestionExists, GeneratedQuestion } from './openaiService';
import { dbEventEmitter, logGeneratorEvent } from './syncService';

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
interface UserProfile {
  id: string;
  topics: Record<string, { weight: number }>;
  topic_weights?: Record<string, number>; // Legacy format
  subtopics?: Record<string, { topic: string, weight: number }>; // Added for subtopic weights
  recentGenerationTopics?: string[]; // Added for cyclic selection tracking
  [key: string]: any;
}

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
    const { data, error } = await supabase
      .from('trivia_questions')
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
    console.error('[GENERATOR] Error getting topic question counts:', error);
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
      console.error('[GENERATOR] Error getting recent answers:', answerError);
      return [];
    }
    
    if (!answerData || answerData.length === 0) {
      return [];
    }
    
    // Extract question IDs
    const questionIds = answerData.map((item: { question_id: string }) => item.question_id);
    
    // Now get the categories for these questions with a separate query
    const { data: questionData, error: questionError } = await supabase
      .from('trivia_questions')
      .select('id, topic')
      .in('id', questionIds);
    
    if (questionError) {
      console.error('[GENERATOR] Error getting question categories:', questionError);
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
    console.error('[GENERATOR] Error getting recent answered topics:', error);
    return [];
  }
}

/**
 * Get user's top topics based on scores
 */
export async function getUserTopTopics(userId: string, scoreThreshold: number = 0.5): Promise<string[]> {
  try {
    // Just return a default set of popular topics since topic_weights doesn't exist
    console.log('[GENERATOR] Using default topics (topic_weights not available)');
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
    console.error('[GENERATOR] Error getting user top topics:', error);
    return [];
  }
}

// Track the last generation time for each user
const lastGenerationTimes: Record<string, { timestamp: number, answerCount: number }> = {};

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
    const { data, error } = await supabase
      .from('trivia_questions')
      .select('question_text, topic')
      .in('topic', topics);
      
    if (error) {
      console.error('[GENERATOR] Error fetching topic intents:', error);
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
        console.warn('[GENERATOR] Error extracting intent:', e);
      }
    });
    
    return topicIntents;
  } catch (error) {
    console.error('[GENERATOR] Error getting topic intents:', error);
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
    console.log('[GENERATOR] Checking if questions should be generated for user:', userId);
    
    if (!userId) {
      console.log('[GENERATOR] No user ID provided, skipping generation check');
      return { shouldGenerate: false, reason: 'none' };
    }
    
    // Get the total number of questions answered by this user
    const { count: answerCount, error: countError } = await supabase
      .from('user_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    console.log('[GENERATOR] Found user answer count:', answerCount);
    
    if (countError) {
      console.error('[GENERATOR] Error checking user answer count:', countError);
      return { shouldGenerate: false, reason: 'none' };
    }
    
    // Not enough answers yet
    if (!answerCount || answerCount < 1) {
      console.log('[GENERATOR] Not enough questions answered yet:', answerCount);
      return { shouldGenerate: false, reason: 'none', answerCount: answerCount || 0 };
    }
    
    // Check if we've recently generated questions for this milestone
    const lastGeneration = lastGenerationTimes[userId];
    if (lastGeneration) {
      // Check if we've already generated for this milestone (same answer count)
      if (lastGeneration.answerCount === answerCount) {
        console.log(`[GENERATOR] Already generated questions for milestone ${answerCount}, skipping`);
        return { shouldGenerate: false, reason: 'none', answerCount };
      }
      
      // Check if we've recently generated (within the last 10 seconds)
      const timeSinceLastGeneration = Date.now() - lastGeneration.timestamp;
      if (timeSinceLastGeneration < 10000) { // 10 seconds
        console.log(`[GENERATOR] Generated questions recently (${timeSinceLastGeneration}ms ago), throttling`);
        return { shouldGenerate: false, reason: 'none', answerCount };
      }
    }
    
    // COMMENT OUT FOR PRODUCTION - DEBUG ONLY
    // Force question generation for testing purposes
    // console.log('[GENERATOR] DEBUG: Will generate questions regardless of count');
    // lastGenerationTimes[userId] = { timestamp: Date.now(), answerCount: answerCount || 0 };
    // return { 
    //   shouldGenerate: true, 
    //   reason: 'question_count', 
    //   answerCount 
    // };
    
    // Generate new questions every 6 questions answered
    if (answerCount > 0 && answerCount % 6 === 0) {
      console.log(`[GENERATOR] User answered ${answerCount} questions (multiple of 6), triggering generation`);
      
      // Record generation time and count
      lastGenerationTimes[userId] = { timestamp: Date.now(), answerCount: answerCount || 0 };
      
      return { 
        shouldGenerate: true, 
        reason: 'question_count', 
        answerCount 
      };
    }
    
    // No other triggers - not a multiple of 6
    console.log(`[GENERATOR] User answered ${answerCount} questions (not a multiple of 6), skipping generation`);
    return { shouldGenerate: false, reason: 'none', answerCount };
  } catch (error) {
    console.error('[GENERATOR] Error checking if questions should be generated:', error);
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
  recentQuestions?: {id: string, questionText: string}[] // Add parameter for recent questions
): Promise<boolean> {
  try {
    // Ensure user ID is valid
    if (!userId) {
      console.error('[GENERATOR] Invalid user ID');
        return false;
      }
    
    // Step 1: Get recent questions to avoid duplication
    let validRecentQuestions: {id: string, questionText: string, topic?: string, subtopic?: string, branch?: string, tags?: string[]}[] = [];
    
    if (recentQuestions && recentQuestions.length > 0) {
      // Client provided recent questions - use those
      console.log(`[GENERATOR] Using ${recentQuestions.length} client-provided recent questions`);
      validRecentQuestions = recentQuestions;
      
      // Log a sample for verification
      validRecentQuestions.slice(0, 3).forEach((q, i) => {
        console.log(`[GENERATOR] Recent question ${i+1}: ${q.questionText.substring(0, 50)}...`);
      });
    } else {
      // No client-provided questions, fetch from database
      try {
        // Get IDs of questions answered by the user
        const { data: answerData, error: answerError } = await supabase
          .from('user_answers')
          .select('question_id')
          .eq('user_id', userId)
          .order('answered_at', { ascending: false })
          .limit(10);
          
        if (answerError) {
          console.error('[GENERATOR] Error fetching recent answers:', answerError);
        } else if (answerData && answerData.length > 0) {
          // Get question texts for these IDs
          const questionIds = answerData.map((a: any) => a.question_id);
          
          const { data: questionData, error: questionError } = await supabase
            .from('trivia_questions')
            .select('id, question_text, question, topic, subtopic, branch, tags')
            .in('id', questionIds);
            
          if (questionError) {
            console.error('[GENERATOR] Error fetching recent questions:', questionError);
          } else if (questionData && questionData.length > 0) {
            // Map to correct format
            validRecentQuestions = questionData.map((q: any) => ({
              id: q.id,
              questionText: q.question_text || q.question || '',
              topic: q.topic,
              subtopic: q.subtopic,
              branch: q.branch,
              tags: q.tags
            }));
            
            console.log(`[GENERATOR] Found ${validRecentQuestions.length} recent questions from database`);
          }
        }
      } catch (error) {
        console.error('[GENERATOR] Error getting recent questions:', error);
      }
    }
    
    // Enhance recent questions - if we have basic ones without hierarchical data
    if (validRecentQuestions.length > 0) {
      // If any recent questions are missing hierarchy data (topic, subtopic, branch), 
      // try to fetch the complete data from the database
      const incompleteQuestions = validRecentQuestions.filter(q => !q.topic || !q.subtopic || !q.branch);
      
      if (incompleteQuestions.length > 0) {
        console.log(`[GENERATOR] Enhancing ${incompleteQuestions.length} questions with missing hierarchy data`);
        
        try {
          const questionIds = incompleteQuestions.map(q => q.id);
          const { data, error } = await supabase
            .from('trivia_questions')
            .select('id, topic, subtopic, branch, tags')
            .in('id', questionIds);
            
          if (error) {
            console.error('[GENERATOR] Error fetching hierarchy data:', error);
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
            
            console.log('[GENERATOR] Successfully enhanced recent questions with hierarchy data');
          }
        } catch (error) {
          console.error('[GENERATOR] Error enhancing questions with hierarchy data:', error);
        }
      }
    }
    
    // Step 2: Get primary topics (recent + top user topics) - or use forced topics
    let primaryTopics: string[] = [];
    if (forcedTopics && forcedTopics.length > 0) {
      primaryTopics = forcedTopics;
      console.log('[GENERATOR] Using forced topics:', primaryTopics);
    } else {
      try {
        // Import the user profile fetching function
        const { fetchUserProfile } = await import('./syncService');
        
        // Get user profile to extract top weighted topics
        const userProfile = await fetchUserProfile(userId);
        
        // Step 2.1: Get the most recent answered questions - higher priority
        const recentTopics = await getRecentAnsweredTopics(userId, 10); // Get more recent topics
        console.log('[GENERATOR] Most recent answered topics (highest priority):', recentTopics);
        
        // Step 2.2: Extract weighted topics from user profile
        const weightedTopics: {name: string, weight: number}[] = [];
        if (userProfile && userProfile.topics) {
          // Convert topics object to array of {name, weight} pairs
          weightedTopics.push(
            ...Object.entries(userProfile.topics)
              .map(([name, data]) => ({ name, weight: data.weight || 0 }))
              .sort((a, b) => b.weight - a.weight) // Sort by weight descending
          );
          
          // Log the weights from the profile for verification
          console.log('[GENERATOR] User profile topic weights:', 
            weightedTopics.slice(0, 10).map(t => `${t.name} (${t.weight.toFixed(2)})`));
        }
        
        // Step 2.3: Create a balanced prioritized topic list
        // Create a score map for topics, combining recency and weight
        const topicScores: Record<string, number> = {};
        
        // Score recent topics (0.5 points for each, with most recent getting more)
        recentTopics.forEach((topic, index) => {
          // Reverse index so most recent gets highest score
          const recencyScore = 0.5 * (recentTopics.length - index) / recentTopics.length;
          topicScores[topic] = (topicScores[topic] || 0) + recencyScore;
          console.log(`[GENERATOR] Topic ${topic} recency score: ${recencyScore.toFixed(2)}`);
        });
        
        // Score weighted topics (direct weight value from profile)
        weightedTopics.forEach(topic => {
          // Weight score (0-1 from profile)
          topicScores[topic.name] = (topicScores[topic.name] || 0) + topic.weight;
          console.log(`[GENERATOR] Topic ${topic.name} weight score: ${topic.weight.toFixed(2)}`);
        });
        
        // Calculate final scores and sort
        const scoredTopics = Object.entries(topicScores)
          .map(([topic, score]) => ({ topic, score }))
          .sort((a, b) => b.score - a.score);
          
        console.log('[GENERATOR] Combined topic scores:', 
          scoredTopics.map(t => `${t.topic}: ${t.score.toFixed(2)}`));
        
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
            console.log('[GENERATOR] Found subtopics from high-weight topics:', 
              subtopicWeights.slice(0, 5).map(s => `${s.topic}/${s.subtopic}: ${s.weight.toFixed(2)}`));
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
          
          console.log('[GENERATOR] Created combined topic:subtopic entries:', combinedTopics);
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
            console.log('[GENERATOR] Found branches from profile:', 
              branchWeights.slice(0, 3).map(b => `${b.topic}/${b.branch}: ${b.weight.toFixed(2)}`));
              
            // Add top branches to combined topics list
            const sortedBranchWeights = [...branchWeights].sort((a, b) => b.weight - a.weight);
            
            // Take top 2 branches and create combined format
            sortedBranchWeights.slice(0, 2).forEach(item => {
              // Create a topic:branch format
              combinedTopics.push(`${item.topic}:${item.branch}`);
            });
            
            console.log('[GENERATOR] Created combined topic:branch entries:', 
              combinedTopics.filter(t => t.includes(':') && !subtopicWeights.some(s => t.endsWith(s.subtopic))));
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
          
          console.log('[GENERATOR] Final topics with hierarchical combinations:', primaryTopics);
        }
        
        // Log final selection for verification
        console.log('[GENERATOR] Final prioritized topics in order of importance:', primaryTopics);
      } catch (error) {
        console.error('[GENERATOR] Error getting personalized topics:', error);
        // Fallback to default topics on error
        primaryTopics = ['Science', 'History', 'Geography'];
      }
    }
    
    // If we still don't have any topics, use defaults
    if (primaryTopics.length === 0) {
      primaryTopics = ['Science', 'History', 'Geography'];
      console.log('[GENERATOR] Using default topics (no topics available)');
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
    
    console.log(`[GENERATOR] Primary topics: ${primaryTopics.join(', ')}`);
    console.log(`[GENERATOR] Adjacent topics: ${uniqueAdjacentTopics.join(', ')}`);
    
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
        let userProfile: UserProfile | null;
        try {
          const { fetchUserProfile } = await import('./syncService');
          userProfile = await fetchUserProfile(userId);
        } catch (e) {
          console.error('[GENERATOR] Error importing or fetching user profile:', e);
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
          
          console.log('[GENERATOR] Top weighted subtopics:', 
            topSubtopics.map(s => `${s.topic}/${s.subtopic} (${s.weight.toFixed(2)})`));
          console.log('[GENERATOR] Top weighted branches:', 
            topBranches.map(b => `${b.topic}/${b.subtopic}/${b.branch} (${b.weight.toFixed(2)})`));
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
            const { data: questionData } = await supabase
              .from('trivia_questions')
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
            
            console.log('[GENERATOR] Top tags from recent questions:', topTags);
          }
        } catch (error) {
          console.error('[GENERATOR] Error fetching question tags:', error);
        }
      } catch (error) {
        console.error('[GENERATOR] Error extracting subtopics and branches:', error);
      }
    }
    
    // Use client-side data if provided, otherwise use data from database/profile
    const finalSubtopics: string[] = [];
    const finalBranches: string[] = [];
    const finalTags: string[] = [];
    
    // PRIORITY 1: Use client-side data if provided (highest priority)
    if (clientSubtopics && clientSubtopics.length > 0) {
      console.log('[GENERATOR] Using client-side subtopics:', clientSubtopics);
      finalSubtopics.push(...clientSubtopics);
    } else {
      // Otherwise use profile data
      finalSubtopics.push(...topSubtopics.map(s => s.subtopic));
    }
    
    if (clientBranches && clientBranches.length > 0) {
      console.log('[GENERATOR] Using client-side branches:', clientBranches);
      finalBranches.push(...clientBranches);
    } else {
      // Otherwise use profile data
      finalBranches.push(...topBranches.map(b => b.branch));
    }
    
    if (clientTags && clientTags.length > 0) {
      console.log('[GENERATOR] Using client-side tags:', clientTags);
      finalTags.push(...clientTags);
    } else {
      // Otherwise use database tags
      finalTags.push(...topTags);
    }
    
    // If profile data is provided, get all the usual profile-based subtopics/branches
    if (!forcedTopics || forcedTopics.length === 0) {
      try {
        // Import the user profile fetching function if not already imported
        let userProfile: UserProfile | null;
        try {
          const { fetchUserProfile } = await import('./syncService');
          userProfile = await fetchUserProfile(userId);
        } catch (e) {
          console.error('[GENERATOR] Error importing or fetching user profile:', e);
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
              console.log('[GENERATOR] Using profile subtopics:', finalSubtopics);
            }
            
            // If we don't have branches yet, add them from profile
            if (finalBranches.length === 0) {
              const sortedBranches = allBranches.sort((a, b) => b.weight - a.weight).slice(0, 5);
              finalBranches.push(...sortedBranches.map(b => b.branch));
              console.log('[GENERATOR] Using profile branches:', finalBranches);
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
              const { data: questionData } = await supabase
                .from('trivia_questions')
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
              
              console.log('[GENERATOR] Using database tags:', finalTags);
            }
          } catch (error) {
            console.error('[GENERATOR] Error fetching question tags:', error);
          }
        }
      } catch (error) {
        console.error('[GENERATOR] Error extracting subtopics and branches:', error);
      }
    }
    
    // Step 4: Build topic-intent combinations to avoid
    const avoidIntentsSection = await buildAvoidTopicIntentsSection(primaryTopics);
    
    // Step 5: Call the OpenAI service for generation
    try {
      // Ensure we have at least some primary topics
      if (primaryTopics.length === 0) {
        primaryTopics = ['General Knowledge', 'Trivia'];
        console.log('[GENERATOR] Using fallback topics as no primary topics were found');
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
            
            console.log('[GENERATOR] Ordered primary topics by weight:', primaryTopics);
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
                
                topicAnswers.forEach(answer => {
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
                  console.log('[GENERATOR] Added top subtopics for exploration:', sortedSubtopics);
                }
              }
            } catch (subtopicError) {
              console.error('[GENERATOR] Error fetching subtopics for top topic:', subtopicError);
            }
          }
        }
      } catch (profileError) {
        console.error('[GENERATOR] Error processing user profile for subtopics:', profileError);
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

      // Build avoid section for topic-intent combinations
      const avoidIntentsSection = await buildAvoidTopicIntentsSection(primaryTopics);
      
      // Generate questions
      console.log('[GENERATOR] Calling OpenAI with preferred subtopics:', preferredSubtopics);
      const generatedQuestions = await generateQuestions(
        primaryTopics,
        adjacentTopics,
        6, // primaryCount
        6, // adjacentCount
        preferredSubtopics,
        preferredBranches,
        preferredTags,
        enhancedRecentQuestions,
        avoidIntentsSection
      );

      // Step 6: Filter out duplicates and save to database
      const savedCount = await saveUniqueQuestions(generatedQuestions);
    
      console.log(`[GENERATOR] Generated ${generatedQuestions.length} questions, saved ${savedCount}`);
    
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
      console.error('[GENERATOR] Error during question generation:', error);
      
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
    console.error('[GENERATOR] Error during question generation:', error);
    
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
async function saveUniqueQuestions(questions: GeneratedQuestion[]): Promise<number> {
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
    for (const [answer, answerQuestions] of questionsByAnswer.entries()) {
      // If we have multiple questions with the same answer, further analyze them
      if (answerQuestions.length > 1) {
        console.log(`[GENERATOR] Analyzing ${answerQuestions.length} questions with answer "${answer}"`);
        
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
              console.log(`[GENERATOR] Duplicate detected with similarity ${similarity.toFixed(2)}:`);
              console.log(`  - Main: ${mainQuestion.question}`);
              console.log(`  - Dupe: ${compareQuestion.question}`);
              
              // Mark this question as a duplicate
              compareQuestion.isDuplicate = true;
            }
          } catch (e) {
            console.warn('[GENERATOR] Error comparing fingerprints:', e);
          }
        }
      }
    }
    
    // Third pass: process all questions, skipping marked duplicates
    for (const question of questions) {
      // Skip questions marked as duplicates
      if ((question as any).isDuplicate) {
        console.log('[GENERATOR] Skipping duplicate question:', question.question.substring(0, 30) + '...');
        continue;
      }
      
      // Generate fingerprint for deduplication
      const fingerprint = generateQuestionFingerprint(question.question, question.tags || []);
      
      // Check if this question already exists
      const exists = await checkQuestionExists(fingerprint);
      if (exists) {
        console.log('[GENERATOR] Skipping duplicate question:', question.question.substring(0, 30) + '...');
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
      const { error } = await supabase
        .from('trivia_questions')
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
      
      if (error) {
        console.error('[GENERATOR] Error saving question:', error);
        
        // If the error is due to missing fingerprint column, try again without it
        if (error.message.includes('column "fingerprint" does not exist')) {
          console.log('[GENERATOR] Fingerprint column not found, retrying without fingerprint');
          
          // Retry insert without fingerprint column
          const { error: retryError } = await supabase
            .from('trivia_questions')
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
            
          if (retryError) {
            console.error('[GENERATOR] Error in retry save without fingerprint:', retryError);
            continue;
          }
        } else {
          continue; // Skip this question if there was a non-fingerprint error
        }
      }
      
      savedCount++;
      console.log('[GENERATOR] Saved question with fingerprint:', question.question.substring(0, 30) + '...');
    }
    
    return savedCount;
  } catch (error) {
    console.error('[GENERATOR] Error saving unique questions:', error);
    return 0;
  }
}

/**
 * Build a section for the OpenAI prompt that lists topic-intent combinations to avoid
 */
async function buildAvoidTopicIntentsSection(topics: string[]): Promise<string> {
  try {
    // Get existing topic-intent combinations
    const topicIntents = await getExistingTopicIntents(topics);
    
    // Create intent avoidance section for the prompt
    let avoidIntentsSection = '';
    if (topicIntents.size > 0) {
      const topicIntentStrings = [];
      
      for (const [topic, intents] of topicIntents.entries()) {
        if (intents.size > 0) {
          topicIntentStrings.push(`${topic}: ${Array.from(intents).join(', ')}`);
        }
      }
      
      if (topicIntentStrings.length > 0) {
        avoidIntentsSection = `
    AVOID THESE TOPIC-INTENT COMBINATIONS (these already exist in our database):
    ${topicIntentStrings.join('\n    ')}
    
    For these topics, create questions with DIFFERENT intents than those listed above.
    `;
      }
    }
    
    return avoidIntentsSection;
  } catch (error) {
    console.error('[GENERATOR] Error building avoid intents section:', error);
    return '';
  }
} 