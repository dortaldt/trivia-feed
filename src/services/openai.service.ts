/**
 * OpenAI Service
 * 
 * This service provides an interface to the OpenAI capabilities via our Supabase Edge Function.
 * It handles authentication, error handling, and retries for all OpenAI-related operations.
 */

import { supabase } from '../lib/supabase';
import { handleOpenAIError, AppError } from '../utils/error-handling';
import { cacheService } from './cache.service';

/**
 * Parameters for generating text using OpenAI
 */
export interface OpenAITextParams {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Parameters for generating related questions
 */
export interface GenerateQuestionsParams {
  currentQuestion: string;
  topic: string;
  difficulty?: string;
  _timestamp?: number;
}

/**
 * Structure of a generated question
 */
export interface GeneratedQuestion {
  question: string;
  difficulty: string;
  explanation: string;
}

/**
 * Service for interacting with OpenAI via our Supabase Edge Function
 */
class OpenAIService {
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000; // ms
  
  /**
   * Generate text using OpenAI models
   * 
   * @param params Parameters for text generation
   * @returns The generated text
   * @throws AppError if an error occurs
   */
  async generateText(params: OpenAITextParams): Promise<string> {
    try {
      // For text generation, we don't cache results because they should be unique each time
      return await this.callOpenAIFunction('generateText', params);
    } catch (error) {
      throw handleOpenAIError(error);
    }
  }
  
  /**
   * Generate related questions based on a current question
   * 
   * @param params Parameters including the current question, topic, and difficulty
   * @returns Array of generated questions with varying difficulties
   * @throws AppError if an error occurs
   */
  async generateQuestions(params: GenerateQuestionsParams): Promise<any> {
    try {
      console.log('OpenAIService: Generating questions with params:', JSON.stringify(params));
      
      // Add cache-busting timestamp to ensure a fresh request
      const requestParams = {
        ...params,
        _timestamp: Date.now() // Add random timestamp to prevent caching
      };
      
      const { data, error } = await supabase.functions.invoke('openai-proxy', {
        body: {
          action: 'generateQuestions',
          params: requestParams
        }
      });
      
      if (error) {
        console.error('OpenAIService: Error generating questions:', error);
        throw new Error(`Failed to generate questions: ${error.message}`);
      }
      
      console.log('OpenAIService: Received response:', JSON.stringify(data));
      
      if (!data) {
        throw new Error('No data returned from OpenAI proxy');
      }
      
      return data;
    } catch (error) {
      console.error('OpenAIService: Unexpected error:', error);
      throw error;
    }
  }
  
  /**
   * Generic function to call OpenAI proxy with retry logic
   * 
   * @param action The action to perform (e.g., 'generateText', 'generateQuestions')
   * @param params The parameters for the action
   * @returns The result from the OpenAI proxy
   */
  private async callOpenAIFunction<T, R>(action: string, params: T): Promise<R> {
    let retries = 0;
    let lastError: any = null;
    
    while (true) {
      try {
        console.log(`OpenAI function call attempt ${retries + 1}/${this.MAX_RETRIES + 1} for action: ${action}`);
        
        // Get the current session to ensure we're authenticated
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Authentication required');
        }
        
        if (!sessionData.session) {
          console.error('No active session found');
          throw new Error('Authentication required');
        }
        
        console.log('Session authenticated, calling Edge Function');
        
        // Call the Edge Function with the provided action and parameters
        const { data, error } = await supabase.functions.invoke('openai-proxy', {
          body: {
            action,
            params,
          },
        });
        
        if (error) {
          console.error('Edge Function error:', error);
          throw new Error(error.message);
        }
        
        console.log('Edge Function response:', JSON.stringify(data));
        
        // The Edge Function returns { data: result }, so we access the data property
        if (data && typeof data === 'object' && 'data' in data) {
          return data.data as R;
        }
        
        return data as R;
      } catch (error) {
        console.error(`OpenAI service error (attempt ${retries + 1}/${this.MAX_RETRIES + 1}):`, error);
        lastError = error;
        
        // Check if we've reached the maximum number of retries
        if (retries >= this.MAX_RETRIES) {
          throw error;
        }
        
        // Increment retry counter and wait before trying again
        retries++;
        
        // Exponential backoff: wait longer with each retry
        const delayTime = this.RETRY_DELAY * retries;
        console.log(`Retrying in ${delayTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }
    }
  }
}

// Export a singleton instance of the service
export const openAIService = new OpenAIService(); 