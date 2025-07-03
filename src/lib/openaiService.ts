import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { getTriviaTableName, isUsingNicheTable, getActiveTopicConfig } from '../utils/tableUtils';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js'
// OpenAI API key should be stored securely
// Get the API key from multiple possible sources
let OPENAI_API_KEY = '';

// TEMPORARY DEVELOPMENT KEY FOR TESTING
// Replace with your actual key for dev testing only
// REMOVE BEFORE PRODUCTION!
const DEV_KEY = 'YOUR_API_KEY_HERE';

// Access environment variables based on the platform
try {
  // For Expo/React Native, use Constants
  if (Constants.expoConfig?.extra?.openaiApiKey) {
    OPENAI_API_KEY = Constants.expoConfig.extra.openaiApiKey;
  }
  // For web, access React environment variables (from .env.local)
  else if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_OPENAI_KEY) {
    OPENAI_API_KEY = process.env.REACT_APP_OPENAI_KEY;
    console.log('[GENERATOR] Using web environment API key');
  }
  // Last resort for development - use the hardcoded key
  else if (process.env.NODE_ENV === 'development') {
    OPENAI_API_KEY = DEV_KEY;
    // console.log('[GENERATOR] Using temporary hardcoded development key');
  }

  if (!OPENAI_API_KEY) {
    console.warn('[GENERATOR] No OpenAI API key found. Question generation will not work.');
  } else {
    console.log('[GENERATOR] OpenAI API Key configured successfully');
  }
} catch (error) {
  console.error('[GENERATOR] Error loading OpenAI API key:', error);
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Trivia question format
export interface GeneratedQuestion {
  question: string;
  answers: {
    text: string;
    isCorrect: boolean;
  }[];
  category: string;
  subtopic: string;
  branch: string;
  difficulty: string;
  learningCapsule: string;
  tags: string[];
  tone?: string;
  format?: string;
  source?: string;
  created_at?: string;
  isDuplicate?: boolean; // Flag for marking duplicates when processing
}

// New interface for generation configuration
export interface GenerationConfig {
  mode: 'general' | 'niche';
  targetTable: 'trivia_questions' | 'niche_trivia_questions';
  nicheTopicFocus?: string; // The specific niche topic to focus on
  useFocusedPrompt?: boolean; // Whether to use niche-focused prompting
}

/**
 * Determine the generation configuration based on app settings
 */
export function determineGenerationConfig(): GenerationConfig {
  const isNiche = isUsingNicheTable();
  const activeTopicConfig = getActiveTopicConfig();
  
  if (isNiche && activeTopicConfig) {
    return {
      mode: 'niche',
      targetTable: 'niche_trivia_questions',
      nicheTopicFocus: activeTopicConfig.dbTopicName || activeTopicConfig.displayName,
      useFocusedPrompt: true
    };
  }
  
  return {
    mode: 'general',
    targetTable: 'trivia_questions',
    useFocusedPrompt: false
  };
}

/**
 * Call Edge Function to generate trivia questions
 */
export async function generateQuestions(
  primaryTopics: string[],
  adjacentTopics: string[],
  primaryCount: number = 6,
  adjacentCount: number = 6,
  preferredSubtopics: string[] = [],
  preferredBranches: string[] = [],
  preferredTags: string[] = [],
  recentQuestions: { id: string, questionText: string, topic?: string, subtopic?: string, branch?: string, tags?: string[] }[] = [],
  generationConfig?: GenerationConfig // New parameter
): Promise<GeneratedQuestion[]> {
  
  // Determine generation mode if not provided
  const config = generationConfig || determineGenerationConfig();
  
  // console.log(`[OPENAI] Using ${config.mode} generation mode`);
  // console.log(`[OPENAI] Target table: ${config.targetTable}`);
  
  // Route to appropriate generation function based on mode
  if (config.mode === 'niche') {
    return generateNicheQuestions(primaryTopics, preferredSubtopics, preferredBranches, preferredTags, recentQuestions, config);
  } else {
    return generateGeneralQuestions(primaryTopics, adjacentTopics, primaryCount, adjacentCount, preferredSubtopics, preferredBranches, preferredTags, recentQuestions);
  }
}

/**
 * Generate niche-focused questions using specialized prompts with general mode logic
 */
async function generateNicheQuestions(
  primaryTopics: string[],
  preferredSubtopics: string[],
  preferredBranches: string[],
  preferredTags: string[],
  recentQuestions: any[],
  config: GenerationConfig
): Promise<GeneratedQuestion[]> {
  try {
    console.log('\n\n====================== NICHE OPENAI SERVICE LOGS ======================');
    console.log('[OPENAI] Starting 100% CLIENT-SIDE NICHE question generation');
    console.log('[OPENAI] Niche topic focus:', config.nicheTopicFocus);
    console.log('[OPENAI] Input preferred subtopics:', preferredSubtopics);
    console.log('[OPENAI] Input preferred branches:', preferredBranches);
    console.log('[OPENAI] Input preferred tags:', preferredTags);
    console.log('[OPENAI] SKIPPING database queries - using pure client-side generation');
    
    // Use the niche topic as the primary focus
    const nicheTopic = config.nicheTopicFocus || primaryTopics[0] || 'General Knowledge';
    
    // Process client-side recent questions data for duplication avoidance
    console.log('[OPENAI] Processing client-side recent questions for duplication avoidance:', recentQuestions.length);
    
    // Filter recent questions that are relevant to the niche topic for better duplication avoidance
    const nicheRelevantQuestions = recentQuestions.filter(q => 
      q.questionText && (
        !q.topic || // Include questions without topic classification
        q.topic.toLowerCase() === nicheTopic.toLowerCase() // Include questions from the same niche topic
      )
    ).slice(0, 10); // Limit to 10 most recent
    
    console.log(`[OPENAI] Found ${nicheRelevantQuestions.length} client-side questions relevant for duplication avoidance`);
    
    // Build niche-specific prompt with sophisticated logic
    const nichePrompt = buildNichePrompt(
      nicheTopic, 
      preferredSubtopics, 
      preferredBranches, 
      preferredTags, 
      nicheRelevantQuestions // Use client-side questions for duplication avoidance
    );
    
    console.log('[OPENAI] Generated niche prompt structure successfully using client-side data only');
    console.log('====================== END NICHE OPENAI SERVICE LOGS ======================\n\n');
    
    // Call OpenAI with niche-specific prompt
    return await callOpenAIForGeneration(nichePrompt, 'niche');
    
  } catch (error) {
    console.error('[OPENAI] Error during niche question generation:', error);
    throw error;
  }
}

/**
 * Generate general questions using the existing logic
 */
async function generateGeneralQuestions(
  primaryTopics: string[],
  adjacentTopics: string[],
  primaryCount: number,
  adjacentCount: number,
  preferredSubtopics: string[],
  preferredBranches: string[],
  preferredTags: string[],
  recentQuestions: any[]
): Promise<GeneratedQuestion[]> {
  // This contains the existing generateQuestions logic
  try {
    console.log('\n\n====================== OPENAI SERVICE LOGS ======================');
    console.log('[OPENAI] Starting question generation');
    console.log('[OPENAI] Input primary topics:', primaryTopics);
    console.log('[OPENAI] Input adjacent topics:', adjacentTopics);
    console.log('[OPENAI] Input preferred subtopics:', preferredSubtopics);
    console.log('[OPENAI] Input preferred branches:', preferredBranches);
    console.log('[OPENAI] Input preferred tags:', preferredTags);
    console.log('[OPENAI] Recent questions to use for generation:', recentQuestions.length);
    
    // Filter and enhance recent questions with full hierarchy if available
    const enhancedRecentQuestions = recentQuestions
      .filter(q => q.topic && q.subtopic) // Only use questions with proper categorization
      .slice(0, 10); // Limit to 10 most recent questions
    
    console.log('[OPENAI] Enhanced recent questions with hierarchy:', enhancedRecentQuestions.length);
    
    // Check app topic configuration for single-topic mode
    const topicConfig = Constants.expoConfig?.extra?.activeTopic || 'default';
    const filterContentByTopic = Constants.expoConfig?.extra?.filterContentByTopic || false;
    const topicDbName = Constants.expoConfig?.extra?.topicDbName || null;
    
    const isTopicSpecificApp = topicConfig !== 'default' && filterContentByTopic && topicDbName;
    console.log(`[OPENAI] App topic configuration: ${isTopicSpecificApp ? topicDbName : 'multi-topic'}`);
    
    // If in topic-specific mode, ensure all topics are filtered
    if (isTopicSpecificApp) {
      console.log(`[OPENAI] Enforcing topic-specific mode for "${topicDbName}"`);
      // Force all questions to be from the configured topic
      primaryTopics = [topicDbName];
      // Clear adjacent topics as we want all questions to be from the main topic
      adjacentTopics = [];
    }
    
    // Select recent interactions to use for question generation
    // Prioritize based on weight and cyclic selection
    let selectedInteractions = [];
    
    // In a real implementation, we would sort by weights and use cyclic selection
    // For simplicity, here we just take the most recent 3 interactions
    if (enhancedRecentQuestions.length >= 3) {
      // Take 3 interactions from the recently answered questions
      selectedInteractions = enhancedRecentQuestions.slice(0, 3);
    } else {
      // If we don't have enough interactions, use the available ones
      selectedInteractions = enhancedRecentQuestions;
    }
    
    // Continue with existing interactions
    
    // Build the prompt based on the new logic
    let mainPrompt = '';
    
    // Create question sets for each selected interaction (3 questions per interaction)
    const questionPrompts = [];
    
    selectedInteractions.forEach((interaction, index) => {
      if (!interaction.topic || !interaction.subtopic || !interaction.branch) {
        console.log(`[OPENAI] Skipping interaction ${index} due to missing hierarchy`);
        return;
      }
      
      // Create prompts for the 3 question types per interaction
      
      // 1. Preferred branch question
      const focalTag = interaction.tags && interaction.tags.length > 0 
        ? interaction.tags[Math.floor(Math.random() * interaction.tags.length)] 
        : null;
      
      const exclusionTags = focalTag && interaction.tags 
        ? interaction.tags.filter((tag: any) => tag !== focalTag).join('","') 
        : '';
      
      questionPrompts.push(`
      // Question ${questionPrompts.length + 1}: Preferred branch from interaction ${index + 1}
      Create a question about topic "${interaction.topic}", subtopic "${interaction.subtopic}", branch "${interaction.branch}"
      Focal tag: "${focalTag}" ${exclusionTags ? `\nExclusion tags: ["${exclusionTags}"]` : ''}
      `);
      
      // 2. Adjacent branch question (same subtopic, different branch)
      questionPrompts.push(`
      // Question ${questionPrompts.length + 1}: Adjacent branch from interaction ${index + 1}
      Create a question about topic "${interaction.topic}", subtopic "${interaction.subtopic}", with a NEW random branch (not "${interaction.branch}")
      Avoid these tags if possible: ${interaction.tags ? `["${interaction.tags.join('","')}"]` : '[]'}
      `);
      
      // 3. Adjacent subtopic question (same topic, different subtopic and branch)
      questionPrompts.push(`
      // Question ${questionPrompts.length + 1}: Adjacent subtopic from interaction ${index + 1}
      Create a question about topic "${interaction.topic}", with a NEW random subtopic (not "${interaction.subtopic}"), and a new random branch
      Avoid these tags if possible: ${interaction.tags ? `["${interaction.tags.join('","')}"]` : '[]'}
      `);
    });
    
    // Get the highest weighted topics for the preferred exploration questions
    // In single topic mode or when primaryTopics has only one topic, use that
    const explorationTopic = isTopicSpecificApp ? topicDbName : 
                            (primaryTopics.length > 0 ? primaryTopics[0] : "General Knowledge");
    
    // Get a few different topics for varied exploration when not in single-topic mode
    const explorationTopics = isTopicSpecificApp ? 
                            [topicDbName, topicDbName, topicDbName] :
                            primaryTopics.slice(0, Math.min(3, primaryTopics.length));
    
    // If we have fewer than 3 topics, duplicate to ensure we have at least 3
    while (explorationTopics.length < 3) {
      explorationTopics.push(explorationTopics[0] || "General Knowledge");
    }
    
    // Get the highest weighted subtopic for question 10
    // Use the first preferred subtopic if available, otherwise use a generic one
    const topSubtopic = preferredSubtopics.length > 0 ? preferredSubtopics[0] : "General";
    
    // Create 3 preferred exploration questions with specific topics
    questionPrompts.push(`
    // Question ${questionPrompts.length + 1}: Preferred exploration
    Create a unique question about topic "${explorationTopic}", subtopic "${topSubtopic}"
    Use newest and most accurate information, leveraging online research if needed
    `);
    
    // For questions 11-12, implement cyclic selection by using different topics
    // from the user's preferred weights
    questionPrompts.push(`
    // Question ${questionPrompts.length + 1}: Preferred exploration
    Create a unique and refreshing question about topic "${explorationTopics[1]}"
    Focus on recent trends, developments, or discoveries in this field
    `);
    
    // For question 12, focus on combining knowledge domains
    questionPrompts.push(`
    // Question ${questionPrompts.length + 1}: Preferred exploration
    Create a unique and unexpected question that combines knowledge domains
    Build on the topic "${explorationTopics[2]}" while introducing novel concepts
    `);
    
    // Create 2 random noun-inspired questions for Q7-8 (randomize themes)
    const randomThemes = [
      "cultural, technological, or social aspects",
      "significance or evolution during the 1990s", 
      "trends, innovations, or cultural phenomena",
      "brands, products, or companies",
      "entertainment, media, or pop culture",
      "technology, science, or social changes"
    ];
    
    const shuffledThemes = [...randomThemes].sort(() => Math.random() - 0.5);
    
    questionPrompts.push(`
    // Question ${questionPrompts.length + 1}: Random noun inspiration
    Choose 1 random noun (like "telephone", "hamburger", "bicycle", etc.) and create a unique question about how this item or concept relates to "${explorationTopic}"
    Focus on ${shuffledThemes[0]} of "${explorationTopic}"
    The question should explore the connection between this random noun and the topic
    Make the connection surprising but factually accurate
    `);
    
    questionPrompts.push(`
    // Question ${questionPrompts.length + 1}: Random noun inspiration  
    Choose 1 completely different random noun and create a unique question about its connection to "${explorationTopic}"
    Focus on ${shuffledThemes[1]} from the topic
    Test knowledge of "${explorationTopic}" through unexpected but factual connections
    Explore how this item/concept relates to the chosen topic
    `);
    
    // Assemble the final prompt
    mainPrompt = `Generate 12 unique trivia questions for a trivia app, following these specific instructions:

    CRITICAL ACCURACY & VALIDATION REQUIREMENTS:
    - ALL questions and answers MUST be 100% factually accurate, valid, and verifiable through reliable sources
    - FACT-CHECK every single statement, date, name, statistic, and detail before including it in a question
    - VERIFY information against multiple authoritative sources (encyclopedias, academic sources, official records)
    - DO NOT include any speculative, uncertain, potentially incorrect, or unconfirmed information
    - Cross-reference all facts with at least 2-3 reliable, independent sources to ensure accuracy and validity
    - If you're not 100% certain about a fact being valid and verifiable, DO NOT use it in a question
    - All correct answers must be definitively and unambiguously correct with valid, verified, and fact-checked information
    - All incorrect answers must be definitively wrong (not just less likely) but still contain valid, fact-checked information structure
    - Double-check that the correct answer is actually correct and that all answer choices contain valid information
    - Avoid questions based on rumors, unverified claims, disputed facts, or controversial information - only use established, fact-checked facts
    - Ensure dates, names, numbers, and specific details are accurate and have been fact-checked against authoritative sources
    - When in doubt about any factual claim, err on the side of caution and choose a different, verifiable fact instead

    CRITICAL STRUCTURAL REQUIREMENTS:
    - Create EXACTLY 12 questions with detailed personalization
    - Each question must follow the exact JSON structure shown at the end
    - Make sure all questions are factually accurate with current information
    - Include 4 answer choices per question (exactly one correct)
    - Keep questions CONCISE and readable (aim for 1-2 sentences when possible)
    - Keep answer choices SHORT and to the point (avoid overly long or wordy options)
    
    DISTRIBUTION:
    ${questionPrompts.join('\n')}
    
    QUESTION UNIQUENESS RULES:
    - Each question must be completely distinct from all others
    - Avoid asking multiple questions about the same person, event, work, or concept
    - Ensure questions test different knowledge points even when related to similar topics
    - Before finalizing, check that no two questions have the same answer
    ${recentQuestions.length > 0 ? `
    RECENT QUESTIONS TO AVOID DUPLICATING:
    ${recentQuestions.slice(0, 5).map((q, i) => `${i + 1}. "${q.questionText}"`).join('\n    ')}` : ''}

    For EACH question, include:
    1. A main topic (e.g., "Science", "History", "Geography")
    2. A specific subtopic that represents a specialized area of the main topic
    3. A precise branch that represents a very specific sub-area within the subtopic
    4. 3-5 specific, descriptive tags related to the question content
    5. Four answer choices with only one correct
    6. Difficulty level (easy, medium, hard)
    7. A "learning capsule" providing interesting additional context about the answer
    8. The tone ("educational", "fun", "challenging", "neutral")
    9. Format ("multiple_choice")
    
    IMPORTANT: Respond ONLY with a valid JSON array containing the question objects.
    DO NOT include any text before or after the JSON array.
    ONLY return a JSON array in this exact format:
    [
      {
        "question": "Concise, clear question text?",
        "answers": [
          {"text": "Short correct answer", "isCorrect": true},
          {"text": "Brief wrong answer 1", "isCorrect": false},
          {"text": "Brief wrong answer 2", "isCorrect": false},
          {"text": "Brief wrong answer 3", "isCorrect": false}
        ],
        "category": "Main Topic",
        "subtopic": "Specific Subtopic",
        "branch": "Precise Branch",
        "difficulty": "easy|medium|hard",
        "learningCapsule": "Fascinating fact about the answer that provides additional context",
        "tags": ["specific_tag1", "specific_tag2", "specific_tag3", "specific_tag4"],
        "tone": "educational|fun|challenging|neutral",
        "format": "multiple_choice"
      },
      // more questions...
    ]`;

    console.log('[OPENAI] Generated prompt structure successfully');
    console.log(`[OPENAI] Prompt has ${questionPrompts.length} question instructions`);
    console.log('====================== END OPENAI SERVICE LOGS ======================\n\n');
    
    // Call OpenAI with general prompt
    return await callOpenAIForGeneration(mainPrompt, 'general');
    
  } catch (error) {
    console.error('[OPENAI] Error during general question generation:', error);
    throw error;
  }
}

/**
 * Build niche-focused prompt using 100% client-side data - NO DATABASE QUERIES
 */
function buildNichePrompt(
  nicheTopic: string,
  preferredSubtopics: string[],
  preferredBranches: string[],
  preferredTags: string[],
  recentQuestions: any[]
): string {
  console.log(`[OPENAI] 🔄 PURE CLIENT-SIDE MODE: Building niche prompt with actual answered questions`);
  console.log(`[OPENAI] Recent questions available: ${recentQuestions.length}`);
  console.log(`[OPENAI] Preferred data: ${preferredSubtopics.length} subtopics, ${preferredBranches.length} branches, ${preferredTags.length} tags`);
  
  // Use actual recent questions that the user answered
  let selectedInteractions = [];
  
  // Filter recent questions that match the niche topic and have required data
  const nicheRelevantQuestions = recentQuestions.filter(q => 
    q.topic && 
    q.topic.toLowerCase() === nicheTopic.toLowerCase() &&
    q.subtopic && 
    q.branch &&
    q.tags && 
    Array.isArray(q.tags) && 
    q.tags.length > 0
  );
  
  console.log(`[OPENAI] Found ${nicheRelevantQuestions.length} niche-relevant questions with complete data`);
  
  // Select up to 3 interactions from recent questions
  if (nicheRelevantQuestions.length >= 3) {
    selectedInteractions = nicheRelevantQuestions.slice(0, 3);
  } else if (nicheRelevantQuestions.length > 0) {
    // Use what we have and create synthetic ones for the rest
    selectedInteractions = [...nicheRelevantQuestions];
    
    // Create synthetic interactions to fill up to 3
    const needMore = 3 - selectedInteractions.length;
    for (let i = 0; i < needMore; i++) {
      const subtopic = preferredSubtopics[i % preferredSubtopics.length] || "General";
      const branch = preferredBranches[i % preferredBranches.length] || "Overview";
      
      // Distribute tags among interactions
      const tagChunkSize = Math.ceil(preferredTags.length / needMore);
      const startIdx = i * tagChunkSize;
      const interactionTags = preferredTags.slice(startIdx, startIdx + tagChunkSize);
      
      selectedInteractions.push({
        topic: nicheTopic,
        subtopic: subtopic,
        branch: branch,
        tags: interactionTags.length > 0 ? interactionTags : ['general']
      });
    }
  } else {
    // No recent questions, create synthetic interactions from client-side data
    console.log(`[OPENAI] No recent questions found, creating synthetic interactions from preferences`);
    
    for (let i = 0; i < Math.min(3, Math.max(preferredSubtopics.length, preferredBranches.length, 1)); i++) {
      const subtopic = preferredSubtopics[i % preferredSubtopics.length] || "General";
      const branch = preferredBranches[i % preferredBranches.length] || "Overview";
      
      // Distribute tags among interactions
      const tagChunkSize = Math.ceil(preferredTags.length / 3);
      const startIdx = i * tagChunkSize;
      const interactionTags = preferredTags.slice(startIdx, startIdx + tagChunkSize);
      
      selectedInteractions.push({
        topic: nicheTopic,
        subtopic: subtopic,
        branch: branch,
        tags: interactionTags.length > 0 ? interactionTags : ['general']
      });
    }
  }
  
  console.log(`[OPENAI] Using ${selectedInteractions.length} interactions for question generation`);
  
  // Log the source of each interaction
  selectedInteractions.forEach((interaction, i) => {
    const isFromQuestion = nicheRelevantQuestions.includes(interaction);
    console.log(`[OPENAI] Interaction ${i + 1}: ${isFromQuestion ? 'FROM ACTUAL QUESTION' : 'SYNTHETIC'}`);
    console.log(`[OPENAI]   - Topic: ${interaction.topic}`);
    console.log(`[OPENAI]   - Subtopic: ${interaction.subtopic}`);
    console.log(`[OPENAI]   - Branch: ${interaction.branch}`);
    console.log(`[OPENAI]   - Tags: [${interaction.tags?.join(', ')}]`);
  });
  
  // Log recent questions being used for duplication avoidance
  console.log(`\n[OPENAI] 📋 RECENT QUESTIONS FOR DUPLICATION AVOIDANCE:`);
  console.log(`[OPENAI] Using ${recentQuestions.length} recent questions`);
  recentQuestions.slice(0, 5).forEach((q, i) => {
    console.log(`[OPENAI]   ${i + 1}. "${q.questionText || 'No text'}"`);
  });
  
  // Build the prompt based on the same logic as general mode
  const questionPrompts = [];
  
  // Only generate questions 1, 3, and 5 (from 3 different interactions)
  for (let i = 0; i < Math.min(3, selectedInteractions.length); i++) {
    const interaction = selectedInteractions[i];
    const questionIndex = i * 2 + 1; // Will be 1, 3, 5
    
    console.log(`\n[OPENAI] 🎯 Processing Interaction ${i + 1} for Question ${questionIndex}:`);
    console.log(`[OPENAI]   Topic: "${interaction.topic}"`);
    console.log(`[OPENAI]   Subtopic: "${interaction.subtopic}"`);
    console.log(`[OPENAI]   Branch: "${interaction.branch}"`);
    console.log(`[OPENAI]   Available Tags: [${interaction.tags?.join(', ') || 'none'}]`);
    
    // Only create the preferred branch question (Question 1, 3, 5 pattern)
    let focalTag: string | null = null;
    let exclusionTags = '';
    
    if (interaction.tags && interaction.tags.length > 0) {
      // Pick a random tag to be the focal tag
      focalTag = interaction.tags[Math.floor(Math.random() * interaction.tags.length)] as string;
      // All other tags become exclusion tags
      const otherTags = interaction.tags.filter((tag: any) => tag !== focalTag);
      exclusionTags = otherTags.length > 0 ? otherTags.join('","') : '';
    }
    
    console.log(`[OPENAI]   🎯 Q${questionIndex} (Preferred Branch): Focal="${focalTag || 'none'}", Exclusion=[${exclusionTags ? `"${exclusionTags}"` : 'none'}]`);
    
    questionPrompts.push(`
    // Question ${questionIndex}: Preferred branch from interaction ${i + 1}
    Create a question EXCLUSIVELY about topic "${nicheTopic}", subtopic "${interaction.subtopic}", branch "${interaction.branch}"${focalTag ? `
    Focal tag: "${focalTag}"` : ''}${exclusionTags ? `
    Exclusion tags: ["${exclusionTags}"]` : ''}
    `);
  }
  
  // Assemble the final prompt (same structure as general mode but niche-focused)
  return `Generate 3 unique trivia questions EXCLUSIVELY about "${nicheTopic}", following these specific instructions:

CRITICAL ACCURACY & VALIDATION REQUIREMENTS:
- ALL questions and answers MUST be 100% factually accurate, valid, and verifiable through reliable sources
- FACT-CHECK every single statement, date, name, statistic, and detail before including it in a question
- VERIFY information against multiple authoritative sources (encyclopedias, academic sources, official records)
- DO NOT include any speculative, uncertain, potentially incorrect, or unconfirmed information
- Cross-reference all facts with at least 2-3 reliable, independent sources to ensure accuracy and validity
- If you're not 100% certain about a fact being valid and verifiable, DO NOT use it in a question
- All correct answers must be definitively and unambiguously correct with valid, verified, and fact-checked information
- All incorrect answers must be definitively wrong (not just less likely) but still contain valid, fact-checked information structure
- Double-check that the correct answer is actually correct and that all answer choices contain valid information
- Avoid questions based on rumors, unverified claims, disputed facts, or controversial information - only use established, fact-checked facts
- Ensure dates, names, numbers, and specific details are accurate and have been fact-checked against authoritative sources
- When in doubt about any factual claim, err on the side of caution and choose a different, verifiable fact instead

CRITICAL NICHE REQUIREMENTS:
- ALL 3 questions MUST be about "${nicheTopic}" specifically
- DO NOT generate questions about other topics, even if they seem related
- Every question must have "${nicheTopic}" as its category/topic
- Focus on deep, specialized knowledge within "${nicheTopic}"
- Questions should test expertise and nuanced understanding of "${nicheTopic}"

CRITICAL STRUCTURAL REQUIREMENTS:
- Create EXACTLY 3 questions with detailed personalization
- Each question must follow the exact JSON structure shown at the end
- Make sure all questions are factually accurate with current information
- Include 4 answer choices per question (exactly one correct)
- Keep questions CONCISE and readable (aim for 1-2 sentences when possible)
- Keep answer choices SHORT and to the point (avoid overly long or wordy options)

DISTRIBUTION:
${questionPrompts.join('\n')}

QUESTION UNIQUENESS RULES:
- Each question must be completely distinct from all others
- Avoid asking multiple questions about the same person, event, work, or concept within "${nicheTopic}"
- Ensure questions test different knowledge points even when related to similar aspects of "${nicheTopic}"
- Before finalizing, check that no two questions have the same answer
${recentQuestions.length > 0 ? `
RECENT QUESTIONS TO AVOID DUPLICATING:
${recentQuestions.slice(0, 5).map((q, i) => `${i + 1}. "${q.questionText}"`).join('\n    ')}` : ''}

NICHE DEPTH REQUIREMENTS:
- Include questions for both casual fans and deep experts of "${nicheTopic}"
- Cover obscure facts, behind-the-scenes information, and expert-level details
- Test knowledge of subtleties and nuances within "${nicheTopic}"
- Include questions about specific dates, people, events, or details unique to "${nicheTopic}"
- Focus on trivia that only true enthusiasts of "${nicheTopic}" would know

For EACH question, include:
1. A main topic (MUST be "${nicheTopic}")
2. A specific subtopic that represents a specialized area within "${nicheTopic}"
3. A precise branch that represents a very specific sub-area within the subtopic
4. 3-5 specific, descriptive tags related to the question content within "${nicheTopic}"
5. Four answer choices with only one correct
6. Difficulty level (easy, medium, hard)
7. A "learning capsule" providing interesting additional context about the answer
8. The tone ("educational", "fun", "challenging", "neutral")
9. Format ("multiple_choice")

IMPORTANT: Respond ONLY with a valid JSON array containing the question objects.
DO NOT include any text before or after the JSON array.
ONLY return a JSON array in this exact format:
[
  {
    "question": "Concise, clear question about ${nicheTopic}?",
    "answers": [
      {"text": "Short correct answer", "isCorrect": true},
      {"text": "Brief wrong answer 1", "isCorrect": false},
      {"text": "Brief wrong answer 2", "isCorrect": false},
      {"text": "Brief wrong answer 3", "isCorrect": false}
    ],
    "category": "${nicheTopic}",
    "subtopic": "Specific Subtopic within ${nicheTopic}",
    "branch": "Precise Branch within the subtopic",
    "difficulty": "easy|medium|hard",
    "learningCapsule": "Fascinating fact about the answer that provides additional context",
    "tags": ["specific_tag1", "specific_tag2", "specific_tag3", "specific_tag4"],
    "tone": "educational|fun|challenging|neutral",
    "format": "multiple_choice"
  },
  // more questions...
]`;
}

/**
 * Common function to call OpenAI for generation
 */
async function callOpenAIForGeneration(prompt: string, mode: 'general' | 'niche'): Promise<GeneratedQuestion[]> {
  const model = 'gpt-4.1-mini'; // Make this easier to change if needed
  console.log(`[GENERATOR] Making request to edge function for ${mode} generation`);

  // Get Supabase credentials from environment variables or Constants
  let SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  let SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Fallback to Constants.expoConfig if env vars are not available
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    if (Constants.expoConfig?.extra?.supabaseUrl) {
      SUPABASE_URL = Constants.expoConfig.extra.supabaseUrl;
    }
    if (Constants.expoConfig?.extra?.supabaseAnonKey) {
      SUPABASE_KEY = Constants.expoConfig.extra.supabaseAnonKey;
    }
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[GENERATOR] Missing Supabase credentials. Check environment variables or app.config.js');
    throw new Error('Missing Supabase credentials');
  }

  console.log('[GENERATOR] Using Supabase URL:', SUPABASE_URL);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    console.log(`\n\n====================== ${mode.toUpperCase()} OPENAI SERVICE LOGS ======================`);
    console.log(`[OPENAI] Starting ${mode} question generation`);
    
    // Log the entire prompt being sent to OpenAI
    console.log(`\n\n🔥🔥🔥 COMPLETE PROMPT SENT TO OPENAI 🔥🔥🔥`);
    console.log(`=====================================================`);
    console.log(prompt);
    console.log(`=====================================================`);
    console.log(`🔥🔥🔥 END OF PROMPT 🔥🔥🔥\n\n`);

    const { data, error } = await supabase.functions.invoke('generateTriviaQuestions', {
      body: {
        model,
        messages: [
          {
            role: 'system',
            content: mode === 'niche' 
              ? `You are a specialized trivia question generator that creates high-quality, factually accurate questions focused exclusively on niche topics. ACCURACY IS PARAMOUNT - every single fact, date, name, statistic, and detail must be 100% verified and fact-checked against multiple reliable, authoritative sources before inclusion. Cross-reference all information with encyclopedias, academic sources, and official records. You must ONLY respond with a valid JSON array without any additional text, formatting, or explanations. Focus deeply on the specified niche topic and ensure all questions remain within that domain. Never include unverified, speculative, or potentially incorrect information. When in doubt about any fact, choose a different, verifiable fact instead.`
              : 'You are a specialized trivia question generator that creates high-quality, factually accurate questions with detailed categorization for a trivia app. ACCURACY IS PARAMOUNT - every single fact, date, name, statistic, and detail must be 100% verified and fact-checked against multiple reliable, authoritative sources before inclusion. Cross-reference all information with encyclopedias, academic sources, and official records. You must ONLY respond with a valid JSON array without any additional text, formatting, or explanations. Never include unverified, speculative, or potentially incorrect information. When in doubt about any fact, choose a different, verifiable fact instead.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      }
    });

    console.log('[GENERATOR] Full response:', {
      error: error
    });

    if (error) {
      console.error('[GENERATOR] Edge function error:', error);
      throw new Error(`Edge function error: ${error.message}`);
    }

    // Parse the response data if it's a string
    let parsedData;
    try {
      parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('[GENERATOR] Parsed response data:', {
        type: typeof parsedData,
        hasChoices: !!parsedData?.choices,
        choicesLength: parsedData?.choices?.length
      });
    } catch (parseError) {
      console.error('[GENERATOR] Error parsing response data:', parseError);
      console.error('[GENERATOR] Raw data:', data);
      throw new Error('Failed to parse response from Edge Function');
    }

    // Extract content from the chat completion response
    const content = parsedData?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[GENERATOR] Response data structure:', {
        parsedData,
        choices: parsedData?.choices,
        firstChoice: parsedData?.choices?.[0],
        message: parsedData?.choices?.[0]?.message
      });
      throw new Error('Missing content in OpenAI response');
    }

    try {
      // Parse the content as JSON
      const questions = JSON.parse(content) as GeneratedQuestion[];
      console.log(`[GENERATOR] Successfully parsed ${mode} questions:`, questions.length);
      
      // Validate the questions array
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array of questions');
      }

      // Add metadata to each question
      return questions.map(q => ({
        ...q,
        source: 'generated',
        created_at: new Date().toISOString()
      }));
    } catch (parseError) {
      console.error('[GENERATOR] Error parsing questions:', parseError);
      console.error('[GENERATOR] Raw content:', content);
      throw new Error('Failed to parse questions from response');
    }

  } catch (e) {
    console.error(`[OPENAI SERVICE] Error generating ${mode} questions:`, e);
    throw e;
  }
}

