import { supabase } from './supabaseClient';
import { UserProfile } from './personalizationService';
import { InteractionLog, FeedChange, WeightChange } from '../types/trackerTypes';
import { Platform } from 'react-native';
import { EventEmitter } from 'events';
import { dbEventEmitter } from './syncService';

// Track pending requests to prevent duplicate calls
const pendingRequests = new Map<string, Promise<any>>();
// Keep track of last request times to implement cooldown
const lastRequestTimes = new Map<string, number>();
// Cooldown period in milliseconds - longer for iOS
const REQUEST_COOLDOWN = Platform.OS === 'ios' ? 800 : 300;
// Timeout for fetch operations - longer for iOS
const FETCH_TIMEOUT = Platform.OS === 'ios' ? 15000 : 5000;

// Add flag to prevent reads after initial load - RESET ON EACH APP START
let initialDataLoadComplete = false;
console.log(`🔄 simplifiedSyncService module initialized on ${Platform.OS} - write-only mode is OFF`);
console.log('🔄 Initial data load will be permitted');

// Function to check if we're in write-only mode
export const isWriteOnlyMode = () => {
  return initialDataLoadComplete;
};

// Function to mark initial data load as complete
export const markInitialDataLoadComplete = () => {
  // Check if a reset was requested (hack to reset module state)
  if ((markInitialDataLoadComplete as any).reset) {
    console.log('🔄🔄🔄 RESET DETECTED - RESETTING initialDataLoadComplete FLAG 🔄🔄🔄');
    initialDataLoadComplete = false;
    (markInitialDataLoadComplete as any).reset = false;
    console.log('🔄🔄🔄 FLAG RESET COMPLETE - WRITE-ONLY MODE DISABLED 🔄🔄🔄');
    return; // Skip the normal completion process
  }

  console.log('---------------------------------------------');
  console.log('🔒 INITIAL DATA LOAD COMPLETE');
  console.log('🔒 ENTERING WRITE-ONLY MODE');
  console.log('🔒 All future database operations will be WRITE-ONLY');
  console.log('🔒 No more database reads will be performed');
  console.log('---------------------------------------------');
  
  initialDataLoadComplete = true;
};

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
    
    // ALWAYS use "Topics" action for all operations to ensure consistency
    // This prevents "Refreshed" from appearing in logs
    const action = "Topics";
    
    const logData = {
      timestamp: Date.now(),
      direction,
      table,
      action,
      operation,
      records,
      data: safeData.data || safeData,
      userId: userId || 'unknown',
      status,
      error: error || null
    };
    
    // Emit the db operation event
    dbEventEmitter.emit('db-operation', logData);
    
    // Also log to console
    console.log(`[DB ${direction.toUpperCase()}] ${action} ${operation.toUpperCase()} ${records} records to ${table}`, 
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
 * Helper to deduplicate database requests
 * This prevents multiple identical requests from being sent at nearly the same time
 */
async function deduplicatedRequest<T>(
  requestKey: string, 
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request with this key
  if (pendingRequests.has(requestKey)) {
    console.log(`[DEDUP] Using existing request for: ${requestKey}`);
    return pendingRequests.get(requestKey) as Promise<T>;
  }
  
  // Check if a similar request was made recently (cooldown period)
  const lastRequestTime = lastRequestTimes.get(requestKey) || 0;
  const now = Date.now();
  if (now - lastRequestTime < REQUEST_COOLDOWN) {
    console.log(`[DEDUP] Request cooldown in effect for: ${requestKey}`);
    
    // If we have a pending request, use that
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey) as Promise<T>;
    }
    
    // Otherwise, delay for the cooldown period
    await new Promise(resolve => setTimeout(resolve, REQUEST_COOLDOWN - (now - lastRequestTime)));
  }
  
  // Create a new request and store it
  const requestPromise = requestFn();
  pendingRequests.set(requestKey, requestPromise);
  lastRequestTimes.set(requestKey, Date.now());
  
  // Remove from pending requests when it completes
  requestPromise
    .then(result => {
      pendingRequests.delete(requestKey);
      return result;
    })
    .catch(error => {
      pendingRequests.delete(requestKey);
      throw error;
    });
    
  return requestPromise;
}

/**
 * Syncs the user profile data with Supabase
 * WRITE-ONLY function - does not perform any reads
 * Works identically for both correct and incorrect answers
 */
export async function syncUserProfile(userId: string, userProfile: UserProfile): Promise<void> {
  // Use the deduplication wrapper around the actual function
  return deduplicatedRequest(`syncProfile-${userId}`, () => _syncUserProfile(userId, userProfile));
}

/**
 * Implementation of the profile sync
 * Pure WRITE-ONLY operation with no conditional behavior based on answer correctness
 */
