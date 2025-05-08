import { supabase } from './supabaseClient';
import { UserProfile } from './personalizationService';
import { FeedChange, InteractionLog, WeightFactors, WeightChange } from '../types/trackerTypes';
import { Platform } from 'react-native';
import { EventEmitter } from 'events';

// Create a global event emitter for logging database operations
export const dbEventEmitter = new EventEmitter();

// Helper function to log database operations
export const logDbOperation = (
  direction: 'sent' | 'received',
  table: string,
  operation: 'insert' | 'update' | 'select' | 'upsert' | 'delete',
  records: number,
  data: any,
  userId?: string,
  status: 'success' | 'error' = 'success',
  error?: string
) => {
  // Only log in development mode
  if (!__DEV__) return;
  
  try {
    // Safe copy of data to prevent proxy handler errors
    let safeData: any;
    try {
      // Handle potential circular references or proxy objects
      safeData = JSON.parse(JSON.stringify(data || {}));
    } catch (jsonError) {
      // If JSON serialization fails, create a simplified representation
      safeData = { 
        note: "Original data couldn't be safely serialized",
        type: typeof data,
        isNull: data === null,
        isUndefined: data === undefined
      };
    }
    
    const logData = {
      timestamp: Date.now(),
      direction,
      table,
      operation,
      records,
      data: safeData,
      userId: userId || 'unknown',
      status,
      error: error || null
    };
    
    // Emit the db operation event
    dbEventEmitter.emit('db-operation', logData);
    
    // Also log to console
    console.log(`[DB ${direction.toUpperCase()}] ${operation.toUpperCase()} ${records} records to ${table}`, 
      status === 'error' ? `ERROR: ${error}` : 'Success');
  } catch (loggingError) {
    // Fallback if even our error handling fails
    console.log(`Failed to log DB operation: ${loggingError instanceof Error ? loggingError.message : 'Unknown error'}`);
  }
};

// Get a unique device identifier for tracking sync sources
const getDeviceId = () => {
  const platform = Platform.OS;
  const deviceId = `${platform}-${Date.now()}`;
  return deviceId;
};

/**
 * Syncs the user profile data with Supabase
 */
