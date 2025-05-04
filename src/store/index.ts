import { configureStore } from '@reduxjs/toolkit';
import triviaReducer from './triviaSlice';

export const store = configureStore({
  reducer: {
    trivia: triviaReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;