async function _syncUserProfile(userId: string, userProfile: UserProfile): Promise<void> {
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

    console.log('WRITE-ONLY - consistent behavior for all updates');
    
    // Ensure lastRefreshed is set
    if (!userProfile.lastRefreshed) {
      userProfile.lastRefreshed = Date.now();
    }
    
    // DEBUG: Check if we're about to sync a profile with all default weights
    if (hasAllDefaultWeights(userProfile)) {
      console.warn('⚠️⚠️⚠️ WARNING: About to sync a profile with ALL DEFAULT WEIGHTS');
      console.warn('⚠️⚠️⚠️ This might overwrite custom weights in the database');
      
      // Print first 3 topics as an example
      const topicKeys = Object.keys(userProfile.topics || {});
      console.log(`Topics found (${topicKeys.length}): ${topicKeys.slice(0, 3).join(', ')}${topicKeys.length > 3 ? '...' : ''}`);
      
      // Log the first topic's weight as an example
      if (topicKeys.length > 0) {
        const firstTopic = topicKeys[0];
        console.log(`Sample topic "${firstTopic}" weight: ${userProfile.topics[firstTopic].weight.toFixed(4)}`);
      }
      
      // Check if we should fetch from DB first to compare
      if (initialDataLoadComplete) {
        console.log('Sync is in write-only mode, proceeding with update');
      } else {
        console.log('Still in read-write mode, this update may not be intentional');
        console.log('Syncing default weights anyway, but this could be a problem');
      }
    }
    
    // Simple data structure - same for all operations
    const profileData = {
      id: userId,
      topics: userProfile.topics || {},
      interactions: userProfile.interactions || {}, 
      cold_start_complete: userProfile.coldStartComplete || false,
      total_questions_answered: userProfile.totalQuestionsAnswered || 0,
      last_refreshed: userProfile.lastRefreshed
    };
    
    try {
      // Simple upsert - works consistently for all operations
      const { error: upsertError } = await supabase
        .from('user_profile_data')
        .upsert(profileData, { 
          onConflict: 'id'
        });
      
      // Log the operation with always the same action type
      logDbOperation(
        'sent', 
        'user_profile_data', 
        'upsert', 
        1, 
        profileData,
        userId,
        upsertError ? 'error' : 'success',
        upsertError?.message
      );
      
      if (upsertError) {
        console.error('Error during profile upsert:', upsertError);
      } else {
        console.log('Profile successfully updated (same method for correct/incorrect)');
      }
      
      // IMPORTANT: Do not fetch the profile after updating
      // This is a write-only operation
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  } catch (error) {
    console.error('Error in syncUserProfile:', error);
  }
}

/**
 * Retrieves the user profile from Supabase
 * This should only be called during initial data load
 */
export async function fetchUserProfile(userId: string, forceLoad: boolean = false): Promise<UserProfile | null> {
  // Skip database fetch if initial data load is complete (unless forced)
  if (initialDataLoadComplete && !forceLoad) {
    console.log('SKIPPING profile fetch - initial load already complete (WRITE-ONLY mode)');
    console.log('To force a load, set forceLoad=true');
    return null;
  }
  
  // Use deduplication for the fetch request
  return deduplicatedRequest(`fetchProfile-${userId}`, () => _fetchUserProfile(userId, forceLoad));
}

// Add a new function to check if a profile has default weights
export function hasAllDefaultWeights(profile: UserProfile): boolean {
  // Check if profile has topics
  if (!profile.topics || Object.keys(profile.topics).length === 0) {
    return true; // Empty topics means default weights
  }
  
  // Check if all topic weights are default (0.5)
  for (const topicKey in profile.topics) {
    const topic = profile.topics[topicKey];
    
    // Check topic weight - if not default, return false
    if (Math.abs(topic.weight - 0.5) > 0.01) {
      return false;
    }
    
    // Check subtopic weights if they exist
    if (topic.subtopics) {
      for (const subtopicKey in topic.subtopics) {
        const subtopic = topic.subtopics[subtopicKey];
        if (Math.abs(subtopic.weight - 0.5) > 0.01) {
          return false;
        }
      }
    }
  }
  
  // All weights are default
  return true;
}

// Add a new function to force profile load if all weights are default
export async function fetchProfileWithDefaultCheck(userId: string, localProfile: UserProfile): Promise<UserProfile | null> {
  // Check if all weights are default
  const hasDefaultWeights = hasAllDefaultWeights(localProfile);
  
  if (hasDefaultWeights && initialDataLoadComplete) {
    console.log('🚨 All weights are default in local profile!');
    console.log('🚨 Forcing database fetch despite write-only mode');
    
    // Force load from database
    return fetchUserProfile(userId, true);
  }
  
  // Regular fetch (will respect write-only mode)
  return fetchUserProfile(userId, false);
}