export async function syncUserProfile(userId: string, userProfile: UserProfile): Promise<void> {
  try {
    if (!userId) {
      console.log('No user ID provided for sync');
      return;
    }

    // Add null check for userProfile
    if (!userProfile) {
      console.log('User profile is null or undefined, cannot sync');
      return;
    }

    console.log('Syncing user profile data for user:', userId);
    
    // First, check if profile exists
    let existingProfile = null;
    let fetchError = null;
    
    try {
      const result = await supabase
        .from('user_profile_data')
        .select('version, last_refreshed')
        .eq('id', userId)
        .single();
      
      existingProfile = result.data;
      fetchError = result.error;
    } catch (supabaseError) {
      console.error('Supabase request failed:', supabaseError);
      return; // Exit early if the database query itself fails
    }
    
    // Safely create the query object for logging
    const queryObject = { 
      id: userId, 
      columns: ['version', 'last_refreshed'] 
    };
    
    // Log the select operation
    logDbOperation(
      'sent', 
      'user_profile_data', 
      'select', 
      1, 
      { query: queryObject },
      userId,
      fetchError && fetchError.code !== 'PGRST116' ? 'error' : 'success',
      fetchError?.message
    );
    
    if (fetchError && fetchError.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching profile data:', fetchError);
      return;
    }
    
    // Log the received data
    if (existingProfile) {
      logDbOperation(
        'received', 
        'user_profile_data', 
        'select', 
        1, 
        existingProfile,
        userId
      );
    }
    
    const deviceId = getDeviceId();
    
    if (!existingProfile) {
      // Profile doesn't exist, create it
      console.log('Creating new profile in database');
      
      // Ensure all properties exist and have default values
      const profileData = {
        id: userId,
        topics: userProfile.topics || {},
        cold_start_complete: userProfile.coldStartComplete || false,
        total_questions_answered: userProfile.totalQuestionsAnswered || 0,
        last_refreshed: userProfile.lastRefreshed || Date.now()
      };
      
      try {
        const { error: insertError } = await supabase
          .from('user_profile_data')
          .insert(profileData);
        
        // Log the insert operation
        logDbOperation(
          'sent', 
          'user_profile_data', 
          'insert', 
          1, 
          profileData,
          userId,
          insertError ? 'error' : 'success',
          insertError?.message
        );
        
        if (insertError) {
          console.error('Error inserting profile data:', insertError);
        }
      } catch (insertError) {
        console.error('Failed to insert profile:', insertError);
      }
    } else {
      // Profile exists, check if we need to update
      console.log('Existing profile found, checking if update needed');
      
      // Make sure lastRefreshed values are properly initialized
      const localLastRefreshed = userProfile.lastRefreshed || 0;
      const serverLastRefreshed = existingProfile.last_refreshed || 0;
      
      // Only update if our data is newer
      if (localLastRefreshed > serverLastRefreshed) {
        console.log('Local profile is newer, updating server');
        
        const updateData = {
          topics: userProfile.topics || {},
          cold_start_complete: userProfile.coldStartComplete || false,
          total_questions_answered: userProfile.totalQuestionsAnswered || 0,
          last_refreshed: localLastRefreshed,
          version: (existingProfile.version || 0) + 1
        };
        
        try {
          const { error: updateError } = await supabase
            .from('user_profile_data')
            .update(updateData)
            .eq('id', userId)
            .eq('version', existingProfile.version || 0); // Optimistic concurrency control
          
          // Safely create query object for logging
          const safeQueryObject = {
            id: userId,
            version: existingProfile.version || 0
          };
          
          // Log the update operation - with safe objects
          logDbOperation(
            'sent', 
            'user_profile_data', 
            'update', 
            1, 
            { query: safeQueryObject, data: updateData },
            userId,
            updateError ? 'error' : 'success',
            updateError?.message
          );
          
          if (updateError) {
            console.error('Error updating profile data:', updateError);
            
            // If error is due to concurrency violation, fetch latest and handle merge
            if (updateError.code === '23514') { // Constraint violation
              console.log('Concurrency conflict detected, handling merge');
              await handleProfileMerge(userId, userProfile);
            }
          }
        } catch (updateError) {
          console.error('Failed to update profile:', updateError);
        }
      } else {
        console.log('Server profile is newer, no update needed');
      }
    }
  } catch (error) {
    // Handle error safely to prevent Proxy handler is null errors
    try {
      // Structured error logging with safety checks
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorStack = error instanceof Error ? error.stack : '';
      
      console.error('Error in syncUserProfile:', {
        name: errorName,
        message: errorMsg,
        userId: userId || 'undefined',
        hasUserProfile: userProfile ? 'yes' : 'no',
        stackPreview: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : 'No stack trace'
      });
      
      // Log the error for debugging
      console.log('DEBUG: syncUserProfile execution failed. Context:', {
        time: new Date().toISOString(),
        userId: typeof userId === 'string' ? userId : 'invalid',
        userProfileValid: userProfile !== null && userProfile !== undefined,
        error: errorMsg
      });
    } catch (nestedError) {
      // Ultimate fallback if even our error handling code fails
      console.log('CRITICAL ERROR: Failed to handle error in syncUserProfile:', 
        nestedError instanceof Error ? nestedError.message : 'Unknown nested error');
    }
  }
}

/**
 * Handles merging local and server profiles in case of conflict
 */
