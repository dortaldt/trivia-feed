import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, createInitialUserProfile } from '../lib/personalizationService';
import { FeedItem } from '../lib/triviaService';

// Define a type for possible question states
export type QuestionState = {
  status: 'unanswered' | 'skipped' | 'answered';
  answerIndex?: number;
  timeSpent?: number; // Track time spent on the question
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
}

const initialState: TriviaState = {
  questions: {},
  hasViewedTooltip: false,
  userProfile: createInitialUserProfile(),
  feedExplanations: {},
  personalizedFeed: [],
  interactionStartTimes: {},
};

const triviaSlice = createSlice({
  name: 'trivia',
  initialState,
  reducers: {
    answerQuestion: (state, action: PayloadAction<{ questionId: string; answerIndex: number; isCorrect: boolean }>) => {
      const { questionId, answerIndex, isCorrect } = action.payload;
      
      // Calculate time spent
      const startTime = state.interactionStartTimes[questionId] || Date.now();
      const timeSpent = Date.now() - startTime;
      
      // Log the answered question and timing information
      console.log(`[Redux] Answering question ${questionId}: answer=${answerIndex}, correct=${isCorrect}, time spent=${timeSpent}ms`);
      
      // Update question state
      state.questions[questionId] = { 
        status: 'answered',
        answerIndex,
        timeSpent
      };
      
      // Clear interaction start time
      delete state.interactionStartTimes[questionId];
    },
    skipQuestion: (state, action: PayloadAction<{ questionId: string }>) => {
      const { questionId } = action.payload;
      // Only mark as skipped if it hasn't been answered yet
      if (!state.questions[questionId] || state.questions[questionId].status !== 'answered') {
        // Calculate time spent
        const startTime = state.interactionStartTimes[questionId] || Date.now();
        const timeSpent = Date.now() - startTime;
        
        // Log the skipped question and timing information
        console.log(`[Redux] Skipping question ${questionId}: time spent = ${timeSpent}ms`);
        
        state.questions[questionId] = { 
          status: 'skipped',
          timeSpent
        };
        
        // Clear interaction start time
        delete state.interactionStartTimes[questionId];
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
    setPersonalizedFeed: (state, action: PayloadAction<{ items: FeedItem[]; explanations: { [questionId: string]: string[] } }>) => {
      const { items, explanations } = action.payload;
      state.personalizedFeed = items;
      state.feedExplanations = explanations;
    },
    updateUserProfile: (state, action: PayloadAction<UserProfile>) => {
      state.userProfile = action.payload;
    },
    markTooltipAsViewed: (state) => {
      state.hasViewedTooltip = true;
    },
    resetAllQuestions: (state) => {
      state.questions = {};
      state.hasViewedTooltip = false; // Reset tooltip state when questions are reset
      state.interactionStartTimes = {};
    },
    resetPersonalization: (state) => {
      state.userProfile = createInitialUserProfile();
      state.feedExplanations = {};
      state.personalizedFeed = [];
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
  resetPersonalization
} = triviaSlice.actions;
export default triviaSlice.reducer;