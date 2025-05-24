import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  UserProfile, 
  createInitialUserProfile, 
  updateUserProfile as updateUserProfileFn 
} from '../lib/personalizationService';
import { FeedItem } from '../lib/triviaService';
import { syncUserProfile } from '../lib/simplifiedSyncService';
import { RootState } from '../store';

// Define a type for possible question states
export type QuestionState = {
  status: 'unanswered' | 'skipped' | 'answered';
  answerIndex?: number;
  timeSpent?: number; // Track time spent on the question
  isCorrect?: boolean; // Track if the answer was correct
};

interface TriviaState {
  questions: {
    [questionId: string]: QuestionState;
  };
  hasViewedTooltip: boolean;
  userProfile: UserProfile;
  feedExplanations: { [questionId: string]: string[] }; // For explaining personalization logic
  personalizedFeed: FeedItem[]; // Ordered list of personalized feed items
  interactionStartTimes: { [questionId: string]: number }; // Track when user started interacting with a question
  lastSyncTime: number; // Track when the last sync with the server was performed
  isSyncing: boolean; // Track whether a sync is in progress
  interactionCount: number; // Track number of interactions since last sync
  firstInteractionProcessed: boolean; // Track if the first interaction has been processed
}

const initialState: TriviaState = {
  questions: {},
  hasViewedTooltip: false,
  userProfile: createInitialUserProfile(),
  feedExplanations: {},
  personalizedFeed: [],
  interactionStartTimes: {},
  lastSyncTime: 0,
  isSyncing: false,
  interactionCount: 0,
  firstInteractionProcessed: false,
};

// Constants for batching database updates
const SYNC_INTERACTION_THRESHOLD = 5; // Sync every 5 interactions instead of every one

/**
 * Helper function to safely sync user profile with error handling
 * WRITE-ONLY operation - only pushes data to database, never pulls
 */
const safeSyncUserProfile = (userId?: string, profile?: UserProfile): void => {
  try {
    if (!userId) {
      console.log('[SAFE SYNC] No userId provided, skipping sync');
      return;
    }
    
    if (!profile) {
      console.log('[SAFE SYNC] No profile provided, skipping sync');
      return;
    }
    
    // Deep clone the profile to prevent proxy issues
    const safeProfile = JSON.parse(JSON.stringify(profile));
    
    console.log('[SAFE SYNC] WRITE-ONLY profile update for user', userId);
    
    // Call the sync function with safe data - WRITE-ONLY operation
    void syncUserProfile(userId, safeProfile);
  } catch (error) {
    console.warn('[SAFE SYNC] Failed to safely sync user profile:', 
      error instanceof Error ? error.message : 'Unknown error');
  }
};