/**
 * Generate a fingerprint for a question to detect duplicates
 */
export function generateQuestionFingerprint(question: string, tags: string[]): string {
  // Normalize the question text: lowercase, remove punctuation, extra spaces
  const normalizedQuestion = question
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Sort and join tags
  const normalizedTags = [...tags].sort().join('|').toLowerCase();

  // Create a simple hash by combining normalized text
  return `${normalizedQuestion}|${normalizedTags}`;
}

/**
 * Generate an enhanced fingerprint that includes intent and entity recognition
 * This provides more accurate duplicate detection by understanding question meaning
 */
export function generateEnhancedFingerprint(question: string, tags: string[] = []): string {
  // Extract the basic intent of the question (what, where, when, who, how many)
  const intent = extractQuestionIntent(question);
  
  // Extract named entities from the question
  const entities = extractNamedEntities(question);
  
  // Normalize the question text as in the original function
  const normalizedQuestion = question
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Sort and join tags
  const normalizedTags = [...tags].sort().join('|').toLowerCase();
  
  // Create enhanced fingerprint with intent and entities
  return `${intent}|${entities.join('|')}|${normalizedQuestion}|${normalizedTags}`;
}

/**
 * Extract the primary intent of a question
 */
function extractQuestionIntent(question: string): string {
  if (!question) return 'unknown';
  
  const text = question.toLowerCase();
  
  // Questions asking for dates/years
  if ((text.includes('year') || text.includes('date') || text.includes('when')) && 
       /\b(occur|happened|established|founded|created|built|launched|released|started)\b/.test(text)) {
    return 'temporal';
  }
  
  // Questions asking for places/locations
  if ((text.includes('where') || text.includes('location') || text.includes('place')) ||
      (text.includes('which') && 
       (text.includes('country') || text.includes('city') || text.includes('continent') || 
        text.includes('region') || text.includes('located')))) {
    return 'spatial';
  }
  
  // Questions asking about people
  if (text.includes('who') || 
      (text.includes('which') && (text.includes('person') || text.includes('individual') || 
                                 text.includes('actor') || text.includes('actress') || 
                                 text.includes('scientist') || text.includes('artist')))) {
    return 'person';
  }
  
  // Questions asking for quantities or measurements
  if ((text.includes('how many') || text.includes('how much')) || 
      (text.includes('number of') || text.includes('amount of') || 
       text.includes('percentage') || text.includes('proportion'))) {
    return 'quantitative';
  }
  
  // Known-for pattern detection
  if (/\b(known|famous|recognized|remembered|celebrated)\s+(for|as)\b/.test(text)) {
    return 'attribute';
  }
  
  // Questions about works/creations
  if (/\b(paint|wrote|directed|composed|created|designed|built|constructed)\b/.test(text)) {
    return 'creation';
  }
  
  // Default to a generic intent based on the first question word
  if (text.includes('what')) return 'definition';
  if (text.includes('which')) return 'selection';
  if (text.includes('why')) return 'causation';
  if (text.includes('how')) return 'process';
  
  return 'unknown';
}

