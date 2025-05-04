import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define a type for possible question states
export type QuestionState = {
  status: 'unanswered' | 'skipped' | 'answered';
  answerIndex?: number;
};

interface TriviaState {
  questions: {
    [questionId: string]: QuestionState;
  };
  hasViewedTooltip: boolean;
}

const initialState: TriviaState = {
  questions: {},
  hasViewedTooltip: false,
};

const triviaSlice = createSlice({
  name: 'trivia',
  initialState,
  reducers: {
    answerQuestion: (state, action: PayloadAction<{ questionId: string; answerIndex: number }>) => {
      const { questionId, answerIndex } = action.payload;
      state.questions[questionId] = { 
        status: 'answered',
        answerIndex: answerIndex 
      };
    },
    skipQuestion: (state, action: PayloadAction<{ questionId: string }>) => {
      const { questionId } = action.payload;
      // Only mark as skipped if it hasn't been answered yet
      if (!state.questions[questionId] || state.questions[questionId].status !== 'answered') {
        state.questions[questionId] = { 
          status: 'skipped' 
        };
      }
    },
    markTooltipAsViewed: (state) => {
      state.hasViewedTooltip = true;
    },
    resetAllQuestions: (state) => {
      state.questions = {};
      state.hasViewedTooltip = false; // Reset tooltip state when questions are reset
    },
  },
});

export const { answerQuestion, skipQuestion, markTooltipAsViewed, resetAllQuestions } = triviaSlice.actions;
export default triviaSlice.reducer;