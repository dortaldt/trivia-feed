import { useCallback, useRef, useState } from 'react';
import { runQuestionGeneration } from '../lib/questionGeneratorService';
import { logGeneratorEvent } from '../lib/syncService';
import { supabase } from '../lib/supabaseClient';

// Interface for storing recent question data
interface RecentQuestionData {
  id: string;
  topic: string;
  subtopic?: string;
  branch?: string;
  tags?: string[];
  timestamp: number;
  questionText?: string;
}

/**
 * Hook to handle question generation logic
 * This separates the generation logic from components for easier integration
 */
export function useQuestionGenerator() {
  // Use a ref to track when the last generation was attempted to prevent multiple calls
  const lastGenerationAttemptRef = useRef<number>(0);
  
  // Keep a client-side count of answered questions since last generation
  const answeredQuestionsRef = useRef<Record<string, number>>({});
  
  // Track recent interactions directly in the client
  const recentInteractionsRef = useRef<Record<string, RecentQuestionData[]>>({});
  
  /**
   * Add a question to the recent interactions tracking
   * Call this when a user answers a question
   */
  const trackQuestionInteraction = useCallback((
    userId: string, 
    questionId: string, 
    topic: string, 
    subtopic?: string, 
    branch?: string, 
    tags?: string[],
    questionText?: string
  ) => {
    if (!userId || !questionId) return;
    
    // Initialize the user's data if it doesn't exist
    if (!recentInteractionsRef.current[userId]) {
      recentInteractionsRef.current[userId] = [];
    }
    
    // Add the new interaction to the beginning of the array
    recentInteractionsRef.current[userId].unshift({
      id: questionId,
      topic,
      subtopic,
      branch,
      tags,
      timestamp: Date.now(),
      questionText
    });
    
    // Limit the number of stored interactions to the most recent 20
    if (recentInteractionsRef.current[userId].length > 20) {
      recentInteractionsRef.current[userId] = 
        recentInteractionsRef.current[userId].slice(0, 20);
    }
    
    console.log(`[GENERATOR_HOOK] Tracked interaction with question ${questionId} (topic: ${topic})`);
  }, []);

  /**
   * Try to generate questions for a user if needed
   * Can be called after a user answers questions
   */
  const triggerQuestionGeneration = useCallback(async (userId: string) => {
    // Performance tracker ⏱️ - Question Generation Trigger START
    const questionGenStart = performance.now();
    console.log(`[Performance tracker ⏱️] Question Generation Trigger - Started: ${questionGenStart.toFixed(2)}ms`);
    
    if (!userId) {
      // Performance tracker ⏱️ - Question Generation Trigger END (early return)
      const questionGenEnd = performance.now();
      console.log(`[Performance tracker ⏱️] Question Generation Trigger - Ended (early): ${questionGenEnd.toFixed(2)}ms | Duration: ${(questionGenEnd - questionGenStart).toFixed(2)}ms`);
      return;
    }
    
    // Check if we've attempted generation recently (within last 30 seconds)
    const now = Date.now();
    if (lastGenerationAttemptRef.current && (now - lastGenerationAttemptRef.current) < 30000) {
      console.log('[GENERATOR_HOOK] Skipping generation - attempted recently');
      // Performance tracker ⏱️ - Question Generation Trigger END (recent attempt)
      const questionGenEnd = performance.now();
      console.log(`[Performance tracker ⏱️] Question Generation Trigger - Ended (recent attempt): ${questionGenEnd.toFixed(2)}ms | Duration: ${(questionGenEnd - questionGenStart).toFixed(2)}ms`);
      return;
    }
    
    // Mark that we're attempting generation now
    lastGenerationAttemptRef.current = now;
    
    try {
      console.log('[GENERATOR_HOOK] Attempting to trigger question generation...');
      
      // Get user interactions from client-side storage
      const userIdentifier = userId;
      const userInteractions = recentInteractionsRef.current[userIdentifier] || [];
      
      // Build topic preferences from client-side interactions
      const clientRecentTopics: string[] = [];
      const clientRecentSubtopics: string[] = [];
      const clientRecentBranches: string[] = [];
      const clientRecentTags: string[] = [];
      
      // Create weight tracking objects for better topic prioritization
      const topicWeights: Record<string, number> = {};
      const subtopicWeights: Record<string, number> = {};
      const branchWeights: Record<string, number> = {};
      const tagWeights: Record<string, number> = {};
      
      // Track combinations for enhanced generation
      const topicSubtopicCombos: string[] = [];
      const topicBranchCombos: string[] = [];
      
      if (userInteractions.length > 0) {
        console.log(`[GENERATOR_HOOK] Using ${userInteractions.length} client-side interactions for topic generation`);
        
        // Log a few recent interactions for debugging
        console.log('[GENERATOR_HOOK] Recent interactions sample:');
        userInteractions.slice(0, 3).forEach((interaction, idx) => {
          console.log(`  [${idx}] Topic: ${interaction.topic}, Subtopic: ${interaction.subtopic || 'N/A'}, Branch: ${interaction.branch || 'N/A'}, Tags: ${interaction.tags?.join(', ') || 'N/A'}`);
        });
        
        // Extract topics from client-side history with recency-based weighting
        userInteractions.forEach((interaction, index) => {
          // Calculate recency weight - more recent interactions get higher weight
          // Scale from 1.0 (most recent) down to 0.5 (oldest)
          const recencyWeight = 1.0 - (index / userInteractions.length * 0.5);
          
          // Add topic with weight
          if (interaction.topic) {
            if (!clientRecentTopics.includes(interaction.topic)) {
              clientRecentTopics.push(interaction.topic);
            }
            topicWeights[interaction.topic] = (topicWeights[interaction.topic] || 0) + recencyWeight;
          }
          
          // Add subtopic with weight
          if (interaction.subtopic) {
            if (!clientRecentSubtopics.includes(interaction.subtopic)) {
              clientRecentSubtopics.push(interaction.subtopic);
            }
            subtopicWeights[interaction.subtopic] = (subtopicWeights[interaction.subtopic] || 0) + recencyWeight;
            
            // Create and track topic+subtopic combination
            const topicSubtopic = `${interaction.topic}:${interaction.subtopic}`;
            if (!topicSubtopicCombos.includes(topicSubtopic)) {
              topicSubtopicCombos.push(topicSubtopic);
            }
          }
          
          // Add branch with weight
          if (interaction.branch) {
            if (!clientRecentBranches.includes(interaction.branch)) {
              clientRecentBranches.push(interaction.branch);
            }
            branchWeights[interaction.branch] = (branchWeights[interaction.branch] || 0) + recencyWeight;
            
            // Create and track topic+branch combination
            if (interaction.topic) {
              const topicBranch = `${interaction.topic}:${interaction.branch}`;
              if (!topicBranchCombos.includes(topicBranch)) {
                topicBranchCombos.push(topicBranch);
              }
            }
          }
          
          // Add tags with weight
          if (interaction.tags && Array.isArray(interaction.tags)) {
            interaction.tags.forEach(tag => {
              if (!clientRecentTags.includes(tag)) {
                clientRecentTags.push(tag);
              }
              tagWeights[tag] = (tagWeights[tag] || 0) + recencyWeight;
            });
          }
        });
        
        // Sort topics by weight for better prioritization
        const sortedTopics = Object.entries(topicWeights)
          .sort((a, b) => b[1] - a[1])
          .map(([topic]) => topic);
        
        // Use the sorted topics instead of unsorted ones
        if (sortedTopics.length > 0) {
          clientRecentTopics.length = 0; // Clear the array
          clientRecentTopics.push(...sortedTopics);
        }
        
        // Create a mixed array of primary topics for question generation
        // This will include a mix of regular topics, topic+subtopic combinations, and topic+branch combinations
        const enhancedTopics: string[] = [];
        
        // Add top regular topics (up to 3)
        enhancedTopics.push(...clientRecentTopics.slice(0, 3));
        
        // Add topic+subtopic combinations (up to 2)
        enhancedTopics.push(...topicSubtopicCombos.slice(0, 2));
        
        // Add topic+branch combinations (up to 2)
        enhancedTopics.push(...topicBranchCombos.slice(0, 2));
        
        console.log('[GENERATOR_HOOK] Enhanced topics with combinations:', enhancedTopics);
        
        // Attempt question generation with enhanced topics and client-side preferences
        const success = await runQuestionGeneration(
          userId,
          enhancedTopics,  // Use enhanced topics
          clientRecentSubtopics,
          clientRecentBranches,
          clientRecentTags
        );
        
        console.log('[GENERATOR_HOOK] Question generation result:', success);
      } else {
        console.log('[GENERATOR_HOOK] No client-side interactions found, using basic generation');
        
        // Fallback to basic question generation if no client interactions
        const success = await runQuestionGeneration(userId);
        console.log('[GENERATOR_HOOK] Basic question generation result:', success);
      }
    } catch (error) {
      console.error('[GENERATOR_HOOK] Error during question generation:', error);
    }
    
    // Performance tracker ⏱️ - Question Generation Trigger END
    const questionGenEnd = performance.now();
    console.log(`[Performance tracker ⏱️] Question Generation Trigger - Ended: ${questionGenEnd.toFixed(2)}ms | Duration: ${(questionGenEnd - questionGenStart).toFixed(2)}ms`);
  }, []);
  
  /**
   * Generate questions directly without checking database counts
   * This bypasses the shouldGenerateQuestions check
   */
  const generateQuestionsDirectly = async (
    userId: string,
    clientTopics: string[] = [],
    clientSubtopics: string[] = [],
    clientBranches: string[] = [],
    clientTags: string[] = []
  ): Promise<boolean> => {
    try {
      // Prepare topics for generation
      let primaryTopics: string[] = [];
      
      // Prepare recent questions to avoid duplication
      let recentQuestions: {id: string, questionText: string}[] = [];
      
      // Extract recent questions from client-side interactions
      if (recentInteractionsRef.current[userId]) {
        // Get interactions that have question text
        recentQuestions = recentInteractionsRef.current[userId]
          .filter(interaction => interaction.questionText)
          .map(interaction => ({
            id: interaction.id,
            questionText: interaction.questionText || ''
          }));
          
        if (recentQuestions.length > 0) {
          console.log(`[GENERATOR_HOOK] Found ${recentQuestions.length} recent questions with text to avoid duplication`);
        }
      }
      
      // Use client-side topics if available, otherwise fall back to database
      if (clientTopics.length > 0) {
        // Check for hierarchical topics (topic:subtopic or topic:branch format)
        const hasHierarchicalTopics = clientTopics.some(topic => topic.includes(':'));
        
        // Use client-provided topics directly
        primaryTopics = clientTopics;
        console.log(`[GENERATOR_HOOK] Using ${clientTopics.length} client-side topics for generation`);
      } else {
        // Fall back to database query if no client data
        console.log('[GENERATOR_HOOK] No client topics available, querying database');
        
        const { data: answerData } = await supabase
          .from('user_answers')
          .select('question_id')
          .eq('user_id', userId)
          .order('answer_time', { ascending: false })
          .limit(10);
          
        // Extract question IDs
        const questionIds = answerData?.map((item: { question_id: string }) => item.question_id) || [];
        
        // Get topics from these questions
        const { data: questionData } = await supabase
          .from('trivia_questions')
          .select('topic')
          .in('id', questionIds);
          
        // Extract unique topics
        primaryTopics = Array.from(new Set(
          questionData?.map((item: { topic: string }) => item.topic).filter(Boolean) || []
        ));
      }
      
      // Use default topics if we don't have enough
      if (primaryTopics.length === 0) {
        primaryTopics = ['Science', 'History', 'Geography'];
        console.log('[GENERATOR_HOOK] No topics found, using defaults');
      }
      
      console.log(`[GENERATOR_HOOK] Final topics for generation: ${primaryTopics.join(', ')}`);
      
      // Call the actual generation process with all the client data
      return await runQuestionGeneration(
        userId, 
        primaryTopics,
        clientSubtopics,
        clientBranches,
        clientTags,
        recentQuestions
      );
    } catch (error) {
      console.error('[GENERATOR_HOOK] Error generating questions directly:', error);
      return false;
    }
  };

  // This function can be called to manually reset the counter (for testing)
  const resetQuestionCounter = useCallback((userId: string) => {
    if (userId && answeredQuestionsRef.current[userId]) {
      answeredQuestionsRef.current[userId] = 0;
      console.log(`[GENERATOR_HOOK] Manually reset question counter for user ${userId}`);
    }
  }, []);

  return {
    triggerQuestionGeneration,
    resetQuestionCounter,
    trackQuestionInteraction
  };
} 