/**
 * Extract named entities from question text
 */
function extractNamedEntities(text: string): string[] {
  if (!text) return [];
  
  const entities: string[] = [];
  
  // Simple named entity extraction using capitalization
  const words = text.split(/\s+/);
  let currentEntity: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Skip first word of sentence and common words even if capitalized
    const isFirstWord = i === 0 || words[i-1].match(/[.!?]$/);
    const isCommonWord = /^(The|A|An|In|On|Of|For|And|But|Or|Not|Is|Are|Was|Were|Be|Been|Being)$/i.test(word);
    
    if (word.match(/^[A-Z][a-z]+/) && !isFirstWord && !isCommonWord) {
      currentEntity.push(word);
    } else if (currentEntity.length > 0) {
      entities.push(currentEntity.join(' ').toLowerCase());
      currentEntity = [];
    }
  }
  
  // Add any remaining entity
  if (currentEntity.length > 0) {
    entities.push(currentEntity.join(' ').toLowerCase());
  }
  
  // Also extract quoted entities
  const quoteRegex = /'([^']+)'|"([^"]+)"|'([^']+)'|"([^"]+)"/g;
  let match;
  
  while ((match = quoteRegex.exec(text)) !== null) {
    const entity = match[1] || match[2] || match[3] || match[4];
    if (entity && entity.length > 2) {
      entities.push(entity.toLowerCase());
    }
  }
  
  return [...new Set(entities)]; // Remove duplicates
}