/**
 * Implementation of the profile fetch
 */
async function _fetchUserProfile(userId: string, forceLoad: boolean = false): Promise<UserProfile | null> {
  try {
    // Skip fetch if initial load is complete (unless forced)
    if (initialDataLoadComplete && !forceLoad) {
      console.log('SKIPPING _fetchUserProfile - initial load already complete (WRITE-ONLY mode)');
      console.log('To force a load, set forceLoad=true');
      return null;
    }
    
    if (!userId) {
      console.log('No user ID provided for fetch');
      return null;
    }

    // Log whether this is a forced load
    if (forceLoad) {
      console.log('🔥🔥🔥 FORCED DATABASE READ 🔥🔥🔥');
      console.log('🔥🔥🔥 BYPASSING write-only mode 🔥🔥🔥');
    }
    
    // iOS-specific logging
    if (Platform.OS === 'ios') {
      console.log('🍎 iOS: Fetching profile data with forceLoad =', forceLoad);
    }
    
    console.log('Initial Load: Fetching profile data for user:', userId);
    console.log('Initial Load: This is ONLY executed once at login');
    
    // Only select needed columns instead of * to reduce data transfer
    // We need topics, interactions, and metadata for personalization
    console.log('Starting Supabase database query...');
    
    // Set up fetch with timeout for iOS to prevent hanging requests
    let result;
    if (Platform.OS === 'ios') {
      console.log(`🍎 iOS: Using ${FETCH_TIMEOUT}ms timeout for database fetch`);
      
      // Set up a promise race with timeout
      const fetchPromise = supabase
        .from('user_profile_data')
        .select('topics, interactions, last_refreshed, cold_start_complete, total_questions_answered')
        .eq('id', userId)
        .single();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout exceeded')), FETCH_TIMEOUT));
      
      result = await Promise.race([fetchPromise, timeoutPromise]);
    } else {
      // Regular fetch for other platforms
      result = await supabase
        .from('user_profile_data')
        .select('topics, interactions, last_refreshed, cold_start_complete, total_questions_answered')
        .eq('id', userId)
        .single();
    }
    
    const { data, error } = result;
    
    console.log('Supabase query completed');
    
    // Log the select operation - always use "Topics" for action
    logDbOperation(
      'sent', 
      'user_profile_data', 
      'select', 
      1, 
      { 
        query: { id: userId }, 
        columns: ['topics', 'interactions', 'last_refreshed', 'cold_start_complete', 'total_questions_answered']
      },
      userId,
      error ? 'error' : 'success',
      error?.message
    );
    
    if (error) {
      console.error('⚠️ Error fetching user profile:', error);
      return null;
    }
    
    if (!data) {
      console.log('No profile found for user - will create new one');
      return null;
    }
    
    // Log the received data - always use "Topics" for action
    logDbOperation(
      'received', 
      'user_profile_data', 
      'select', 
      1, 
      data,
      userId
    );
    
    // iOS-specific validation
    if (Platform.OS === 'ios') {
      console.log('🍎 iOS: Validating fetched data structure');
      if (!data.topics || typeof data.topics !== 'object' || Object.keys(data.topics).length === 0) {
        console.log('🍎 iOS: Warning - topics data is empty or invalid:', data.topics);
      }
    }
    
    console.log('Initial Load: Successfully retrieved user profile data');
    console.log(`Initial Load: Got topics with ${Object.keys(data.topics || {}).length} entries`);
    console.log(`Initial Load: Got interactions with ${Object.keys(data.interactions || {}).length} entries`);
    
    // Inspect topics data structure
    if (data.topics && typeof data.topics === 'object') {
      console.log('TOPICS DATA STRUCTURE:');
      const topicCount = Object.keys(data.topics).length;
      console.log(`Found ${topicCount} topics`);
      
      if (topicCount > 0) {
        // Log sample topic
        const sampleTopicKey = Object.keys(data.topics)[0];
        console.log(`Sample topic "${sampleTopicKey}": `, JSON.stringify(data.topics[sampleTopicKey]).substring(0, 100) + '...');
      }
    } else {
      console.log('WARNING: Topics data is not an object:', typeof data.topics);
    }
    
    return {
      topics: data.topics || {},
      interactions: data.interactions || {}, // Load interactions directly from profile
      lastRefreshed: data.last_refreshed,
      coldStartComplete: data.cold_start_complete || false,
      totalQuestionsAnswered: data.total_questions_answered || 0
    };
  } catch (error) {
    // Enhanced error logging for iOS
    if (Platform.OS === 'ios') {
      console.error('🍎 iOS ERROR in fetchUserProfile:', error);
      if (error instanceof Error) {
        console.error('🍎 iOS ERROR details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    } else {
      console.error('⚠️⚠️⚠️ Error in fetchUserProfile:', error);
    }
    return null;
  }
}

/**
 * Load user data - returns all user profile data at once
 * This should ONLY be called once during initial app load
 */
export async function loadUserData(userId: string, forceLoad: boolean = false): Promise<{
  profile: UserProfile | null;
}> {
  // Skip if initial data load is already complete (unless forced)
  if (initialDataLoadComplete && !forceLoad) {
    console.log('SKIPPING loadUserData - initial load already complete (WRITE-ONLY mode)');
    console.log('To force a load, set forceLoad=true');
    return { profile: null };
  }
  
  // Use deduplication for this function too
  return deduplicatedRequest(`loadUserData-${userId}`, () => _loadUserData(userId, forceLoad));
}

/**
 * Implementation of user data loading
 */
async function _loadUserData(userId: string, forceLoad: boolean = false): Promise<{
  profile: UserProfile | null;
}> {
  try {
    // Skip if initial data load is already complete (unless forced)
    if (initialDataLoadComplete && !forceLoad) {
      console.log('SKIPPING _loadUserData - initial load already complete (WRITE-ONLY mode)');
      console.log('To force a load, set forceLoad=true');
      return { profile: null };
    }
    
    if (!userId) {
      return { profile: null };
    }
    
    // iOS-specific logging and handling
    if (Platform.OS === 'ios') {
      console.log('🍎 iOS: loadUserData called with forceLoad =', forceLoad);
      console.log('🍎 iOS: Using direct profile fetch with extra validation');
      
      try {
        // Fetch with detailed logging
        const profile = await _fetchUserProfile(userId, true);
        
        // Additional validation specific to iOS
        if (profile) {
          // Verify topic data integrity
          const topicCount = Object.keys(profile.topics || {}).length;
          console.log(`🍎 iOS: Fetched profile with ${topicCount} topics`);
          
          if (topicCount > 0) {
            // Check for valid weights in topics
            let allWeightsValid = true;
            let sampleInvalidTopic = '';
            
            for (const [topicName, topicData] of Object.entries(profile.topics)) {
              if (typeof topicData.weight !== 'number' || isNaN(topicData.weight)) {
                allWeightsValid = false;
                sampleInvalidTopic = topicName;
                break;
              }
            }
            
            if (!allWeightsValid) {
              console.error(`🍎 iOS: Found invalid weight for topic "${sampleInvalidTopic}"`);
              console.error('🍎 iOS: Cleaning invalid topic data');
              
              // Filter out invalid topics
              const cleanedTopics: any = {};
              
              for (const [topicName, topicData] of Object.entries(profile.topics)) {
                if (typeof topicData.weight === 'number' && !isNaN(topicData.weight)) {
                  cleanedTopics[topicName] = topicData;
                }
              }
              
              profile.topics = cleanedTopics;
              console.log(`🍎 iOS: After cleaning, profile has ${Object.keys(cleanedTopics).length} valid topics`);
            } else {
              console.log('🍎 iOS: All topic weights are valid');
            }
          } else {
            console.log('🍎 iOS: No topics found in profile, may use defaults');
          }
        } else {
          console.log('🍎 iOS: Profile fetch returned null');
        }
        
        return { profile };
      } catch (iosError) {
        console.error('🍎 iOS: Error in loadUserData:', iosError);
        return { profile: null };
      }
    }
    
    // Original non-iOS implementation
    console.log('Initial Load: Loading complete user data for user:', userId);
    console.log('Initial Load: This is the ONLY database read that should happen');
    
    // Fetch the profile which now contains everything
    const profile = await _fetchUserProfile(userId, forceLoad);
    
    // The SimplifiedSyncManager will call markInitialDataLoadComplete
    // after processing the data, so we don't need to call it here
    
    return { profile };
  } catch (error) {
    console.error('Error in loadUserData:', error);
    return { profile: null };
  }
}

/**
 * Log current sync status for debugging
 * This can be called from anywhere to see the current state of sync
 */
export function logSyncStatus(): void {
  // console.log('---------------------------------------------');
  // console.log('🔍 SYNC STATUS REPORT');
  // console.log(`🔍 Write-only mode: ${state.writeOnlyMode ? 'ENABLED' : 'DISABLED'}`);
  // console.log(`🔍 Pending requests: ${state.pendingRequests.size}`);
  // console.log(`🔍 Request cooldown active: ${state.requestCooldownUntil > Date.now() ? 'YES' : 'NO'}`);
  
  if (pendingRequests.size > 0) {
    // console.log('🔍 Pending request types:', Array.from(state.pendingRequests));
  }
  
  // console.log('---------------------------------------------');
} 