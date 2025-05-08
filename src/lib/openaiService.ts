import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import Constants from 'expo-constants';

// OpenAI API key should be stored securely
// Get the API key from multiple possible sources
let OPENAI_API_KEY = '';

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
  difficulty: string;
  learningCapsule: string;
  tags: string[];
  source?: string;
  created_at?: string;
}

/**
 * Call OpenAI API to generate trivia questions
 */
export async function generateQuestions(
  primaryTopics: string[],
  adjacentTopics: string[],
  primaryCount: number = 20,
  adjacentCount: number = 10
): Promise<GeneratedQuestion[]> {
  try {
    // Combine topics for the prompt
    const allTopics = [...primaryTopics, ...adjacentTopics];
    
    // Create a structured prompt for ChatGPT
    const prompt = `Generate ${primaryCount + adjacentCount} unique trivia questions. 
    
    ${primaryCount} questions should focus on these primary topics: ${primaryTopics.join(', ')}
    ${adjacentCount} questions should focus on these adjacent topics: ${adjacentTopics.join(', ')}
    
    Each question should include:
    - A challenging but fair multiple-choice question
    - 4 possible answers (only one correct)
    - The correct answer marked
    - A difficulty level (easy, medium, hard)
    - A "learning capsule" that provides interesting additional context about the answer
    - 2-5 relevant tags
    
    Format your response as a JSON array with objects having this structure:
    {
      "question": "The question text",
      "answers": [
        {"text": "Answer 1", "isCorrect": true},
        {"text": "Answer 2", "isCorrect": false},
        {"text": "Answer 3", "isCorrect": false},
        {"text": "Answer 4", "isCorrect": false}
      ],
      "category": "The primary topic/category",
      "difficulty": "easy|medium|hard",
      "learningCapsule": "Interesting fact about the answer",
      "tags": ["tag1", "tag2", "tag3"]
    }
    
    Ensure questions are factually accurate and make each one unique and interesting.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a specialized trivia question generator that creates high-quality, factually accurate questions for a trivia app.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as OpenAIResponse;
    
    // Parse the response to extract the generated questions
    const content = data.choices[0].message.content;
    
    // Find the JSON part in the response (in case there's any explanatory text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse generated questions');
    }
    
    // Parse JSON and validate
    const generatedQuestions = JSON.parse(jsonMatch[0]) as GeneratedQuestion[];
    
    // Add source and timestamp
    return generatedQuestions.map(q => ({
      ...q,
      source: 'generated',
      created_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
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
 * Check if a question already exists in the database
 */
export async function checkQuestionExists(fingerprint: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('trivia_questions')
      .select('id')
      .eq('question_text', fingerprint) // Use question_text as a simple check since we don't have fingerprint
      .limit(1);
    
    if (error) {
      console.error('Error checking question existence:', error);
      throw error;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking question existence:', error);
    return false; // Assume question doesn't exist if there's an error
  }
} 