async function handleProfileMerge(userId: string, localProfile: UserProfile): Promise<void> {
  try {
    // Check if localProfile is valid
    if (!userId || !localProfile) {
      console.log('Invalid arguments for profile merge:', {
        hasUserId: !!userId,
        hasLocalProfile: !!localProfile
      });
      return;
    }

    let serverProfile = null;
    let error = null;
    
    // Fetch the latest server profile
    try {
      const result = await supabase
        .from('user_profile_data')
        .select('*')
        .eq('id', userId)
        .single();
      
      serverProfile = result.data;
      error = result.error;
    } catch (fetchError) {
      console.error('Supabase request failed during profile merge:', fetchError);
      return;
    }
    
    // Safely create query object for logging
    const safeQueryObject = { id: userId };
    
    // Log the select operation with safe objects
    logDbOperation(
      'sent', 
      'user_profile_data', 
      'select', 
      1, 
      { query: safeQueryObject, columns: ['*'] },
      userId,
      error ? 'error' : 'success',
      error?.message
    );
    
    if (error) {
      console.error('Error fetching server profile for merge:', error);
      return;
    }
    
    // Verify serverProfile exists
    if (!serverProfile) {
      console.log('Server profile not found, cannot perform merge');
      return;
    }
    
    // Log the received data safely
    logDbOperation(
      'received', 
      'user_profile_data', 
      'select', 
      1, 
      serverProfile,
      userId
    );
    
    // Ensure timestamp values are properly initialized
    const localLastRefreshed = localProfile.lastRefreshed || 0;
    const serverLastRefreshed = serverProfile.last_refreshed || 0;
    
    // TODO: Implement more sophisticated merge logic
    // For now, we'll keep the profile with the most recent lastRefreshed timestamp
    if (localLastRefreshed > serverLastRefreshed) {
      // Local profile is newer, try update again
      const updateData = {
        topics: localProfile.topics || {},
        cold_start_complete: localProfile.coldStartComplete || false,
        total_questions_answered: localProfile.totalQuestionsAnswered || 0,
        last_refreshed: localLastRefreshed,
        version: (serverProfile.version || 0) + 1
      };
      
      try {
        const { error: updateError } = await supabase
          .from('user_profile_data')
          .update(updateData)
          .eq('id', userId)
          .eq('version', serverProfile.version || 0);
        
        // Create safe query object for logging
        const safeUpdateQuery = {
          id: userId,
          version: serverProfile.version || 0
        };
        
        // Log the update operation with safe objects
        logDbOperation(
          'sent', 
          'user_profile_data', 
          'update', 
          1, 
          { query: safeUpdateQuery, data: updateData },
          userId,
          updateError ? 'error' : 'success',
          updateError?.message
        );
        
        if (updateError) {
          console.error('Error during profile merge update:', updateError);
        }
      } catch (updateError) {
        console.error('Failed to execute profile merge update:', updateError);
      }
    }
  } catch (error) {
    // Handle error safely to prevent Proxy handler is null errors
    try {
      // Structured error logging with safety checks
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorStack = error instanceof Error ? error.stack : '';
      
      console.error('Error in handleProfileMerge:', {
        name: errorName,
        message: errorMsg,
        userId: userId || 'undefined',
        hasLocalProfile: localProfile ? 'yes' : 'no',
        stackPreview: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : 'No stack trace'
      });
    } catch (nestedError) {
      // Ultimate fallback
      console.log('CRITICAL ERROR: Failed to handle error in profile merge.');
    }
  }
}

/**
 * Retrieves the user profile from Supabase
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    if (!userId) {
      console.log('No user ID provided for fetch');
      return null;
    }

    console.log('Fetching user profile data for user:', userId);
    
    const { data, error } = await supabase
      .from('user_profile_data')
      .select('*')
      .eq('id', userId)
      .single();
    
    // Log the select operation
    logDbOperation(
      'sent', 
      'user_profile_data', 
      'select', 
      1, 
      { query: { id: userId }, columns: ['*'] },
      userId,
      error ? 'error' : 'success',
      error?.message
    );
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    if (!data) {
      console.log('No profile found for user');
      return null;
    }
    
    // Log the received data
    logDbOperation(
      'received', 
      'user_profile_data', 
      'select', 
      1, 
      data,
      userId
    );
    
    return {
      topics: data.topics || {},
      interactions: {}, // Initialize with empty object
      lastRefreshed: data.last_refreshed,
      coldStartComplete: data.cold_start_complete || false,
      totalQuestionsAnswered: data.total_questions_answered || 0
    };
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
}

/**
 * Syncs user interactions with Supabase
 */
