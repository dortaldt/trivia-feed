import { configureStore, combineReducers } from '@reduxjs/toolkit';
import triviaReducer from './triviaSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

// Configure persistence
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // Only persist hasViewedTooltip and other essential fields
  whitelist: ['trivia']
};

const rootReducer = combineReducers({
  trivia: triviaReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;