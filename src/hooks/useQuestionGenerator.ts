import { useCallback } from 'react';
import { runQuestionGeneration, shouldGenerateQuestions } from '../lib/questionGeneratorService';
import { logGeneratorEvent } from '../lib/syncService';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook to handle question generation logic
 * This separates the generation logic from components for easier integration
 */
export function useQuestionGenerator() {
  /**
   * Try to generate questions for a user if needed
   * Can be called after a user answers questions
   */
  const triggerQuestionGeneration = useCallback(async (userId: string) => {
    if (!userId) {
      return false;
    }
    
    try {
      // First check if the user has answered at least 5 questions before logging anything
      const { count: answerCount, error: countError } = await supabase
        .from('user_answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (countError) {
        console.error('[GENERATOR] Error checking answer count in hook:', countError);
        return false;
      }
      
      // Skip logging and generation entirely if less than 5 questions answered
      if (!answerCount || answerCount < 5) {
        // No debug message needed for normal operation
        return false;
      }
      
      // Only log after confirming user has answered 5+ questions
      logGeneratorEvent(
        userId,
        [],
        [],
        0,
        0,
        false, 
        undefined,
        'checking'
      );
      
      // Run question generation process asynchronously
      const result = await runQuestionGeneration(userId);
      
      return result;
    } catch (error) {
      console.error('[GENERATOR] Error in generation hook:', error);
      
      // Only log errors if we've previously confirmed 5+ questions
      logGeneratorEvent(
        userId,
        [],
        [],
        0,
        0,
        false,
        error instanceof Error ? error.message : 'Unknown error in useQuestionGenerator hook'
      );
      
      return false;
    }
  }, []);

  return {
    triggerQuestionGeneration
  };
} 