/**
 * Calculate similarity between two fingerprints
 */
export function calculateFingerprintSimilarity(fp1: string, fp2: string): number {
  if (!fp1 || !fp2) return 0;
  
  // Split fingerprints into their components
  const [intent1, entities1, question1, tags1] = fp1.split('|', 4);
  const [intent2, entities2, question2, tags2] = fp2.split('|', 4);
  
  // Calculate intent similarity (same/different)
  const intentSimilarity = intent1 === intent2 ? 1.0 : 0.0;
  
  // Calculate entity similarity
  let entitySimilarity = 0;
  if (entities1 && entities2) {
    const entitiesArr1 = entities1.split('|');
    const entitiesArr2 = entities2.split('|');
    
    // Find common entities
    const commonEntities = entitiesArr1.filter(e => entitiesArr2.includes(e));
    entitySimilarity = commonEntities.length / Math.max(entitiesArr1.length, entitiesArr2.length) || 0;
  }
  
  // Calculate question text similarity using our string similarity function
  const textSimilarity = question1 && question2 ? calculateLevenshteinSimilarity(question1, question2) : 0;
  
  // Calculate tag similarity
  let tagSimilarity = 0;
  if (tags1 && tags2) {
    const tagsArr1 = tags1.split('|');
    const tagsArr2 = tags2.split('|');
    
    // Find common tags
    const commonTags = tagsArr1.filter(t => tagsArr2.includes(t));
    tagSimilarity = commonTags.length / Math.max(tagsArr1.length, tagsArr2.length) || 0;
  }
  
  // Weight the different components
  return (
    0.5 * textSimilarity +    // Text similarity matters most
    0.3 * entitySimilarity +  // Entities matter second most
    0.1 * intentSimilarity +  // Intent similarity
    0.1 * tagSimilarity       // Tags matter least
  );
}

