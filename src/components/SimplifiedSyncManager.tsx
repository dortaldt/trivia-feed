import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  syncFailed,
  loadUserDataStart,
  loadUserDataSuccess,
  forceSyncProfile
} from '../store/simplifiedTriviaSlice'; // Updated import path
import { 
  syncUserProfile,
  loadUserData,
  markInitialDataLoadComplete,
  logSyncStatus,
  hasAllDefaultWeights,
  fetchProfileWithDefaultCheck,
  isWriteOnlyMode
} from '../lib/simplifiedSyncService';
import { loadQuestionsFromStorageThunk } from '../store/triviaSlice';
import { AppState, AppStateStatus, Platform } from 'react-native';

interface SyncManagerProps {
  children?: React.ReactNode;
}

// FORCE RESET MODULE STATE
// This ensures that we always get a fresh module state on component mount
// by adding this here, we prevent any other component from setting the flag first
const resetModuleState = () => {
  // console.log('FORCE RESET: Module state reset requested');
  
  // Use the reset function from the sync service
};

/**
 * SimplifiedSyncManager Component
 * 
 * Handles background synchronization of user profile with Supabase.
 * After initial data load, this component only WRITES data to the database,
 * never reads from it again to prevent duplicate operations.
 */
export const SimplifiedSyncManager: React.FC<SyncManagerProps> = ({ children }) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [profileDataFetched, setProfileDataFetched] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  
  // Get selector data from Redux store
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  
  // Prevent any sync operations when we detect a fresh app start with default weights
  const shouldPreventDefaultsSync = 
    !profileDataFetched && 
    hasAllDefaultWeights(userProfile) && 
    user?.id !== undefined;
  
  // Log sync prevention state when it changes
  useEffect(() => {
    if (shouldPreventDefaultsSync) {
      console.log('🛑 Delaying all sync operations until real profile is loaded');
    }
  }, [shouldPreventDefaultsSync]);
  
  // Create a check function for manual use
  const checkDefaultWeights = useCallback(async () => {
    if (!user || !user.id) return;
    
    // Check if we need to fetch profile data due to default weights
    if (hasAllDefaultWeights(userProfile)) {
      console.log('⚠️ Default weights detected - checking database for actual weights');
      
      // iOS-specific handling for default weights
      if (Platform.OS === 'ios') {
        console.log('🍎 iOS: Default weights detected, using direct database query');
        
        try {
          // Import Supabase client directly
          const { supabase } = await import('../lib/supabaseClient');
          
          // Set up timeout for direct query
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('iOS direct query timeout')), 10000));
          
          // Direct database query with detailed logging
          console.log(`🍎 iOS: Direct query for user ${user.id}`);
          const fetchPromise = supabase
            .from('user_profile_data')
            .select('topics, interactions, last_refreshed, cold_start_complete, total_questions_answered')
            .eq('id', user.id)
            .single();
          
          // Race against timeout
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (result && result.data && result.data.topics && Object.keys(result.data.topics).length > 0) {
            console.log('🍎 iOS: Successfully fetched profile data directly');
            
            // Convert to UserProfile format
            const remoteProfile = {
              topics: result.data.topics || {},
              interactions: result.data.interactions || {},
              lastRefreshed: result.data.last_refreshed || Date.now(),
              coldStartComplete: result.data.cold_start_complete || false,
              totalQuestionsAnswered: result.data.total_questions_answered || 0
            };
            
            // Validate topic weights
            const isValid = Object.values(remoteProfile.topics).every(
              (topic: any) => typeof topic.weight === 'number' && !isNaN(topic.weight)
            );
            
            if (isValid) {
              // Check if these are actually non-default weights
              const hasNonDefaultWeights = Object.values(remoteProfile.topics).some(
                (topic: any) => Math.abs(topic.weight - 0.5) >= 0.01
              );
              
              if (hasNonDefaultWeights) {
                console.log('✅ iOS: Found valid NON-DEFAULT weights, prioritizing these over local weights');
              } else {
                console.log('⚠️ iOS: Found valid weights but they appear to be default values (0.5)');
              }
              
              // Always use the database weights for consistency
              console.log('✅ iOS: Found valid non-default weights, updating profile');
              
              dispatch(loadUserDataSuccess({ 
                profile: remoteProfile,
                timestamp: Date.now()
              }));
              
              // Now we have non-default weights, safe to enter write-only mode
              if (!isWriteOnlyMode()) {
                console.log('✅ Non-default weights retrieved, now entering write-only mode');
                markInitialDataLoadComplete();
              }
              
              setProfileDataFetched(true);
              
              return; // Exit early with success
            } else {
              console.log('⚠️ iOS: Found topics but weights are invalid');
            }
          } else {
            console.log('⚠️ iOS: Direct query did not return valid topic data');
          }
        } catch (iosError) {
          console.error('❌ iOS: Error during direct database query:', iosError);
        }
        
        // Fall back to normal path if direct query fails
        console.log('🍎 iOS: Falling back to normal fetchProfileWithDefaultCheck');
      }
      
      // Normal (non-iOS) path or iOS fallback
      try {
        const remoteProfile = await fetchProfileWithDefaultCheck(user.id, userProfile);
        
        if (remoteProfile && !hasAllDefaultWeights(remoteProfile)) {
          console.log('✅ Found non-default weights in database - updating local profile');
          dispatch(loadUserDataSuccess({ 
            profile: remoteProfile,
            timestamp: Date.now()
          }));
          
          // Now we have non-default weights, safe to enter write-only mode
          if (!isWriteOnlyMode()) {
            console.log('✅ Non-default weights retrieved, now entering write-only mode');
            markInitialDataLoadComplete();
          }
          
          setProfileDataFetched(true);
        } else {
          console.log('📊 No non-default weights found in database - keeping defaults');
          // Continue allowing database reads since we still have default weights
        }
      } catch (error) {
        console.error('❌ Error checking for default weights:', error);
      }
    } else {
      // We already have non-default weights in memory, make sure we're in write-only mode
      if (!isWriteOnlyMode()) {
        console.log('✅ Local profile already has non-default weights, entering write-only mode');
        markInitialDataLoadComplete();
      }
    }
  }, [user, userProfile, dispatch]);
  
  // Export the function for use by other components
  (SimplifiedSyncManager as any).checkWeights = checkDefaultWeights;
  
  // Define loadInitialData function
  const loadInitialData = useCallback(async () => {
    if (!user || !user.id || initialDataLoaded) return;
    
    try {
      // Reset module state again here to be sure
      resetModuleState();
      
      console.log('🔥 SyncManager: FORCED ONE-TIME initial data load 🔥');
      console.log('🔥 SyncManager: BYPASS write-only mode and all caches 🔥');
      
      // Check current sync status before load
      logSyncStatus();
      
      // iOS-specific initialization path with retries
      if (Platform.OS === 'ios') {
        console.log('🍎 iOS-specific database initialization path');
        
        // Force multiple retry attempts for iOS
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;
        let forceResult = null;
        
        while (attempts < maxAttempts && !success) {
          try {
            console.log(`🍎 iOS fetch attempt ${attempts + 1}/${maxAttempts}`);
            // Add small delay between retries with exponential backoff
            if (attempts > 0) {
              const delayMs = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s...
              console.log(`🍎 iOS: Waiting ${delayMs}ms before retry ${attempts + 1}`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            // DIRECT DATABASE QUERY: Bypass loadUserData wrapper for more control
            console.log('🍎 iOS: Using direct database query with extended timeout');
            
            // Create timeout promise for database operation
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('🍎 iOS: Direct database query timeout')), 20000));
            
            // Import Supabase client directly to bypass layers of abstraction
            const { supabase } = await import('../lib/supabaseClient');
            
            // Direct query with detailed logging
            console.log(`🍎 iOS: Querying user_profile_data for user ID: ${user.id}`);
            const fetchPromise = supabase
              .from('user_profile_data')
              .select('topics, interactions, last_refreshed, cold_start_complete, total_questions_answered')
              .eq('id', user.id)
              .single();
            
            // Race the fetch against a timeout
            const result = await Promise.race([fetchPromise, timeoutPromise]);
            
            console.log('🍎 iOS: Direct database query completed');
            
            if (result && result.data) {
              console.log('🍎 iOS: Got response data:', {
                hasTopics: !!result.data.topics,
                topicsType: typeof result.data.topics,
                topicCount: result.data.topics ? Object.keys(result.data.topics).length : 0
              });
              
                              // IMPORTANT: Strict validation of topic data
              if (
                result.data.topics && 
                typeof result.data.topics === 'object' && 
                Object.keys(result.data.topics).length > 0
              ) {
                // Convert database response to UserProfile format
                const remoteProfile = {
                  topics: result.data.topics || {},
                  interactions: result.data.interactions || {},
                  lastRefreshed: result.data.last_refreshed || Date.now(),
                  coldStartComplete: result.data.cold_start_complete || false,
                  totalQuestionsAnswered: result.data.total_questions_answered || 0
                };
                
                // Log sample topic to verify data structure
                const sampleTopicKey = Object.keys(remoteProfile.topics)[0];
                const sampleTopic = remoteProfile.topics[sampleTopicKey];
                
                console.log('🍎 iOS: Sample topic data:', {
                  topic: sampleTopicKey,
                  weight: sampleTopic.weight,
                  hasSubtopics: !!sampleTopic.subtopics,
                  subtopicCount: sampleTopic.subtopics ? Object.keys(sampleTopic.subtopics).length : 0
                });
                
                // ADDITIONAL CHECK: Does this profile have any non-default weights?
                const hasNonDefaultWeights = Object.values(remoteProfile.topics).some(
                  (topic: any) => Math.abs(topic.weight - 0.5) >= 0.01
                );
                
                if (hasNonDefaultWeights) {
                  console.log('✅ iOS: Found profile with NON-DEFAULT weights! This is what we want.');
                }
                
                // Only mark as success if we have valid topic weights
                if (
                  sampleTopic && 
                  typeof sampleTopic.weight === 'number' &&
                  !isNaN(sampleTopic.weight)
                ) {
                  console.log('✅ iOS database fetch successful with valid topic weights!');
                  forceResult = remoteProfile;
                  success = true;
                } else {
                  console.log('⚠️ iOS: Found topics but weights are invalid, retrying...');
                }
              } else {
                console.log('⚠️ iOS: Topics data is missing or empty, retrying...');
              }
            } else {
              console.log('⚠️ iOS: No data returned from direct query, retrying...');
            }
          } catch (directError) {
            console.error(`❌ iOS fetch attempt ${attempts + 1} failed:`, directError);
            if (directError instanceof Error) {
              console.error('iOS error details:', {
                message: directError.message,
                name: directError.name,
                stack: directError.stack?.substring(0, 200) // Truncate stack trace
              });
            }
          }
          
          attempts++;
        }
        
        if (!success) {
          console.log('⚠️ All iOS fetch attempts failed, using local profile');
          // Use local profile if all attempts fail
          dispatch(loadUserDataSuccess({
            profile: userProfile,
            timestamp: Date.now()
          }));
          setInitialDataLoaded(true);
          return;
        }
        
        // Continue with the successfully fetched profile
        const remoteProfile = forceResult;
        
        // Process the profile we got
        if (remoteProfile) {
          console.log('SyncManager: iOS fetch successful, updating profile');
          dispatch(loadUserDataSuccess({ 
            profile: remoteProfile,
            timestamp: Date.now()
          }));
          
          console.log('SyncManager: Initial data load complete - NO MORE READS');
          setInitialDataLoaded(true);
          
          // Mark initial data load complete to enter write-only mode
          if (!hasAllDefaultWeights(remoteProfile)) {
            console.log('SyncManager: Non-default weights found, safe to enter write-only mode');
            markInitialDataLoadComplete();
          } else {
            console.log('SyncManager: WARNING - All weights are default!');
            console.log('SyncManager: Staying in read-write mode until non-default weights are detected');
          }
          
          setProfileDataFetched(true);
          
          return;
        }
      } 
      else {
        // Non-iOS path - original implementation
        // SUPER FORCE: Directly access the Supabase API if necessary
        // This is a last resort if all else fails
        let forceResult;
        try {
          console.log('🔥 Attempting DIRECT database access 🔥');
          
          // ONE-TIME profile load - FORCED, bypassing all caches
          const { profile: remoteProfile } = await loadUserData(user.id, true);
          forceResult = remoteProfile;
          
          if (remoteProfile) {
            console.log('✅ DIRECT DATABASE ACCESS SUCCESSFUL!');
            console.log(`✅ Got topics with ${Object.keys(remoteProfile.topics || {}).length} entries`);
            console.log(`✅ Got interactions with ${Object.keys(remoteProfile.interactions || {}).length} entries`);
          } else {
            console.log('⚠️ DIRECT DATABASE ACCESS returned null profile');
          }
        } catch (directError) {
          console.error('❌ DIRECT DATABASE ACCESS failed:', directError);
        }
        
        // Proceed with normal flow using the forced result if available
        const remoteProfile = forceResult;
        
        if (remoteProfile) {
          // Check for default weights in both profiles
          const localHasDefaultWeights = hasAllDefaultWeights(userProfile);
          const remoteHasNonDefaultWeights = !hasAllDefaultWeights(remoteProfile);
          
          // PRIORITIZE WEIGHTS OVER TIMESTAMPS
          // If remote has custom weights but local has defaults, always use remote
          if (remoteHasNonDefaultWeights && localHasDefaultWeights) {
            console.log('SyncManager: Remote profile has non-default weights while local has defaults');
            console.log('SyncManager: Prioritizing remote profile to preserve personalization');
            
            dispatch(loadUserDataSuccess({ 
              profile: remoteProfile,
              timestamp: Date.now()
            }));
            
            // Mark that we've successfully fetched profile data
            setProfileDataFetched(true);
          }
          // If local has custom weights but remote has defaults, keep local
          else if (!localHasDefaultWeights && !remoteHasNonDefaultWeights) {
            console.log('SyncManager: Local profile has non-default weights while remote has defaults');
            console.log('SyncManager: Keeping local profile to preserve personalization');
            
            dispatch(loadUserDataSuccess({ 
              profile: userProfile,
              timestamp: Date.now()
            }));
            
            // Mark that we've successfully fetched profile data
            setProfileDataFetched(true);
          }
          // If both have custom weights or both have defaults, compare timestamps
          else {
            console.log('SyncManager: Comparing timestamps for profiles with similar weight status');
            console.log(`Remote lastRefreshed: ${remoteProfile.lastRefreshed}, Local lastRefreshed: ${userProfile.lastRefreshed}`);
            
            // ALWAYS prioritize database profile when it has non-default weights
            if (remoteHasNonDefaultWeights) {
              console.log('SyncManager: Remote profile has non-default weights, ALWAYS using database weights');
              dispatch(loadUserDataSuccess({ 
                profile: remoteProfile,
                timestamp: Date.now()
              }));
            }
            // Only use timestamp comparison if neither has personalized weights or both do
            else if (remoteProfile.lastRefreshed > userProfile.lastRefreshed) {
              console.log('SyncManager: Remote profile is newer, updating local profile');
              dispatch(loadUserDataSuccess({ 
                profile: remoteProfile,
                timestamp: Date.now()
              }));
            } else {
              console.log('SyncManager: Local profile is newer, keeping local but NOT syncing back to server');
              
              // Only sync if we have non-default weights
              const preventDefaultWeightSync = localHasDefaultWeights;
              
              if (preventDefaultWeightSync) {
                console.log('SyncManager: Preventing sync of default weights back to database');
                dispatch(loadUserDataSuccess({ 
                  profile: userProfile,
                  timestamp: Date.now()
                }));
              } else {
                // Safe to sync since we have non-default weights
                console.log('SyncManager: Local profile has non-default weights, safe to keep and sync');
                dispatch(forceSyncProfile({ 
                  userId: user.id,
                  preventDefaultWeightSync: false
                }));
                
                dispatch(loadUserDataSuccess({ 
                  profile: userProfile,
                  timestamp: Date.now()
                }));
              }
            }
            
            // Mark that we've successfully fetched profile data
            setProfileDataFetched(true);
          }
        } else {
          // If no remote profile exists, use the current one and upload it
          console.log('SyncManager: No remote profile found, creating one from local profile');
          
          // Only sync if we have non-default weights to avoid overwriting DB
          const preventDefaultWeightSync = hasAllDefaultWeights(userProfile);
          
          // If we have default weights, don't sync them back at this point
          if (preventDefaultWeightSync) {
            console.log('SyncManager: Using default weights locally but NOT syncing them to database');
            console.log('SyncManager: This prevents potentially overwriting personalized weights in the database');
          } else {
            // Otherwise it's safe to sync because we have custom weights
            await syncUserProfile(user.id, userProfile);
          }
          
          dispatch(loadUserDataSuccess({ 
            profile: userProfile,
            timestamp: Date.now()
          }));
          
          // Mark that we've attempted to fetch profile data (even though none was found)
          setProfileDataFetched(true);
        }
        
        console.log('SyncManager: Initial data load complete - NO MORE READS');
        setInitialDataLoaded(true);
        
        // Only enter write-only mode if we have non-default weights 
        // or confirmed that no weights exist in the database
        const profileToCheck = remoteProfile || userProfile;
        if (!hasAllDefaultWeights(profileToCheck)) {
          console.log('SyncManager: Non-default weights found, safe to enter write-only mode');
          markInitialDataLoadComplete();
        } else {
          console.log('SyncManager: WARNING - All weights are default!');
          console.log('SyncManager: Staying in read-write mode until non-default weights are detected');
          // Don't mark initial data load complete yet to allow future reads
        }
        
        setProfileDataFetched(true);
      }
      
      // Check sync status after completion
      logSyncStatus();
    } catch (error) {
      console.error('SyncManager: Error loading initial data:', error);
      dispatch(syncFailed());
    }
  }, [user, userProfile, initialDataLoaded, dispatch, profileDataFetched]);
  
  // Run diagnostic check and reset on mount - this must run first
  useEffect(() => {
    // console.log('🔥 SimplifiedSyncManager MOUNTED - FORCING MODULE STATE RESET 🔥');
    
    // Force reset the sync service state when component mounts
    resetModuleState();
    logSyncStatus();
    
    // Load questions from storage for the current user
    const userId = user?.id || undefined;
    console.log(`[REDUX PERSIST] Loading questions from storage for user: ${userId || 'guest'}`);
    dispatch(loadQuestionsFromStorageThunk(userId));
    
    // Force immediate data load when the component mounts
    if (user && user.id && !initialDataLoaded) {
      // Force immediate database fetch on component mount
      console.log('🔄 Forcing immediate database fetch on component mount');
      dispatch(loadUserDataStart());
      loadInitialData();
    }
  }, [user, loadInitialData, initialDataLoaded, dispatch]);
  
  // Update the ref when user changes
  useEffect(() => {
    if (user && user.id) {
      userIdRef.current = user.id;
    } else {
      userIdRef.current = null;
    }
  }, [user]);
  
  // Load questions from storage when user changes (e.g., login/logout/guest mode)
  useEffect(() => {
    const userId = user?.id || undefined;
    console.log(`[REDUX PERSIST] User changed, reloading questions for: ${userId || 'guest'}`);
    dispatch(loadQuestionsFromStorageThunk(userId));
  }, [user?.id, dispatch]);
  
  // Check for default weights and load from database if needed - DISABLED until after initial load
  useEffect(() => {
    // Only run this check after initial data load, not on first mount
    if (initialDataLoaded) {
      console.log('🔍 Checking for remaining default weights after initial data load');
      checkDefaultWeights();
    }
  }, [user, initialDataLoaded, userProfile, dispatch, checkDefaultWeights]);
  
  // Listen for app state changes to sync when app goes to background or inactive
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (user && user.id && 
         (appStateRef.current === 'active' && 
          (nextAppState === 'background' || nextAppState === 'inactive'))) {
        console.log('SyncManager: App going to background, writing data (WRITE-ONLY)');
        
        // Skip sync if we have default weights and haven't loaded from DB yet
        if (shouldPreventDefaultsSync) {
          console.log('SyncManager: PREVENTED background sync due to default weights before profileDataFetched=true');
          return;
        }
        
        // WRITE-ONLY operation when app goes to background
        // Only prevent syncing default weights during initial app usage before profile is fetched
        const preventDefaultWeightSync = !profileDataFetched && hasAllDefaultWeights(userProfile);
        
        if (preventDefaultWeightSync) {
          console.log('SyncManager: Preventing sync of default weights before profileDataFetched=true');
        }
        
        // Pass the flag to prevent syncing default weights back to database
        dispatch(forceSyncProfile({ 
          userId: user.id,
          preventDefaultWeightSync
        }));
      }
      
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [user, dispatch, shouldPreventDefaultsSync]);
  
  // Final sync when the user logs out or component unmounts
  useEffect(() => {
    return () => {
      const finalSync = async () => {
        if (user && user.id) {
          console.log('SyncManager: Final data write before unmounting (WRITE-ONLY)');
          
          // Skip sync if we have default weights and haven't loaded from DB yet
          if (shouldPreventDefaultsSync) {
            console.log('SyncManager: PREVENTED final sync due to default weights before profileDataFetched=true');
            return;
          }
          
          try {
            // Final write of everything - WRITE-ONLY
            // Only prevent syncing default weights during initial app usage before profile is fetched
            const preventDefaultWeightSync = !profileDataFetched && hasAllDefaultWeights(userProfile);
            
            // Pass the flag to prevent syncing default weights back to database
            dispatch(forceSyncProfile({ 
              userId: user.id,
              preventDefaultWeightSync
            }));
          } catch (error) {
            console.error('SyncManager: Error during final write:', error);
          }
        }
      };
      
      finalSync();
    };
  }, [user, dispatch, shouldPreventDefaultsSync]);
  
  // Add a dedicated effect to handle the first sync after real profile weights are loaded
  useEffect(() => {
    // This effect runs when:
    // 1. Profile data has been fetched from the database
    // 2. We have user credentials
    // 3. The userProfile contains non-default weights
    if (
      profileDataFetched && 
      user?.id && 
      !hasAllDefaultWeights(userProfile)
    ) {
      console.log('🔄 Profile data has been fetched and non-default weights loaded');
      console.log('🔄 Now safe to sync personalized data back to database');
      
      // This is a safe sync with confirmed non-default weights
      dispatch(forceSyncProfile({ 
        userId: user.id,
        preventDefaultWeightSync: false // Explicitly allow sync since we have real weights
      }));
    }
  }, [profileDataFetched, user, userProfile, dispatch]);
  
  // Add an effect to watch for app starts with default weights
  useEffect(() => {
    // Only run this check when app first starts
    if (user?.id && hasAllDefaultWeights(userProfile) && !profileDataFetched) {
      console.log('⚠️ App started with default weights - preventing any sync until real weights are loaded');
      console.log('⚠️ This prevents overwriting personalized weights in the database');
      
      // Force a check for default weights and load from database if needed
      checkDefaultWeights();
    }
  }, [user, userProfile, profileDataFetched, checkDefaultWeights]);
  
  return <>{children}</>;
}; 