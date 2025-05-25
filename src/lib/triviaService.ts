import { supabase } from './supabaseClient';
import { getTopicColor } from './colors';
import { getStandardizedTopicName } from '../constants/topics';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Get topic configuration from app config
const { activeTopic, filterContentByTopic, topicDbName } = Constants.expoConfig?.extra || {};
console.log(`TriviaService initialized with topic: ${activeTopic || 'default'}`);
console.log(`Content filtering: ${filterContentByTopic ? 'Enabled' : 'Disabled'}`);
if (filterContentByTopic && activeTopic !== 'default' && topicDbName) {
  console.log(`Will filter questions by topic: ${topicDbName}`);
}

// Define the type of trivia question from Supabase
export interface TriviaQuestion {
  id: string;
  question_text?: string;
  question?: string;
  answer_choices?: string[];
  answers?: {text: string, isCorrect: boolean}[];
  correct_answer?: string;
  difficulty?: string;
  topic?: string;
  subtopic?: string;
  branch?: string;
  category?: string;
  image_url?: string;
  learning_capsule?: string;
  explanation?: string;
  tags?: string[];
  language?: string;
}

// Define the app's feed item format that matches our existing components
export interface FeedItem {
  id: string;
  topic: string;
  question: string;
  answers: {
    text: string;
    isCorrect: boolean;
  }[];
  difficulty: string;
  likes: number;
  views: number;
  backgroundColor: string;
  learningCapsule: string;
  tags?: string[];
  subtopic?: string;
  branch?: string;
}

// Add a new interface to track question generation events
export interface GeneratorEvent {
  timestamp: number;
  userId: string;
  primaryTopics: string[];
  adjacentTopics: string[];
  questionsGenerated: number;
  questionsSaved: number;
  success: boolean;
  error?: string;
  status?: string; // Add status field for 'starting', etc.
}

// Mock data to use if Supabase fails
const mockFeedData: FeedItem[] = [
  {
    id: '1',
    topic: 'Science',
    question: 'What is the closest star to Earth?',
    answers: [
      { text: 'The Sun', isCorrect: true },
      { text: 'Proxima Centauri', isCorrect: false },
      { text: 'Alpha Centauri', isCorrect: false },
      { text: 'Sirius', isCorrect: false }
    ],
    difficulty: 'Easy',
    likes: 1245,
    views: 5800,
    backgroundColor: getTopicColor('Science'),
    learningCapsule: 'The Sun is about 93 million miles (150 million km) from Earth and is a G-type main-sequence star.'
  },
  {
    id: '2',
    topic: 'History',
    question: 'Who was the first President of the United States?',
    answers: [
      { text: 'George Washington', isCorrect: true },
      { text: 'Thomas Jefferson', isCorrect: false },
      { text: 'John Adams', isCorrect: false },
      { text: 'Benjamin Franklin', isCorrect: false }
    ],
    difficulty: 'Easy',
    likes: 842,
    views: 3200,
    backgroundColor: getTopicColor('History'),
    learningCapsule: 'George Washington served as the first President from 1789 to 1797 and is often called the "Father of His Country".'
  },
  {
    id: '3',
    topic: 'Geography',
    question: 'What is the largest ocean on Earth?',
    answers: [
      { text: 'The Pacific Ocean', isCorrect: true },
      { text: 'The Atlantic Ocean', isCorrect: false },
      { text: 'The Indian Ocean', isCorrect: false },
      { text: 'The Arctic Ocean', isCorrect: false }
    ],
    difficulty: 'Medium',
    likes: 756,
    views: 2900,
    backgroundColor: getTopicColor('Geography'),
    learningCapsule: 'The Pacific Ocean covers more than 30% of Earth\'s surface and contains more than half of the free water on Earth.'
  }
];

// Function to inspect table structure
async function inspectTableStructure() {
  try {
    console.log('Inspecting trivia_questions table structure...');
    // Get a sample row to analyze the structure
    const { data, error } = await supabase
      .from('trivia_questions')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Error fetching sample data:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const sample = data[0];
      console.log('Sample row fields:', Object.keys(sample));
      
      // Log specific important fields
      console.log('Question field:', sample.question_text || sample.question || 'not found');
      console.log('Answer choices:', sample.answer_choices ? 
        (Array.isArray(sample.answer_choices) ? 'array with ' + sample.answer_choices.length + ' items' : typeof sample.answer_choices) : 'not found');
      console.log('Correct answer:', sample.correct_answer || 'not found');
      console.log('Full sample:', JSON.stringify(sample, null, 2));
    } else {
      console.log('No sample data found');
    }
  } catch (e) {
    console.error('Error during inspection:', e);
  }
}