/**
 * Helper function for calculating Levenshtein-based string similarity
 * (Wrapper around the existing calculateStringSimilarity function)
 */
function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  // Normalize strings
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();
  
  // Quick check for exact match
  if (a === b) return 1;
  
  // Calculate Levenshtein distance
  const matrix = [];
  
  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) === a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1, // substitution
          matrix[i][j-1] + 1,   // insertion
          matrix[i-1][j] + 1    // deletion
        );
      }
    }
  }
  
  // Convert distance to similarity score between 0 and 1
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1; // Both strings are empty
  
  return 1 - matrix[b.length][a.length] / maxLen;
}

/**
 * Check if a question already exists in the database
 */
export async function checkQuestionExists(fingerprint: string): Promise<boolean> {
  try {
    // First try to check by fingerprint for exact matches
    const tableName = getTriviaTableName();
    const { data: fingerprintData, error: fingerprintError } = await supabase
      .from(tableName)
      .select('id')
      .eq('fingerprint', fingerprint)
      .limit(1);

    if (fingerprintError) {
      console.error('Error checking fingerprint existence:', fingerprintError);

      // If the column doesn't exist yet, this will fall back to question_text check
      if (fingerprintError.message.includes('column "fingerprint" does not exist')) {
        console.log('[GENERATOR] Fingerprint column not found, falling back to question text comparison');
        return fallbackQuestionCheck(fingerprint);
      }

      throw fingerprintError;
    }

    // If we found a match by fingerprint
    if (fingerprintData && fingerprintData.length > 0) {
      console.log('[GENERATOR] Found existing question with matching fingerprint');
      return true;
    }

    // If no exact fingerprint match, do a similarity check
    return checkQuestionSimilarity(fingerprint);
  } catch (error) {
    console.error('Error checking question existence:', error);
    return false; // Assume question doesn't exist if there's an error
  }
}

