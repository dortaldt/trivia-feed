import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, createInitialUserProfile } from '../lib/personalizationService';
import { FeedItem } from '../lib/triviaService';
import { recordUserAnswer } from '../lib/leaderboardService';
import { syncUserProfile, syncUserInteractions, syncFeedChanges, syncWeightChanges, loadUserData } from '../lib/syncService';
import { InteractionLog, FeedChange, WeightChange } from '../types/trackerTypes';

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
  syncedInteractions: InteractionLog[]; // Track interactions that have been synced with the server
  syncedFeedChanges: FeedChange[]; // Track feed changes that have been synced with the server
  syncedWeightChanges: WeightChange[];
  lastSyncTime: number; // Track when the last sync with the server was performed
  isSyncing: boolean; // Track whether a sync is in progress
}

const initialState: TriviaState = {
  questions: {},
  hasViewedTooltip: false,
  userProfile: createInitialUserProfile(),
  feedExplanations: {},
  personalizedFeed: [],
  interactionStartTimes: {},
  syncedInteractions: [],
  syncedFeedChanges: [],
  syncedWeightChanges: [],
  lastSyncTime: 0,
  isSyncing: false,
};

/**
 * Helper function to safely sync user profile with error handling
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
    
    // Now call the actual sync function with safe data
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
      
      // Get previous state for logging
      const previousState = state.questions[questionId]?.status || 'unanswered';
      
      // Calculate time spent
      const startTime = state.interactionStartTimes[questionId] || Date.now();
      const timeSpent = Date.now() - startTime;
      
      // Log the answered question and timing information
      console.log(`[Redux] Answering question ${questionId}: answer=${answerIndex}, correct=${isCorrect}, time spent=${timeSpent}ms, previous state=${previousState}`);
      
      // Always update question state, regardless of previous status (answer overrides skip)
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
      
      // Update user profile with new weight changes
      if (state.userProfile) {
        // Calculate confidence updates
        if (!state.userProfile.topics) {
          state.userProfile.topics = {};
        }
        
        // Record interaction for sync
        const now = Date.now();
        const interaction: InteractionLog = {
          questionId,
          type: isCorrect ? 'correct' : 'incorrect',
          timestamp: now,
          timeSpent,
          questionText: 'Question ' + questionId.substring(0, 5) // Just for display, we'll fetch full text later
        };
        
        // Add to synced interactions
        state.syncedInteractions.push(interaction);
        
        // If user is logged in, sync the interaction
        if (userId) {
          // Always use safer version that handles null checking
          safeSyncUserProfile(userId, state.userProfile);
        }
      }
    },
    skipQuestion: (state, action: PayloadAction<{ questionId: string; userId?: string }>) => {
      const { questionId, userId } = action.payload;
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
          console.log(`[Redux] Skipping question ${questionId}: time spent = ${timeSpent}ms`);
          
          state.questions[questionId] = { 
            status: 'skipped',
            timeSpent
          };
          
          // Record interaction for sync
          const now = Date.now();
          const interaction: InteractionLog = {
            questionId,
            type: 'skipped',
            timestamp: now,
            timeSpent,
            questionText: 'Question ' + questionId.substring(0, 5) // Just for display
          };
          
          // Only add to synced interactions if we don't already have a skip record for this question
          const hasExistingSkip = state.syncedInteractions.some(
            i => i.questionId === questionId && i.type === 'skipped'
          );
          
          if (!hasExistingSkip) {
            state.syncedInteractions.push(interaction);
            
            // If user is logged in, sync the interaction
            if (userId && state.userProfile) {
              // Always use safer version that handles null checking
              safeSyncUserProfile(userId, state.userProfile);
            }
          }
        } else {
          console.log(`[Redux] Redundant skip for question ${questionId}: already in 'skipped' state`);
        }
      } else {
        console.log(`[Redux] Skip ignored for question ${questionId}: already in '${state.questions[questionId].status}' state`);
      }
    },
    startInteraction: (state, action: PayloadAction<{ questionId: string }>) => {
      const { questionId } = action.payload;
      // Record when the user started interacting with this question
      const now = Date.now();
      state.interactionStartTimes[questionId] = now;
      console.log(`[Redux] Started interaction timer for question ${questionId} at ${new Date(now).toISOString()}`);
    },
    setPersonalizedFeed: (state, action: PayloadAction<{ 
      items: FeedItem[]; 
      explanations: { [questionId: string]: string[] };
      userId?: string; 
    }>) => {
      const { items, explanations, userId } = action.payload;
      
      // Check if items array is valid
      if (!items || !Array.isArray(items)) {
        console.warn('Cannot set personalized feed: items is null or not an array');
        return;
      }
      
      // Find new items compared to current feed
      const currentIds = new Set(state.personalizedFeed.map(item => item.id));
      const newItems = items.filter(item => !currentIds.has(item.id));
      
      // Update state
      state.personalizedFeed = items;
      state.feedExplanations = explanations || {};
      
      // If user is logged in and there are new items, sync the feed changes
      if (userId && newItems.length > 0) {
        const now = Date.now();
        const feedChanges: FeedChange[] = newItems.map(item => {
          // Extract weight-based selection info
          const weightFactors = {
            category: item.category,
          };
          
          // Get explanations for this item
          const itemExplanations = explanations[item.id] || [];
          
          return {
            timestamp: now,
            type: 'added',
            itemId: item.id,
            questionText: item.question || `Question ${item.id.substring(0, 5)}...`,
            explanations: itemExplanations,
            weightFactors
          };
        });
        
        // Add to synced feed changes
        state.syncedFeedChanges.push(...feedChanges);
        
        // Sync feed changes with server
        void syncFeedChanges(userId, feedChanges);
      }
    },
    updateUserProfile: (state, action: PayloadAction<{ profile: UserProfile; userId?: string; weightChange?: WeightChange }>) => {
      const { profile, userId, weightChange } = action.payload;
      
      // Add null check for profile
      if (!profile) {
        console.warn('Cannot update user profile: profile is null or undefined');
        return;
      }
      
      state.userProfile = profile;
      
      // If a weight change was provided, add it to the synced weight changes
      if (weightChange) {
        state.syncedWeightChanges.push(weightChange);
      }
      
      // Sync user profile with server if user is logged in
      if (userId) {
        // Use safer version that handles null checking 
        safeSyncUserProfile(userId, profile);
        
        // Sync weight change with server if provided
        if (weightChange) {
          void syncWeightChanges(userId, [weightChange]);
        }
      }
    },
    markTooltipAsViewed: (state) => {
      state.hasViewedTooltip = true;
    },
    resetAllQuestions: (state) => {
      state.questions = {};
      state.hasViewedTooltip = false; // Reset tooltip state when questions are reset
      state.interactionStartTimes = {};
    },
    resetPersonalization: (state, action: PayloadAction<{ userId?: string }>) => {
      const { userId } = action.payload;
      state.userProfile = createInitialUserProfile();
      state.feedExplanations = {};
      state.personalizedFeed = [];
      
      // Sync reset profile with server if user is logged in
      if (userId) {
        // Use safer version that handles null checking
        safeSyncUserProfile(userId, state.userProfile);
      }
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
    loadUserDataStart: (state, action: PayloadAction<{ userId: string }>) => {
      state.isSyncing = true;
    },
    loadUserDataSuccess: (state, action: PayloadAction<{ 
      profile: UserProfile | null;
      interactions: InteractionLog[];
      feedChanges: FeedChange[];
      weightChanges: WeightChange[];
      timestamp: number;
    }>) => {
      const { profile, interactions, feedChanges, weightChanges, timestamp } = action.payload;
      
      // Only update profile if we received one
      if (profile) {
        // Check if the server profile is newer than our local one
        if (profile.lastRefreshed > state.userProfile.lastRefreshed) {
          console.log('Updating local profile with newer server profile');
          state.userProfile = profile;
        } else {
          console.log('Local profile is newer than server profile, keeping local changes');
        }
      }
      
      // Merge interactions (avoid duplicates by questionId and timestamp)
      const existingInteractionKeys = new Set(
        state.syncedInteractions.map(i => `${i.questionId}-${i.timestamp}`)
      );
      
      const newInteractions = interactions.filter(
        i => !existingInteractionKeys.has(`${i.questionId}-${i.timestamp}`)
      );
      
      if (newInteractions.length > 0) {
        console.log(`Adding ${newInteractions.length} new interactions from server`);
        state.syncedInteractions = [...state.syncedInteractions, ...newInteractions];
      }
      
      // Merge feed changes (avoid duplicates by itemId and timestamp)
      const existingFeedChangeKeys = new Set(
        state.syncedFeedChanges.map(f => `${f.itemId}-${f.timestamp}`)
      );
      
      const newFeedChanges = feedChanges.filter(
        f => !existingFeedChangeKeys.has(`${f.itemId}-${f.timestamp}`)
      );
      
      if (newFeedChanges.length > 0) {
        console.log(`Adding ${newFeedChanges.length} feed changes from server`);
        state.syncedFeedChanges = [...state.syncedFeedChanges, ...newFeedChanges];
      }
      
      // Merge weight changes (avoid duplicates by questionId and timestamp)
      const existingWeightChangeKeys = new Set(
        state.syncedWeightChanges.map(w => `${w.questionId}-${w.timestamp}`)
      );
      
      const newWeightChanges = weightChanges.filter(
        w => !existingWeightChangeKeys.has(`${w.questionId}-${w.timestamp}`)
      );
      
      if (newWeightChanges.length > 0) {
        console.log(`Adding ${newWeightChanges.length} weight changes from server`);
        state.syncedWeightChanges = [...state.syncedWeightChanges, ...newWeightChanges];
      }
      
      // Update sync state
      state.isSyncing = false;
      state.lastSyncTime = timestamp;
    },
    loadUserDataFailure: (state) => {
      state.isSyncing = false;
    },
  },
});

export const { 
  answerQuestion, 
  skipQuestion, 
  markTooltipAsViewed, 
  resetAllQuestions,
  startInteraction,
  setPersonalizedFeed,
  updateUserProfile,
  resetPersonalization,
  startSync,
  finishSync,
  syncFailed,
  loadUserDataStart,
  loadUserDataSuccess,
  loadUserDataFailure
} = triviaSlice.actions;
export default triviaSlice.reducer;