// Function to specifically analyze correct answers format in the database
export async function analyzeCorrectAnswers() {
  try {
    console.log('Analyzing correct answer formats in database...');
    
    // Fetch a few questions to analyze
    const { data, error } = await supabase
      .from('trivia_questions')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error fetching data for analysis:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No data found for analysis');
      return;
    }
    
    // Analyze each question
    data.forEach((question: TriviaQuestion, index: number) => {
      console.log(`\n--- Question ${index + 1} ---`);
      console.log(`Question: ${question.question_text || question.question || 'unknown'}`);
      
      // Check answer_choices format
      if (question.answer_choices) {
        console.log(`answer_choices type: ${typeof question.answer_choices}`);
        if (Array.isArray(question.answer_choices)) {
          console.log(`answer_choices: [${question.answer_choices.join(', ')}]`);
        } else {
          console.log(`answer_choices: ${JSON.stringify(question.answer_choices)}`);
        }
      } else {
        console.log('answer_choices: not present');
      }
      
      // Check correct_answer format
      if (question.correct_answer) {
        console.log(`correct_answer type: ${typeof question.correct_answer}`);
        console.log(`correct_answer: ${question.correct_answer}`);
        
        // Check if correct_answer matches any of the answer_choices
        if (Array.isArray(question.answer_choices)) {
          const foundIndex = question.answer_choices.findIndex(
            (choice: string | any) => String(choice) === String(question.correct_answer)
          );
          
          if (foundIndex !== -1) {
            console.log(`MATCH: correct_answer matches answer_choices[${foundIndex}]`);
          } else {
            console.log('WARNING: correct_answer does not match any answer_choices');
            console.log('This might indicate a data issue or a string format difference');
            
            // Try more lenient matching to debug
            const possibleMatches = question.answer_choices.map((choice: string | any, idx: number) => {
              return {
                index: idx,
                choice: String(choice),
                similarity: String(choice).toLowerCase().includes(String(question.correct_answer).toLowerCase()) ||
                            String(question.correct_answer).toLowerCase().includes(String(choice).toLowerCase())
              };
            }).filter((m: {similarity: boolean}) => m.similarity);
            
            if (possibleMatches.length > 0) {
              console.log('Possible partial matches:', possibleMatches);
            }
          }
        }
      } else {
        console.log('correct_answer: not present');
      }
    });
    
  } catch (e) {
    console.error('Error during correct answer analysis:', e);
  }
}