export async function syncUserInteractions(
  userId: string, 
  interactions: InteractionLog[]
): Promise<void> {
  try {
    if (!userId || !interactions.length) {
      return;
    }

    console.log(`Syncing ${interactions.length} user interactions`);
    
    const deviceId = getDeviceId();
    
    // Prepare interactions for insert
    const formattedInteractions = interactions.map(interaction => ({
      user_id: userId,
      question_id: interaction.questionId,
      timestamp: interaction.timestamp,
      time_spent: interaction.timeSpent,
      interaction_type: interaction.type,
      question_text: interaction.questionText,
      synced_from_device: deviceId
    }));
    
    // Insert interactions, ignoring conflicts (we use a unique constraint)
    const { error } = await supabase
      .from('user_interactions')
      .upsert(formattedInteractions, { 
        onConflict: 'user_id,question_id,timestamp',
        ignoreDuplicates: true
      });
    
    // Log the upsert operation
    logDbOperation(
      'sent', 
      'user_interactions', 
      'upsert', 
      interactions.length, 
      { 
        data: formattedInteractions,
        options: { onConflict: 'user_id,question_id,timestamp', ignoreDuplicates: true }
      },
      userId,
      error ? 'error' : 'success',
      error?.message
    );
    
    if (error) {
      console.error('Error syncing interactions:', error);
    } else {
      console.log(`Successfully synced ${interactions.length} interactions`);
    }
  } catch (error) {
    console.error('Error in syncUserInteractions:', error);
  }
}

/**
 * Retrieves user interactions from Supabase
 */
export async function fetchUserInteractions(
  userId: string,
  afterTimestamp?: number
): Promise<InteractionLog[]> {
  try {
    if (!userId) {
      return [];
    }

    console.log('Fetching user interactions');
    
    let query = supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    // If afterTimestamp is provided, only get newer interactions
    if (afterTimestamp) {
      query = query.gt('timestamp', afterTimestamp);
    }
    
    // Log the select operation
    logDbOperation(
      'sent', 
      'user_interactions', 
      'select', 
      1, 
      { 
        query: { user_id: userId, timestamp: afterTimestamp ? `>${afterTimestamp}` : undefined },
        options: { order: 'timestamp', ascending: false }
      },
      userId
    );
    
    const { data, error } = await query;
    
    if (error) {
      // Update log with error
      logDbOperation(
        'sent', 
        'user_interactions', 
        'select', 
        0, 
        { query: { user_id: userId, timestamp: afterTimestamp ? `>${afterTimestamp}` : undefined } },
        userId,
        'error',
        error.message
      );
      
      console.error('Error fetching interactions:', error);
      return [];
    }
    
    if (!data || !data.length) {
      console.log('No interactions found');
      return [];
    }
    
    // Log the received data
    logDbOperation(
      'received', 
      'user_interactions', 
      'select', 
      data.length, 
      data,
      userId
    );
    
    // Map the database format to our app format
    return data.map((item: any) => ({
      timestamp: item.timestamp,
      type: item.interaction_type as 'correct' | 'incorrect' | 'skipped',
      questionId: item.question_id,
      timeSpent: item.time_spent,
      questionText: item.question_text || `Question ${item.question_id}`
    }));
  } catch (error) {
    console.error('Error in fetchUserInteractions:', error);
    return [];
  }
}

/**
 * Syncs feed changes with Supabase
 * With aggressive optimization to minimize database growth
 */