/**
 * Check if a question is similar to any existing questions
 * Considers questions with 1-3 word differences as duplicates
 */
async function checkQuestionSimilarity(fingerprint: string): Promise<boolean> {
  // Import feature flag service dynamically to avoid circular dependencies
  const { isQuestionSimilarityCheckEnabled } = await import('./featureFlagService');
  
  // Check if similarity checking feature is enabled
  if (!isQuestionSimilarityCheckEnabled()) {
    console.log('[GENERATOR] Question similarity check is disabled. You can enable it in the feature flag settings (Admin → App Configuration).');
    return false; // Skip similarity check when feature is disabled
  }

  try {
    // Extract just the question part from the fingerprint (before the first |)
    const normalizedQuestion = fingerprint.split('|')[0];
    const questionWords = new Set(normalizedQuestion.split(' '));

    // Get all questions to check for similarity
    const tableName = getTriviaTableName();
    const { data: questions, error } = await supabase
      .from(tableName)
      .select('id, question_text, fingerprint');

    if (error) {
      console.error('Error in similarity check:', error);
      return false;
    }

    // If we have results, check each one for similarity
    if (questions && questions.length > 0) {
      console.log(`[GENERATOR] Checking similarity against ${questions.length} questions...`);

      for (const question of questions) {
        if (!question.question_text) continue;

        // Get the normalized question text from the fingerprint or normalize it
        let storedNormalized: string;
        if (question.fingerprint) {
          storedNormalized = question.fingerprint.split('|')[0];
        } else {
          storedNormalized = question.question_text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }

        // Get words from stored question
        const storedWords = new Set(storedNormalized.split(' '));

        // Calculate word differences
        const uniqueToNew = [...questionWords].filter(word => !storedWords.has(word));
        const uniqueToStored = [...storedWords].filter(word => !questionWords.has(word));

        // If total word differences is 3 or less, consider it a duplicate
        if (uniqueToNew.length + uniqueToStored.length <= 3) {
          console.log('[GENERATOR] Found similar existing question:');
          console.log('  New:     ', normalizedQuestion);
          console.log('  Existing:', storedNormalized);
          console.log('  Diff words:', [...uniqueToNew, ...uniqueToStored].join(', '));
          return true;
        }
        
        // ENHANCEMENT: Add semantic similarity check using enhanced fingerprints
        try {
          // Generate enhanced fingerprints for better comparison
          const enhancedFingerprintNew = generateEnhancedFingerprint(normalizedQuestion);
          const enhancedFingerprintStored = generateEnhancedFingerprint(question.question_text);
          
          // Calculate semantic similarity between the fingerprints
          const semanticSimilarity = calculateFingerprintSimilarity(
            enhancedFingerprintNew,
            enhancedFingerprintStored
          );
          
          // If the semantic similarity is high, consider it a duplicate
          if (semanticSimilarity > 0.75) {
            console.log('[GENERATOR] Found semantically similar question:');
            console.log('  New:     ', normalizedQuestion);
            console.log('  Existing:', storedNormalized);
            console.log('  Semantic similarity:', semanticSimilarity.toFixed(2));
            return true;
          }
        } catch (semanticError) {
          // If semantic check fails, fall back to word-based comparison only
          console.warn('[GENERATOR] Semantic similarity check failed, using only word-based comparison');
        }
      }
    }

    return false; // No similar questions found
  } catch (error) {
    console.error('Error in similarity check:', error);
    return false;
  }
}