/**
 * Fisher-Yates shuffle algorithm to randomize array elements
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  // Create a copy of the array to avoid mutating the original
  const shuffled = [...array];
  
  // Fisher-Yates algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Function to fetch trivia questions from Supabase
export async function fetchTriviaQuestions(limit: number = 20, language: string = 'English'): Promise<FeedItem[]> {
  // Note: Caching of trivia questions is implemented in the FeedScreen component
  // using AsyncStorage to improve loading performance and provide offline capability
  try {
    console.log('DEBUG: Starting to fetch data from Supabase - requesting ALL questions');
    
    // Log basic info without accessing protected properties
    // @ts-ignore - We need to access this for debugging
    console.log(`DEBUG: Supabase URL being used: ${supabase?.url || supabase?.supabaseUrl || 'Unknown'}`);
    console.log(`DEBUG: Attempting to connect to Supabase database`);
    
    try {
      // Test the connection with a simple query
      const { count, error: pingError } = await supabase
        .from('trivia_questions')
        .select('*', { count: 'exact', head: true });
        
      if (pingError) {
        console.error('DEBUG: Connection test failed:', pingError);
        throw new Error(`Connection test failed: ${pingError.message}`);
      }
      
      console.log(`DEBUG: Connection test successful! Database has ${count} records in trivia_questions table.`);
    } catch (pingError) {
      console.error('DEBUG: Connection test error:', pingError);
      console.log('DEBUG: Falling back to mock data due to connection error');
      return mockFeedData;
    }
    
    // If we made it here, the connection test was successful, try to get actual data
    try {
      // First inspect the table structure
      await inspectTableStructure();
      
      // Get total count of records in the database
      const { count: totalCount, error: countError } = await supabase
        .from('trivia_questions')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Error getting total count:', countError);
        return mockFeedData;
      } else {
        console.log(`DEBUG: Total questions in database: ${totalCount}`);
      }
      
      // Start building the query
      console.log('DEBUG: Fetching questions from database...');
      let query = supabase
        .from('trivia_questions')
        .select('*');
      
      // Apply topic filter if configured
      if (filterContentByTopic && activeTopic !== 'default' && topicDbName) {
        console.log(`DEBUG: Filtering questions by topic: ${topicDbName}`);
        
        // Use the exact topic name from the database
        query = query.eq('topic', topicDbName);
      }
      
      // Execute the query
      const { data, error } = await query;

      console.log('DEBUG: Supabase response:', data ? `Got ${data.length} records` : 'No data', error ? `Error: ${error.message}` : 'No error');
      
      if (error) {
        console.error('Error fetching trivia questions:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return mockFeedData;
      }

      if (!data || data.length === 0) {
        console.warn('No trivia questions found, using mock data instead');
        return mockFeedData;
      }

      console.log('DEBUG: Successfully retrieved data from Supabase');
      
      // Log some stats about subtopics and tags when in topic-specific mode
      if (filterContentByTopic && activeTopic !== 'default') {
        // Track unique subtopics and tags
        const subtopics = new Set<string>();
        const allTags = new Set<string>();
        
        data.forEach((question: TriviaQuestion) => {
          if (question.subtopic) {
            subtopics.add(question.subtopic);
          }
          
          if (question.tags && Array.isArray(question.tags)) {
            question.tags.forEach(tag => allTags.add(tag));
          }
        });
        
        console.log(`DEBUG: Found ${subtopics.size} unique subtopics:`, Array.from(subtopics));
        console.log(`DEBUG: Found ${allTags.size} unique tags:`, Array.from(allTags));
      }
      
      // Transform the Supabase data to match our app's format
      return data.map((question: TriviaQuestion) => {
        // Determine the question text
        const questionText = question.question_text || question.question || 'Unknown question';
        
        // Handle answers - this is the critical part that needs adjustment based on inspection
        let answers: { text: string, isCorrect: boolean }[] = [];
        
        // Case 1: Pre-formatted answers array with isCorrect flags
        if (question.answers && Array.isArray(question.answers)) {
          answers = question.answers;
        }
        // Case 2: answer_choices array + separate correct_answer
        else if (question.answer_choices && Array.isArray(question.answer_choices)) {
          if (question.correct_answer) {
            const correctAnswerStr = String(question.correct_answer).trim();
            
            // Create a normalized version for comparison (lowercase, no punctuation)
            const normalizeString = (str: string): string => {
              return str.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                .replace(/\s+/g, " ")
                .trim();
            };
            
            const normalizedCorrectAnswer = normalizeString(correctAnswerStr);
            
            // Try three matching approaches:
            // 1. Exact string match
            // 2. Normalized string match (case insensitive, punctuation removed)
            // 3. Substring match (is correct answer contained in the choice or vice versa)
            answers = question.answer_choices.map((choice: any) => {
              const choiceStr = String(choice).trim();
              const normalizedChoice = normalizeString(choiceStr);
              
              // Try different matching strategies in order of strictness
              const exactMatch = choiceStr === correctAnswerStr;
              const normalizedMatch = normalizedChoice === normalizedCorrectAnswer;
              const substringMatch = normalizedChoice.includes(normalizedCorrectAnswer) || 
                                   normalizedCorrectAnswer.includes(normalizedChoice);
              
              return {
                text: choiceStr,
                isCorrect: exactMatch || normalizedMatch || substringMatch
              };
            });
            
            // Log for debugging
            console.log(`Question "${questionText}" - correct answer from DB: "${question.correct_answer}"`);
            
            // Check if we successfully marked any answer as correct
            const hasCorrectAnswer = answers.some(a => a.isCorrect);
            if (!hasCorrectAnswer) {
              console.warn(`Failed to identify correct answer for question "${questionText}". The correct_answer value "${question.correct_answer}" doesn't match any of the answer_choices.`);
              // Still need a correct answer, so mark the first one
              if (answers.length > 0) {
                answers[0].isCorrect = true;
              }
            } else if (answers.filter(a => a.isCorrect).length > 1) {
              // If we marked multiple answers as correct due to fuzzy matching, keep only the best match
              console.warn(`Multiple correct answers identified for question "${questionText}". Will select the best match.`);
              
              // Find the best match (prioritize exact match, then normalized, then substring)
              const exactMatches = answers.filter(a => String(a.text).trim() === correctAnswerStr);
              if (exactMatches.length === 1) {
                // Reset all to false, then set only the exact match
                answers.forEach(a => a.isCorrect = false);
                exactMatches[0].isCorrect = true;
                console.log(`Selected exact match: "${exactMatches[0].text}"`);
              } else {
                // Just keep the first correct answer we found
                const firstCorrectIndex = answers.findIndex(a => a.isCorrect);
                answers.forEach((a, i) => a.isCorrect = i === firstCorrectIndex);
                console.log(`Selected first matching answer: "${answers[firstCorrectIndex].text}"`);
              }
            }
          }
          // If no correct_answer field, fall back to assuming the first answer is correct
          else {
            answers = question.answer_choices.map((choice: any, index: number) => ({
              text: String(choice),
              isCorrect: index === 0 // Assume first answer is correct if no correct_answer specified
            }));
            console.log(`Question "${questionText}" - assuming first answer is correct (no correct_answer field)`);
          }
        }
        // Case 3: Fallback to dummy answers
        else {
          answers = [
            { text: "Yes", isCorrect: true },
            { text: "No", isCorrect: false },
            { text: "Maybe", isCorrect: false },
          ];
          console.warn(`No valid answers found for question "${questionText}". Using dummy answers.`);
        }

        // Shuffle the answers to randomize their order
        answers = shuffleArray(answers);

        // Get category/topic and standardize it
        const category = question.topic || question.category || 'General Knowledge';
        const standardizedTopic = getStandardizedTopicName(category);
        
        // Get subtopic and branch (if available)
        const subtopic = question.subtopic || undefined;
        const branch = question.branch || undefined;
        
        // Get tags (if available)
        const tags = question.tags || [];
        
        // Get difficulty
        const difficulty = question.difficulty || 'Medium';
        
        // Get learning capsule/explanation
        const learningCapsule = question.learning_capsule || question.explanation || 'No additional information available for this question.';
        
        // Get background color based on category or subtopic depending on mode
        let backgroundColor;
        if (filterContentByTopic && activeTopic !== 'default') {
          // In topic-specific mode, use subtopic or tag for background color variation
          if (subtopic) {
            backgroundColor = getTopicColor(subtopic);
          } else if (tags && tags.length > 0) {
            backgroundColor = getTopicColor(tags[0]);
          } else {
            backgroundColor = getTopicColor(category);
          }
        } else {
          // In multi-topic mode, use the main topic for color
          backgroundColor = getTopicColor(category);
        }

        return {
          id: question.id || String(Math.random()),
          topic: standardizedTopic,
          question: questionText,
          answers,
          difficulty,
          likes: Math.floor(Math.random() * 2000),  // Placeholder values
          views: Math.floor(Math.random() * 10000), // Placeholder values
          backgroundColor,
          learningCapsule,
          subtopic,
          branch,
          tags
        };
      });
    } catch (error) {
      console.error('Error during data retrieval:', error);
      return mockFeedData;
    }
  } catch (error) {
    console.error('Unexpected error while fetching trivia questions:', error);
    return mockFeedData;
  }
}

// Function to fetch only new trivia questions that aren't in the provided IDs list
export async function fetchNewTriviaQuestions(existingIds: string[]): Promise<FeedItem[]> {
  try {
    console.log(`Fetching new questions, excluding ${existingIds.length} existing IDs`);
    
    // First check if we can connect
    try {
      const { count, error: pingError } = await supabase
        .from('trivia_questions')
        .select('*', { count: 'exact', head: true });
        
      if (pingError) {
        console.error('Connection test failed:', pingError);
        return [];
      }
    } catch (pingError) {
      console.error('Connection test error:', pingError);
      return [];
    }
    
    // Handle large ID sets with batched exclusions for better performance
    let data;
    let error;
    
    if (existingIds.length > 100) {
      console.log(`Large exclusion list (${existingIds.length} IDs), using batched approach`);
      
      // Split IDs into chunks of 100 to avoid query size limits
      const chunkSize = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < existingIds.length; i += chunkSize) {
        chunks.push(existingIds.slice(i, i + chunkSize));
      }
      
      console.log(`Split into ${chunks.length} chunks of max ${chunkSize} IDs each`);
      
      let allNewQuestions: TriviaQuestion[] = [];
      const allExistingIds = new Set(existingIds); // For final filtering
      
      // Process each chunk with database-side exclusion
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} IDs`);
        
        try {
          // Build query for this chunk - exclude this specific chunk of IDs
          let query = supabase
            .from('trivia_questions')
            .select('*')
            .not('id', 'in', `(${chunk.join(',')})`);
          
          // Apply topic filter if configured (preserving existing logic)
          if (filterContentByTopic && activeTopic !== 'default' && topicDbName) {
            console.log(`DEBUG: Filtering chunk ${i + 1} by topic: ${topicDbName}`);
            query = query.eq('topic', topicDbName);
          }
          
          const { data: chunkData, error: chunkError } = await query;
          
          if (chunkError) {
            console.error(`Error in chunk ${i + 1}:`, chunkError);
            continue; // Skip this chunk, try others
          }
          
          if (chunkData && chunkData.length > 0) {
            // Filter out questions that appear in ANY of the existing IDs
            // (since each query excludes only one chunk, we need to filter against all IDs)
            const filteredChunkData = chunkData.filter((q: TriviaQuestion) => !allExistingIds.has(q.id));
            
            allNewQuestions.push(...filteredChunkData);
            console.log(`Chunk ${i + 1} contributed ${filteredChunkData.length} new questions`);
          }
        } catch (chunkError) {
          console.error(`Error processing chunk ${i + 1}:`, chunkError);
          continue; // Continue with other chunks
        }
      }
      
      data = allNewQuestions;
      error = null;
      
      // Remove any duplicates that might occur between chunks
      const seenIds = new Set<string>();
      data = data.filter(question => {
        if (seenIds.has(question.id)) {
          console.log(`Removing duplicate question ID: ${question.id}`);
          return false;
        }
        seenIds.add(question.id);
        return true;
      });
      
      console.log(`Total new questions after batched exclusion: ${data.length}`);
      
    } else {
      // For smaller sets, use the original efficient single query approach
      console.log(`Small exclusion list (${existingIds.length} IDs), using single query approach`);
      
      let query = supabase
        .from('trivia_questions')
        .select('*')
        .not('id', 'in', `(${existingIds.join(',')})`);
      
      // Apply topic filter if configured (preserving existing logic)
      if (filterContentByTopic && activeTopic !== 'default' && topicDbName) {
        console.log(`DEBUG: Filtering new questions by topic: ${topicDbName}`);
        query = query.eq('topic', topicDbName);
      }
      
      const response = await query;
      
      data = response.data;
      error = response.error;
    }
    
    if (error) {
      console.error('Error fetching new trivia questions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No new trivia questions found');
      return [];
    }

    console.log(`Found ${data.length} new questions`);
    
    // Log some stats about subtopics and tags when in topic-specific mode
    if (filterContentByTopic && activeTopic !== 'default') {
      // Track unique subtopics and tags
      const subtopics = new Set<string>();
      const allTags = new Set<string>();
      
      data.forEach((question: TriviaQuestion) => {
        if (question.subtopic) {
          subtopics.add(question.subtopic);
        }
        
        if (question.tags && Array.isArray(question.tags)) {
          question.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      console.log(`DEBUG: Found ${subtopics.size} unique subtopics in new questions:`, Array.from(subtopics));
      console.log(`DEBUG: Found ${allTags.size} unique tags in new questions:`, Array.from(allTags));
    }
    
    // Transform the data same as in fetchTriviaQuestions
    return data.map((question: TriviaQuestion) => {
      // Determine the question text
      const questionText = question.question_text || question.question || 'Unknown question';
      
      // Handle answers
      let answers: { text: string, isCorrect: boolean }[] = [];
      
      // Case 1: Pre-formatted answers array with isCorrect flags
      if (question.answers && Array.isArray(question.answers)) {
        answers = question.answers;
      }
      // Case 2: answer_choices array + separate correct_answer
      else if (question.answer_choices && Array.isArray(question.answer_choices)) {
        if (question.correct_answer) {
          const correctAnswerStr = String(question.correct_answer).trim();
          
          // Create a normalized version for comparison (lowercase, no punctuation)
          const normalizeString = (str: string): string => {
            return str.toLowerCase()
              .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
              .replace(/\s+/g, " ")
              .trim();
          };
          
          const normalizedCorrectAnswer = normalizeString(correctAnswerStr);
          
          answers = question.answer_choices.map((choice: any) => {
            const choiceStr = String(choice).trim();
            const normalizedChoice = normalizeString(choiceStr);
            
            // Try different matching strategies in order of strictness
            const exactMatch = choiceStr === correctAnswerStr;
            const normalizedMatch = normalizedChoice === normalizedCorrectAnswer;
            const substringMatch = normalizedChoice.includes(normalizedCorrectAnswer) || 
                               normalizedCorrectAnswer.includes(normalizedChoice);
            
            return {
              text: choiceStr,
              isCorrect: exactMatch || normalizedMatch || substringMatch
            };
          });
          
          // Check if we successfully marked any answer as correct
          const hasCorrectAnswer = answers.some(a => a.isCorrect);
          
          if (!hasCorrectAnswer) {
            // If no correct answer was identified, mark the first answer as correct
            console.warn(`No matching answer found for "${correctAnswerStr}" in question "${questionText}". Marking first answer as correct.`);
            if (answers.length > 0) {
              answers[0].isCorrect = true;
            }
          }
        } else {
          // No correct_answer field, mark the first answer as correct
          answers = question.answer_choices.map((choice: any, index: number) => ({
            text: String(choice).trim(),
            isCorrect: index === 0  // Mark the first answer as correct
          }));
          console.warn(`No correct_answer field for question "${questionText}". Defaulting to first answer as correct.`);
        }
      }
      // Case 3: Fallback to dummy answers
      else {
        answers = [
          { text: "Yes", isCorrect: true },
          { text: "No", isCorrect: false },
          { text: "Maybe", isCorrect: false },
        ];
        console.warn(`No valid answers found for question "${questionText}". Using dummy answers.`);
      }

      // Shuffle the answers to randomize their order
      answers = shuffleArray(answers);

      // Get category/topic and standardize it
      const category = question.topic || question.category || 'General Knowledge';
      const standardizedTopic = getStandardizedTopicName(category);
      
      // Get subtopic and branch (if available)
      const subtopic = question.subtopic || undefined;
      const branch = question.branch || undefined;
      
      // Get tags (if available)
      const tags = question.tags || [];
      
      // Get difficulty
      const difficulty = question.difficulty || 'Medium';
      
      // Get learning capsule/explanation
      const learningCapsule = question.learning_capsule || question.explanation || 'No additional information available for this question.';
      
      // Get background color based on category or subtopic depending on mode
      let backgroundColor;
      if (filterContentByTopic && activeTopic !== 'default') {
        // In topic-specific mode, use subtopic or tag for background color variation
        if (subtopic) {
          backgroundColor = getTopicColor(subtopic);
        } else if (tags && tags.length > 0) {
          backgroundColor = getTopicColor(tags[0]);
        } else {
          backgroundColor = getTopicColor(category);
        }
      } else {
        // In multi-topic mode, use the main topic for color
        backgroundColor = getTopicColor(category);
      }

      return {
        id: question.id || String(Math.random()),
        topic: standardizedTopic,
        question: questionText,
        answers,
        difficulty,
        likes: Math.floor(Math.random() * 2000),  // Placeholder values
        views: Math.floor(Math.random() * 10000), // Placeholder values
        backgroundColor,
        learningCapsule,
        subtopic,
        branch,
        tags
      };
    });
  } catch (error) {
    console.error('Error fetching new trivia questions:', error);
    return [];
  }
}

/**
 * Get the last fetch timestamp for optimized database queries
 * This helps prevent fetching the same questions repeatedly
 */
export async function getLastFetchTimestamp(): Promise<number | null> {
  try {
    // For now, we'll use a simple approach - you can enhance this later
    // to store in AsyncStorage or a database table
    const stored = await AsyncStorage.getItem('lastFetchTimestamp');
    return stored ? parseInt(stored, 10) : null;
  } catch (error) {
    console.error('Error getting last fetch timestamp:', error);
    return null;
  }
}

/**
 * Set the last fetch timestamp after a successful database fetch
 * This helps optimize future queries
 */
export async function setLastFetchTimestamp(timestamp?: number): Promise<void> {
  try {
    const timestampToSet = timestamp || Date.now();
    await AsyncStorage.setItem('lastFetchTimestamp', timestampToSet.toString());
    console.log(`Set last fetch timestamp to: ${new Date(timestampToSet).toISOString()}`);
  } catch (error) {
    console.error('Error setting last fetch timestamp:', error);
  }
} 