export async function syncFeedChanges(
  userId: string, 
  feedChanges: FeedChange[]
): Promise<void> {
  try {
    if (!userId || !feedChanges.length) {
      return;
    }

    // More aggressive filtering: 
    // 1. Skip small batches entirely
    if (feedChanges.length < 10) {
      console.log(`Skipping sync of only ${feedChanges.length} feed changes (minimum 10)`);
      return;
    }
    
    // 2. Deduplicate the feed changes before sending
    const uniqueChanges = feedChanges.reduce((unique: FeedChange[], change) => {
      // Check if we already have a similar change
      const exists = unique.some(
        c => c.itemId === change.itemId && 
             c.type === change.type &&
             Math.abs(c.timestamp - change.timestamp) < 5000 // Within 5 seconds
      );
      
      if (!exists) {
        unique.push(change);
      }
      return unique;
    }, []);
    
    // 3. After deduplication, check if we still have enough changes
    if (uniqueChanges.length < 5) {
      console.log(`Skipping sync after deduplication: only ${uniqueChanges.length} unique changes`);
      return;
    }

    console.log(`Syncing ${uniqueChanges.length} unique feed changes (from original ${feedChanges.length})`);
    
    const deviceId = getDeviceId();
    
    // 4. Prepare feed changes with minimal data storage
    const formattedChanges = uniqueChanges.map(change => ({
      user_id: userId,
      timestamp: change.timestamp,
      change_type: change.type,
      item_id: change.itemId,
      question_text: change.questionText?.substring(0, 100) || '', // Limit text length
      // Maximum 1 explanation, truncated to 100 chars
      explanations: change.explanations?.slice(0, 1).map(e => e.substring(0, 100)) || [],
      // Minimal weight factors
      weight_factors: change.weightFactors ? {
        category: change.weightFactors.category
      } : null,
      synced_from_device: deviceId
    }));
    
    // Insert feed changes
    const { error } = await supabase
      .from('user_feed_changes')
      .insert(formattedChanges);
    
    // Log the insert operation
    logDbOperation(
      'sent', 
      'user_feed_changes', 
      'insert', 
      formattedChanges.length, 
      formattedChanges,
      userId,
      error ? 'error' : 'success',
      error?.message
    );
    
    if (error) {
      console.error('Error syncing feed changes:', error);
    } else {
      console.log(`Successfully synced ${formattedChanges.length} feed changes`);
      
      // 5. Run cleanup periodically after successfully syncing
      // This helps maintain database size without requiring app restart
      if (Math.random() < 0.1) { // 10% chance to run cleanup
        console.log('Running post-sync feed changes cleanup');
        cleanupFeedChanges(userId).catch(err => 
          console.error('Error in post-sync cleanup:', err)
        );
      }
    }
  } catch (error) {
    console.error('Error in syncFeedChanges:', error);
  }
}

/**
 * Retrieves feed changes from Supabase
 */
export async function fetchFeedChanges(
  userId: string,
  afterTimestamp?: number
): Promise<FeedChange[]> {
  try {
    if (!userId) {
      return [];
    }

    console.log('Fetching feed changes');
    
    let query = supabase
      .from('user_feed_changes')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100); // Limit to most recent 100 records to improve performance
    
    // If afterTimestamp is provided, only get newer changes
    if (afterTimestamp) {
      query = query.gt('timestamp', afterTimestamp);
    }
    
    // Log the select operation
    logDbOperation(
      'sent', 
      'user_feed_changes', 
      'select', 
      1, 
      { 
        query: { user_id: userId, timestamp: afterTimestamp ? `>${afterTimestamp}` : undefined },
        options: { order: 'timestamp', ascending: false, limit: 100 } 
      },
      userId
    );
    
    const { data, error } = await query;
    
    if (error) {
      // Update log with error
      logDbOperation(
        'sent', 
        'user_feed_changes', 
        'select', 
        0, 
        { query: { user_id: userId, timestamp: afterTimestamp ? `>${afterTimestamp}` : undefined } },
        userId,
        'error',
        error.message
      );
      
      console.error('Error fetching feed changes:', error);
      return [];
    }
    
    if (!data || !data.length) {
      console.log('No feed changes found');
      return [];
    }
    
    // Log the received data
    logDbOperation(
      'received', 
      'user_feed_changes', 
      'select', 
      data.length, 
      data,
      userId
    );
    
    // Map the database format to our app format
    return data.map((item: any) => ({
      timestamp: item.timestamp,
      type: item.change_type as 'added' | 'removed',
      itemId: item.item_id,
      questionText: item.question_text || `Question ${item.item_id}`,
      explanations: item.explanations || [],
      weightFactors: item.weight_factors
    }));
  } catch (error) {
    console.error('Error in fetchFeedChanges:', error);
    return [];
  }
}

/**
 * Syncs user weight changes with Supabase
 */
