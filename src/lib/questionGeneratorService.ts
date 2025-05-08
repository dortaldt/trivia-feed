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
      const category = item.topic || item.category || 'Unknown'; // Add fallback value
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

/**
 * Check if question generation should be triggered
 * Returns an object with information about why generation should occur
 */
export async function shouldGenerateQuestions(userId: string): Promise<{
  shouldGenerate: boolean;
  reason?: 'milestone_5' | 'milestone_10' | 'topic_threshold' | 'none';
  answerCount?: number;
  lowTopics?: string[];
}> {
  try {
    if (!userId) {
      return { shouldGenerate: false, reason: 'none' };
    }
    
    // Check if user has answered at least 5 questions
    const { count: answerCount, error: countError } = await supabase
      .from('user_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (countError) {
      console.error('[GENERATOR] Error checking user answer count:', countError);
      return { shouldGenerate: false, reason: 'none' };
    }
    
    // Not enough answers yet - strict check
    if (!answerCount || answerCount < 5) {
      return { shouldGenerate: false, reason: 'none', answerCount: answerCount || 0 };
    }
    
    // Check for fixed milestone triggers (exactly 5 or exactly 10 questions)
    if (answerCount === 5) {
      console.log('[GENERATOR] Milestone: User answered exactly 5 questions, triggering generation');
      return { 
        shouldGenerate: true, 
        reason: 'milestone_5', 
        answerCount 
      };
    }
    
    if (answerCount === 10) {
      console.log('[GENERATOR] Milestone: User answered exactly 10 questions, triggering generation');
      return { 
        shouldGenerate: true, 
        reason: 'milestone_10', 
        answerCount 
      };
    }
    
    // Get recent topics from answered questions
    const recentTopics = await getRecentAnsweredTopics(userId);
    if (!recentTopics.length) {
      return { shouldGenerate: false, reason: 'none', answerCount };
    }
    
    // Get question counts for each topic
    const topicCounts = await getTopicQuestionCounts();
    if (Object.keys(topicCounts).length === 0) {
      return { shouldGenerate: false, reason: 'none', answerCount };
    }
    
    // Check if any recent topic has fewer than 10 questions
    const lowTopics: string[] = [];
    for (const topic of recentTopics) {
      if (!topicCounts[topic] || topicCounts[topic] < 10) {
        lowTopics.push(topic);
      }
    }
    
    if (lowTopics.length > 0) {
      console.log(`[GENERATOR] Topics below threshold: ${lowTopics.join(', ')}, triggering generation`);
      return { 
        shouldGenerate: true, 
        reason: 'topic_threshold', 
        answerCount,
        lowTopics
      };
    }
    
    return { shouldGenerate: false, reason: 'none', answerCount };
  } catch (error) {
    console.error('[GENERATOR] Error checking if questions should be generated:', error);
    return { shouldGenerate: false, reason: 'none' };
  }
}

/**
 * Run the question generation process and save results to database
 */
export async function runQuestionGeneration(userId: string): Promise<boolean> {
  try {
    // Step 1: Check if we should generate questions
    const generationCheck = await shouldGenerateQuestions(userId);
    if (!generationCheck.shouldGenerate) {
      // Don't log anything, just return false
      return false;
    }
    
    console.log(`[GENERATOR] Starting generation for user ${userId}`);
    
    // Step 2: Get primary topics (recent + top user topics)
    const recentTopics = await getRecentAnsweredTopics(userId);
    const topUserTopics = await getUserTopTopics(userId);
    
    // Combine and deduplicate
    const primaryTopics = Array.from(new Set([...recentTopics, ...topUserTopics]));
    
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
    let reason = '';
    switch (generationCheck.reason) {
      case 'milestone_5':
        reason = 'Milestone: 5 questions answered';
        break;
      case 'milestone_10':
        reason = 'Milestone: 10 questions answered';
        break;
      case 'topic_threshold':
        reason = `Topics below threshold: ${generationCheck.lowTopics?.join(', ')}`;
        break;
      default:
        reason = 'General update';
    }
    
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

    // Step 4: Generate questions
    const generatedQuestions = await generateQuestions(
      primaryTopics,
      uniqueAdjacentTopics,
      20, // 20 questions from primary topics
      10  // 10 questions from adjacent topics
    );
    
    // Step 5: Filter out duplicates and save to database
    const savedCount = await saveUniqueQuestions(generatedQuestions);
    
    console.log(`[GENERATOR] Generated ${generatedQuestions.length} questions, saved ${savedCount}`);
    
    // Log generation results
    logGeneratorEvent(
      userId,
      primaryTopics,
      uniqueAdjacentTopics,
      generatedQuestions.length,
      savedCount,
      savedCount > 0,
      undefined,
      `completed - ${reason}`
    );
    
    return savedCount > 0;
  } catch (error) {
    // Log error event
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
    
    for (const question of questions) {
      // Generate fingerprint for deduplication
      const fingerprint = generateQuestionFingerprint(question.question, question.tags || []);
      
      // Check if this question already exists
      const exists = await checkQuestionExists(fingerprint);
      if (exists) {
        continue;
      }
      
      // Prepare question for insertion
      const {
        question: questionText,
        answers,
        category,
        difficulty,
        learningCapsule,
        tags,
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
          subtopic: '', // Default empty subtopic
          branch: '', // Default empty branch
          tags: tags || [],
          tone: 'neutral', // Default tone
          format: 'multiple_choice', // Default format for generated questions
          learning_capsule: learningCapsule || '',
          source: source || 'generated',
          created_at: created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('[GENERATOR] Error saving question:', error);
        continue;
      }
      
      savedCount++;
    }
    
    return savedCount;
  } catch (error) {
    console.error('[GENERATOR] Error saving unique questions:', error);
    return 0;
  }
} 