/**
 * Fallback check for question existence using normalized text
 * This is used when fingerprint column isn't available or as a secondary check
 */
async function fallbackQuestionCheck(fingerprint: string): Promise<boolean> {
  try {
    // Extract just the question part from the fingerprint (before the first |)
    const normalizedQuestion = fingerprint.split('|')[0];

    // Check for similar questions by normalized text
    const tableName = getTriviaTableName();
    const { data, error } = await supabase
      .from(tableName)
      .select('id, question_text')
      .limit(10); // Get a few questions to compare

    if (error) {
      console.error('Error in fallback question check:', error);
      return false;
    }

    // If we have results, check each one for similarity
    if (data && data.length > 0) {
      // For each question, normalize it and compare
      for (const question of data) {
        if (!question.question_text) continue;

        // Normalize the stored question the same way we normalize the fingerprint
        const storedNormalized = question.question_text
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // If the normalized texts match closely
        if (storedNormalized === normalizedQuestion ||
          storedNormalized.includes(normalizedQuestion) ||
          normalizedQuestion.includes(storedNormalized)) {
          console.log('[GENERATOR] Found similar existing question in fallback check');
          return true;
        }
      }
    }

    return false; // No similar questions found
  } catch (error) {
    console.error('Error in fallback question check:', error);
    return false;
  }
} 