const triviaSlice = createSlice({
  name: 'trivia',
  initialState,
  reducers: {
    answerQuestion: (state, action: PayloadAction<{ questionId: string; answerIndex: number; isCorrect: boolean; userId?: string }>) => {
      const { questionId, answerIndex, isCorrect, userId } = action.payload;
      
      // Log that we're answering the question, regardless of correctness
      console.log(`[Redux] Processing ANSWER for question ${questionId}: answer=${answerIndex}, correct=${isCorrect}`);
      
      // Get previous state for logging
      const previousState = state.questions[questionId]?.status || 'unanswered';
      
      // Calculate time spent
      const startTime = state.interactionStartTimes[questionId] || Date.now();
      const timeSpent = Date.now() - startTime;
      
      // Log the answered question and timing information (same for correct/incorrect)
      console.log(`[Redux] Answering question ${questionId}: answer=${answerIndex}, correct=${isCorrect}, time spent=${timeSpent}ms, previous state=${previousState}`);
      
      // Always update question state, regardless of correctness
      state.questions[questionId] = { 
        status: 'answered',
        answerIndex,
        isCorrect,
        timeSpent
      };
      
      // If this was previously skipped, let's log that we're overriding it
      if (previousState === 'skipped') {
        console.log(`[Redux] Overriding previous 'skipped' state for question ${questionId} with 'answered' state`);
      }
      
      // Increment interaction counter (same for correct/incorrect)
      state.interactionCount++;
      
      // Update user profile directly - this is the same for both correct and incorrect answers
      if (state.userProfile) {
        // Create the interaction object (same format for correct/incorrect)
        const now = Date.now();
        const questionInteraction = {
          timeSpent,
          wasCorrect: isCorrect, // This will be false for incorrect answers
          wasSkipped: false,
          viewedAt: now
        };
        
        // Update interactions directly in the profile
        if (!state.userProfile.interactions) {
          state.userProfile.interactions = {};
        }
        
        // Save interaction in same way regardless of correctness
        state.userProfile.interactions[questionId] = questionInteraction;
        
        // Get the feed item for this question to update user profile
        const feedItem = state.personalizedFeed.find(item => item.id === questionId);
        
        if (feedItem) {
          // Update the profile weights - handles both correct/incorrect
          const result = updateUserProfileFn(
            state.userProfile,
            questionId,
            questionInteraction,
            feedItem
          );
          
          // Apply the updated profile
          state.userProfile = result.updatedProfile;
          
          // If user is logged in and meets sync criteria - handle sync exactly the same
          // for both correct and incorrect answers
          if (userId) {
            const shouldSync = !state.firstInteractionProcessed || 
                              state.interactionCount >= SYNC_INTERACTION_THRESHOLD;
            
            if (shouldSync) {
              // Identical WRITE-ONLY behavior regardless of answer correctness
              console.log(`[Redux] WRITE-ONLY profile update after ${state.interactionCount} interactions (correct=${isCorrect})`);
              
              // This should use the exact same method for correct/incorrect answers
              safeSyncUserProfile(userId, state.userProfile);
              
              state.interactionCount = 0; // Reset counter after sync
              state.firstInteractionProcessed = true;
            } else {
              console.log(`[Redux] Skipping update (${state.interactionCount}/${SYNC_INTERACTION_THRESHOLD} interactions)`);
            }
          }
        }
      }
    },
    skipQuestion: (state, action: PayloadAction<{ questionId: string; userId?: string }>) => {
      const { questionId, userId } = action.payload;
      
      // Log more detail about the question being skipped
      console.log(`[Redux] Processing skip action for question: ${questionId}`);
      
      // Only mark as skipped if it hasn't been answered yet
      if (!state.questions[questionId] || state.questions[questionId].status !== 'answered') {
        // Get previous state for logging
        const previousState = state.questions[questionId]?.status || 'unanswered';
        
        // Calculate time spent
        const startTime = state.interactionStartTimes[questionId] || Date.now();
        const timeSpent = Date.now() - startTime;
        
        // Skip logging if already marked as skipped (avoids duplicate log entries)
        if (previousState !== 'skipped') {
          // Log the skipped question and timing information
          console.log(`[Redux] Skipping question ${questionId}: time spent = ${timeSpent}ms, previous state=${previousState}`);
          
          state.questions[questionId] = { 
            status: 'skipped',
            timeSpent
          };
          
          // Increment interaction counter
          state.interactionCount++;
          
          // Record interaction in the user profile
          const now = Date.now();
          const questionInteraction = {
            timeSpent,
            wasSkipped: true,
            viewedAt: now
          };
          
          // Update interactions directly in the profile
          if (!state.userProfile.interactions) {
            state.userProfile.interactions = {};
          }
          
          state.userProfile.interactions[questionId] = questionInteraction;
          
          // Get the feed item for this question to update user profile
          const feedItem = state.personalizedFeed.find(item => item.id === questionId);
          
          if (feedItem && state.userProfile) {
            // Update the profile weights
            const result = updateUserProfileFn(
              state.userProfile,
              questionId,
              questionInteraction,
              feedItem
            );
            
            // Apply the updated profile
            state.userProfile = result.updatedProfile;
            
            // If user is logged in, sync the profile based on interaction count (WRITE-ONLY)
            if (userId) {
              const shouldSync = !state.firstInteractionProcessed || 
                              state.interactionCount >= SYNC_INTERACTION_THRESHOLD;
              
              if (shouldSync) {
                console.log(`[Redux] WRITE-ONLY profile update after ${state.interactionCount} interactions`);
                safeSyncUserProfile(userId, state.userProfile);
                state.interactionCount = 0; // Reset counter after sync
                state.firstInteractionProcessed = true;
              } else {
                console.log(`[Redux] Skipping update (${state.interactionCount}/${SYNC_INTERACTION_THRESHOLD} interactions)`);
              }
            }
          }
        }
      }
    },
    // Force a sync regardless of interaction count (for critical updates)
    forceSyncProfile: (state, action: PayloadAction<{ userId: string; preventDefaultWeightSync?: boolean }>) => {
      const { userId, preventDefaultWeightSync = false } = action.payload;
      
      console.log('[Redux] Force syncing profile to database');
      
      // Check for default weights to avoid overwriting non-default weights in DB
      // Inline implementation since we can't import
      const hasAllDefaultWeights = (profile: UserProfile): boolean => {
        if (!profile.topics || Object.keys(profile.topics).length === 0) {
          return true;
        }
        
        for (const topicKey in profile.topics) {
          const topic = profile.topics[topicKey];
          if (Math.abs(topic.weight - 0.5) > 0.01) {
            return false;
          }
          
          if (topic.subtopics) {
            for (const subtopicKey in topic.subtopics) {
              const subtopic = topic.subtopics[subtopicKey];
              if (Math.abs(subtopic.weight - 0.5) > 0.01) {
                return false;
              }
            }
          }
        }
        
        return true;
      };
      
      const allDefaultWeights = hasAllDefaultWeights(state.userProfile);
      
      // Check if we should prevent syncing default weights
      if (preventDefaultWeightSync && allDefaultWeights) {
        console.log('[Redux] PREVENTED syncing profile with default weights to database');
        console.log('[Redux] This prevents overwriting personalized weights in the database');
        return; // Skip the sync operation entirely
      }
      
      // Only sync if we have non-default weights or it's urgent (app background/close)
      if (!allDefaultWeights) {
        console.log('[Redux] Profile has non-default weights, safe to sync');
        safeSyncUserProfile(userId, state.userProfile);
      } else {
        console.log('[Redux] WARNING: Profile has all default weights, sync may overwrite DB values');
        console.log('[Redux] Proceeding with sync anyway in case of app close/background');
        safeSyncUserProfile(userId, state.userProfile);
      }
    },
    startQuestionInteraction: (state, action: PayloadAction<{ questionId: string }>) => {
      const { questionId } = action.payload;
      state.interactionStartTimes[questionId] = Date.now();
    },
    updateUserProfile: (state, action: PayloadAction<{ profile: UserProfile, userId?: string }>) => {
      state.userProfile = action.payload.profile;
      
      // Log the update action
      console.log('[Redux] User profile updated');
      
      // If user is logged in, only sync based on interaction threshold (BATCHED)
      if (action.payload.userId) {
        // DO NOT increment interaction counter here - only count actual user interactions
        // The counter is incremented in answerQuestion/skipQuestion actions
        
        const shouldSync = !state.firstInteractionProcessed || 
                          state.interactionCount >= SYNC_INTERACTION_THRESHOLD;
        
        if (shouldSync) {
          console.log(`[Redux] BATCHED profile update after ${state.interactionCount} interactions via updateUserProfile`);
          safeSyncUserProfile(action.payload.userId, action.payload.profile);
          state.interactionCount = 0; // Reset counter after sync
          state.firstInteractionProcessed = true;
        } else {
          console.log(`[Redux] Skipping database sync (${state.interactionCount}/${SYNC_INTERACTION_THRESHOLD} interactions)`);
        }
      }
    },
    setFeedExplanations: (state, action: PayloadAction<{ [questionId: string]: string[] }>) => {
      state.feedExplanations = action.payload;
    },
    setPersonalizedFeed: (state, action: PayloadAction<FeedItem[]>) => {
      state.personalizedFeed = action.payload;
    },
    setHasViewedTooltip: (state, action: PayloadAction<boolean>) => {
      state.hasViewedTooltip = action.payload;
    },
    startSync: (state) => {
      state.isSyncing = true;
    },
    finishSync: (state, action: PayloadAction<number>) => {
      state.isSyncing = false;
      state.lastSyncTime = action.payload;
    },
    syncFailed: (state) => {
      state.isSyncing = false;
    },
    loadUserDataStart: (state) => {
      state.isSyncing = true;
    },
    loadUserDataSuccess: (state, action: PayloadAction<{ profile: UserProfile | null; timestamp: number }>) => {
      state.isSyncing = false;
      state.lastSyncTime = action.payload.timestamp;
      
      if (action.payload.profile) {
        // Import the hasAllDefaultWeights function (inline implementation since we can't import)
        const hasAllDefaultWeights = (profile: UserProfile): boolean => {
          if (!profile.topics || Object.keys(profile.topics).length === 0) {
            return true;
          }
          
          for (const topicKey in profile.topics) {
            const topic = profile.topics[topicKey];
            if (Math.abs(topic.weight - 0.5) > 0.01) {
              return false;
            }
            
            if (topic.subtopics) {
              for (const subtopicKey in topic.subtopics) {
                const subtopic = topic.subtopics[subtopicKey];
                if (Math.abs(subtopic.weight - 0.5) > 0.01) {
                  return false;
                }
              }
            }
          }
          
          return true;
        };
        
        const newProfile = action.payload.profile;
        const currentProfile = state.userProfile;
        const newHasDefaultWeights = hasAllDefaultWeights(newProfile);
        const currentHasDefaultWeights = hasAllDefaultWeights(currentProfile);
        
        // PRIORITIZE NON-DEFAULT WEIGHTS OVER TIMESTAMPS
        // Always prefer the profile with custom weights
        
        // If both profiles have non-default weights, use the newer one
        if (!newHasDefaultWeights && !currentHasDefaultWeights) {
          console.log('Both profiles have non-default weights - using newer profile');
          if (newProfile.lastRefreshed > currentProfile.lastRefreshed) {
            console.log('Remote profile is newer, using remote weights');
            state.userProfile = newProfile;
          } else {
            console.log('Local profile is newer, keeping local weights');
          }
        }
        // If remote profile has custom weights but local has defaults, use remote
        else if (!newHasDefaultWeights && currentHasDefaultWeights) {
          console.log('Remote profile has custom weights while local has defaults - using remote profile');
          state.userProfile = newProfile;
        }
        // If local profile has custom weights but remote has defaults, keep local
        else if (newHasDefaultWeights && !currentHasDefaultWeights) {
          console.log('Local profile has custom weights while remote has defaults - keeping local profile');
          // Merge to keep timestamps/metadata from remote but weights from local
          newProfile.topics = currentProfile.topics;
          state.userProfile = newProfile;
        }
        // If both have default weights, use the newer one
        else {
          console.log('Both profiles have default weights - using newer profile');
          if (newProfile.lastRefreshed > currentProfile.lastRefreshed) {
            state.userProfile = newProfile;
          }
        }
      }
    },
  },
});

export const { 
  answerQuestion, 
  skipQuestion,
  startQuestionInteraction,
  updateUserProfile,
  setFeedExplanations,
  setPersonalizedFeed,
  setHasViewedTooltip,
  startSync,
  finishSync,
  syncFailed,
  loadUserDataStart,
  loadUserDataSuccess,
  forceSyncProfile,
} = triviaSlice.actions;

export default triviaSlice.reducer; 