export async function syncWeightChanges(
  userId: string, 
  weightChanges: WeightChange[]
): Promise<void> {
  try {
    if (!userId || !weightChanges.length) {
      return;
    }

    console.log(`Syncing ${weightChanges.length} weight changes`);
    
    const deviceId = getDeviceId();
    
    // Prepare weight changes for insert
    const formattedChanges = weightChanges.map(change => ({
      user_id: userId,
      timestamp: change.timestamp,
      question_id: change.questionId,
      interaction_type: change.interactionType,
      question_text: change.questionText,
      category: change.category,
      subtopic: change.subtopic,
      branch: change.branch,
      old_topic_weight: change.oldWeights.topicWeight,
      old_subtopic_weight: change.oldWeights.subtopicWeight,
      old_branch_weight: change.oldWeights.branchWeight,
      new_topic_weight: change.newWeights.topicWeight,
      new_subtopic_weight: change.newWeights.subtopicWeight,
      new_branch_weight: change.newWeights.branchWeight,
      skip_compensation_applied: change.skipCompensation?.applied || false,
      skip_compensation_topic: change.skipCompensation?.topicCompensation || 0,
      skip_compensation_subtopic: change.skipCompensation?.subtopicCompensation || 0,
      skip_compensation_branch: change.skipCompensation?.branchCompensation || 0,
      synced_from_device: deviceId
    }));
    
    // Insert weight changes
    const { error } = await supabase
      .from('user_weight_changes')
      .insert(formattedChanges);
    
    // Log the insert operation
    logDbOperation(
      'sent', 
      'user_weight_changes', 
      'insert', 
      weightChanges.length, 
      formattedChanges,
      userId,
      error ? 'error' : 'success',
      error?.message
    );
    
    if (error) {
      console.error('Error syncing weight changes:', error);
    } else {
      console.log(`Successfully synced ${weightChanges.length} weight changes`);
    }
  } catch (error) {
    console.error('Error in syncWeightChanges:', error);
  }
}

/**
 * Retrieves weight changes from Supabase
 */
export async function fetchWeightChanges(
  userId: string,
  afterTimestamp?: number
): Promise<WeightChange[]> {
  try {
    if (!userId) {
      return [];
    }

    console.log('Fetching weight changes');
    
    let query = supabase
      .from('user_weight_changes')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    // If afterTimestamp is provided, only get newer changes
    if (afterTimestamp) {
      query = query.gt('timestamp', afterTimestamp);
    }
    
    // Log the select operation
    logDbOperation(
      'sent', 
      'user_weight_changes', 
      'select', 
      1, 
      { 
        query: { user_id: userId, timestamp: afterTimestamp ? `>${afterTimestamp}` : undefined },
        options: { order: 'timestamp', ascending: false } 
      },
      userId
    );
    
    const { data, error } = await query;
    
    if (error) {
      // Update log with error
      logDbOperation(
        'sent', 
        'user_weight_changes', 
        'select', 
        0, 
        { query: { user_id: userId, timestamp: afterTimestamp ? `>${afterTimestamp}` : undefined } },
        userId,
        'error',
        error.message
      );
      
      console.error('Error fetching weight changes:', error);
      return [];
    }
    
    if (!data || !data.length) {
      console.log('No weight changes found');
      return [];
    }
    
    // Log the received data
    logDbOperation(
      'received', 
      'user_weight_changes', 
      'select', 
      data.length, 
      data,
      userId
    );
    
    // Map the database format to our app format
    return data.map((item: any) => ({
      timestamp: item.timestamp,
      questionId: item.question_id,
      interactionType: item.interaction_type as 'correct' | 'incorrect' | 'skipped',
      questionText: item.question_text,
      category: item.category,
      subtopic: item.subtopic,
      branch: item.branch,
      oldWeights: {
        topicWeight: item.old_topic_weight,
        subtopicWeight: item.old_subtopic_weight,
        branchWeight: item.old_branch_weight
      },
      newWeights: {
        topicWeight: item.new_topic_weight,
        subtopicWeight: item.new_subtopic_weight,
        branchWeight: item.new_branch_weight
      },
      // Include skip compensation data if it exists
      ...(item.skip_compensation_applied && {
        skipCompensation: {
          applied: item.skip_compensation_applied,
          topicCompensation: item.skip_compensation_topic || 0,
          subtopicCompensation: item.skip_compensation_subtopic || 0,
          branchCompensation: item.skip_compensation_branch || 0
        }
      })
    }));
  } catch (error) {
    console.error('Error in fetchWeightChanges:', error);
    return [];
  }
}

