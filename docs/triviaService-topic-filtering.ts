/**
 * Sample TriviaService Implementation with Topic Filtering
 * 
 * This file shows how to modify the fetch functions in triviaService.ts
 * to filter content based on the active topic.
 * 
 * *** This is a reference implementation, not for direct use ***
 */

import { supabase } from './supabaseClient';
import { getTopicColor } from './colors';
import { getStandardizedTopicName } from '../constants/topics';
import Constants from 'expo-constants';

// Get topic configuration from app config
const { activeTopic, filterContentByTopic, topicDbName } = Constants.expoConfig?.extra || {};
console.log(`TriviaService initialized with topic: ${activeTopic}`);
console.log(`Content filtering: ${filterContentByTopic ? 'Enabled' : 'Disabled'}`);

// Example implementation of fetchTriviaQuestions with topic filtering
export async function fetchTriviaQuestions(limit: number = 20, language: string = 'English'): Promise<FeedItem[]> {
  try {
    console.log('DEBUG: Starting to fetch data from Supabase');
    
    // Add connection test and other existing code...
    
    // If we made it here, the connection test was successful, try to get actual data
    try {
      // First inspect the table structure...
      
      // Build the query with topic filter if enabled
      console.log('DEBUG: Fetching questions from database...');
      
      // Start building the query
      let query = supabase
        .from('trivia_questions')
        .select('*');
      
      // Apply topic filter if configured
      if (filterContentByTopic && activeTopic !== 'default' && topicDbName) {
        console.log(`DEBUG: Filtering questions by topic: ${topicDbName}`);
        
        // Use the exact topic name from the database
        query = query.eq('topic', topicDbName);
        
        // Alternatively, you could use standardized topic name if needed
        // const standardizedTopic = getStandardizedTopicName(topicDbName);
        // query = query.eq('topic', standardizedTopic);
      }
      
      // Execute the query
      const { data, error } = await query;

      console.log('DEBUG: Supabase response:', data ? `Got ${data.length} records` : 'No data', 
        error ? `Error: ${error.message}` : 'No error');
      
      // Add error handling and transformations...
      
      // Rest of the implementation...
    } catch (error) {
      console.error('Error during data retrieval:', error);
      return mockFeedData;
    }
  } catch (error) {
    console.error('Unexpected error while fetching trivia questions:', error);
    return mockFeedData;
  }
}

// Example implementation of fetchNewTriviaQuestions with topic filtering
export async function fetchNewTriviaQuestions(existingIds: string[]): Promise<FeedItem[]> {
  try {
    console.log(`Fetching new questions, excluding ${existingIds.length} existing IDs`);
    
    // Add connection test...
    
    // If we have more than 100 IDs, use a different approach to avoid query size limits
    let data;
    let error;
    
    if (existingIds.length > 100) {
      // For large ID sets, start with a basic query
      let query = supabase
        .from('trivia_questions')
        .select('*');
      
      // Apply topic filter if configured
      if (filterContentByTopic && activeTopic !== 'default' && topicDbName) {
        console.log(`DEBUG: Filtering new questions by topic: ${topicDbName}`);
        query = query.eq('topic', topicDbName);
      }
      
      const response = await query;
      
      data = response.data;
      error = response.error;
      
      // Filter out questions we already have
      if (data && !error) {
        const existingIdSet = new Set(existingIds);
        data = data.filter((q: TriviaQuestion) => !existingIdSet.has(q.id));
      }
    } else {
      // For smaller sets, filter in the query
      let query = supabase
        .from('trivia_questions')
        .select('*')
        .not('id', 'in', existingIds);
      
      // Apply topic filter if configured
      if (filterContentByTopic && activeTopic !== 'default' && topicDbName) {
        console.log(`DEBUG: Filtering new questions by topic: ${topicDbName}`);
        query = query.eq('topic', topicDbName);
      }
      
      const response = await query;
      
      data = response.data;
      error = response.error;
    }
    
    // Rest of the implementation...
  } catch (error) {
    console.error('Error fetching new trivia questions:', error);
    return [];
  }
} 