/**
 * Comprehensive function to load all user data during app startup
 * This ensures consistency across sessions and platforms
 */
export async function loadUserData(userId: string): Promise<{
  profile: UserProfile | null;
  interactions: InteractionLog[];
  feedChanges: FeedChange[];
  weightChanges: WeightChange[];
}> {
  try {
    console.log('Loading all user data for user:', userId);
    
    // Log the initial load operation
    logDbOperation(
      'sent', 
      'user_data', 
      'select', 
      1, 
      { action: 'comprehensive_load', userId },
      userId
    );
    
    // Load user profile
    const profile = await fetchUserProfile(userId);
    
    // Load user interactions
    const interactions = await fetchUserInteractions(userId);
    
    // Load feed changes
    const feedChanges = await fetchFeedChanges(userId);
    
    // Load weight changes
    const weightChanges = await fetchWeightChanges(userId);
    
    // Log successful loading
    logDbOperation(
      'received', 
      'user_data', 
      'select', 
      1, 
      {
        action: 'comprehensive_load',
        userId,
        stats: {
          profile: profile ? 'loaded' : 'not found',
          interactions: interactions.length,
          feedChanges: feedChanges.length,
          weightChanges: weightChanges.length
        }
      },
      userId
    );
    
    console.log(`Successfully loaded user data: 
      Profile: ${profile ? 'Found' : 'Not found'}
      Interactions: ${interactions.length}
      Feed Changes: ${feedChanges.length}
      Weight Changes: ${weightChanges.length}`);
    
    return {
      profile,
      interactions,
      feedChanges,
      weightChanges
    };
  } catch (error) {
    console.error('Error loading user data:', error);
    
    // Log the error
    logDbOperation(
      'sent', 
      'user_data', 
      'select', 
      1, 
      { action: 'comprehensive_load', userId, error: error instanceof Error ? error.message : 'Unknown error' },
      userId,
      'error',
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    // Return empty data as fallback
    return {
      profile: null,
      interactions: [],
      feedChanges: [],
      weightChanges: []
    };
  }
}

/**
 * Aggressively cleans up feed changes to prevent database bloat
 * This function runs during app startup and periodically
 */
export async function cleanupFeedChanges(userId: string): Promise<void> {
  try {
    if (!userId) {
      return;
    }
    
    console.log('Aggressively cleaning up feed changes');
    
    // 1. Delete old records (3 days instead of 7)
    const oldTimestamp = Date.now() - (3 * 24 * 60 * 60 * 1000);
    
    const { error: deleteError } = await supabase
      .from('user_feed_changes')
      .delete()
      .eq('user_id', userId)
      .lt('timestamp', oldTimestamp);
    
    // 2. Fix any records with future timestamps
    const { error: fixTimestampError } = await supabase
      .rpc('fix_future_timestamps', { user_id_param: userId });
    
    // 3. Enforce maximum records per user (100)
    const { error: limitError } = await supabase
      .rpc('limit_feed_changes_per_user', { 
        user_id_param: userId,
        max_records: 100
      });
    
    // Log the operations
    logDbOperation(
      'sent', 
      'user_feed_changes', 
      'delete', 
      1, 
      { 
        operations: [
          { type: 'delete_old', timestamp_threshold: oldTimestamp },
          { type: 'fix_timestamps' },
          { type: 'limit_records', max_per_user: 100 }
        ]
      },
      userId,
      deleteError || fixTimestampError || limitError ? 'error' : 'success',
      deleteError?.message || fixTimestampError?.message || limitError?.message
    );
    
    if (deleteError || fixTimestampError || limitError) {
      console.error('Error during feed changes cleanup:', 
        deleteError || fixTimestampError || limitError);
    } else {
      console.log('Successfully cleaned up feed changes');
    }
  } catch (error) {
    console.error('Error in cleanupFeedChanges:', error);
  }
} 