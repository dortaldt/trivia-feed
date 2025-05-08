import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  startSync, 
  finishSync, 
  syncFailed,
  updateUserProfile,
  loadUserDataStart,
  loadUserDataSuccess
} from '../store/triviaSlice';
import { 
  syncUserProfile, 
  syncUserInteractions,
  syncFeedChanges,
  fetchUserProfile,
  fetchUserInteractions,
  fetchFeedChanges,
  fetchWeightChanges,
  cleanupFeedChanges
} from '../lib/syncService';
import { View, Text, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';

interface SyncManagerProps {
  children?: React.ReactNode;
}

/**
 * SyncManager Component
 * 
 * Handles background synchronization of user profile, interaction data, and database cleanup
 * with Supabase when the user is authenticated.
 */
export const SyncManager: React.FC<SyncManagerProps> = ({ children }) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [initialized, setInitialized] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);
  
  // Get selector data from Redux store
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const syncedInteractions = useAppSelector(state => state.trivia.syncedInteractions);
  const syncedFeedChanges = useAppSelector(state => state.trivia.syncedFeedChanges);
  const lastSyncTime = useAppSelector(state => state.trivia.lastSyncTime);
  const isSyncing = useAppSelector(state => state.trivia.isSyncing);
  
  // Update the ref when user changes
  useEffect(() => {
    if (user && user.id) {
      userIdRef.current = user.id;
    } else {
      userIdRef.current = null;
    }
  }, [user]);
  
  // Initial data load - do this once when the user logs in
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user || !user.id || initialDataLoaded) return;
      
      try {
        dispatch(loadUserDataStart());
        console.log('SyncManager: Loading initial user data');
        
        // Aggressive cleanup when app starts
        await cleanupFeedChanges(user.id);
        
        // Load interactions
        const interactions = await fetchUserInteractions(user.id, lastSyncTime);
        
        // Load feed changes - limited to 100 entries
        const feedChanges = await fetchFeedChanges(user.id, lastSyncTime);
        
        // Load weight changes
        const weightChanges = await fetchWeightChanges(user.id, lastSyncTime);
        
        dispatch(loadUserDataSuccess({ 
          profile: userProfile, 
          interactions, 
          feedChanges,
          weightChanges,
          timestamp: Date.now()
        }));
        
        setInitialDataLoaded(true);
      } catch (error) {
        console.error('SyncManager: Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, [user, userProfile, initialDataLoaded, lastSyncTime, dispatch]);
  
  // Periodically run cleanup to prevent database bloat
  useEffect(() => {
    // Skip if no user
    if (!user || !user.id) return;
    
    console.log('SyncManager: Setting up cleanup interval');
    
    const cleanupInterval = setInterval(() => {
      const userId = userIdRef.current;
      if (!userId) return;
      
      // Run the cleanup
      (async () => {
        try {
          console.log('SyncManager: Running periodic cleanup');
          await cleanupFeedChanges(userId);
        } catch (error) {
          console.error('SyncManager: Error during periodic cleanup:', error);
        }
      })();
    }, 15 * 60 * 1000); // Run every 15 minutes
    
    // Cleanup on unmount
    return () => {
      clearInterval(cleanupInterval);
    };
  }, [user]);
  
  // Fetch remote profile on initial load when authenticated
  useEffect(() => {
    const initializeProfile = async () => {
      if (user && !initialized) {
        console.log('SyncManager: Initializing profile for user', user.id);
        
        try {
          dispatch(startSync());
          
          // Fetch the remote profile
          const remoteProfile = await fetchUserProfile(user.id);
          
          if (remoteProfile) {
            console.log('SyncManager: Remote profile found, updating local profile');
            
            // If the remote profile is newer than our local profile, use it
            if (remoteProfile.lastRefreshed > userProfile.lastRefreshed) {
              dispatch(updateUserProfile({ 
                profile: {
                  ...remoteProfile,
                  // Merge interactions with local data to avoid losing any
                  interactions: {
                    ...userProfile.interactions,
                    ...remoteProfile.interactions
                  }
                },
                userId: user.id
              }));
              console.log('SyncManager: Updated local profile with remote data');
            } else {
              // If our local profile is newer, sync it to the server
              console.log('SyncManager: Local profile is newer, syncing to server');
              await syncUserProfile(user.id, userProfile);
            }
          } else {
            // No remote profile exists, create one
            console.log('SyncManager: No remote profile found, creating one');
            await syncUserProfile(user.id, userProfile);
          }
          
          dispatch(finishSync(Date.now()));
          setInitialized(true);
        } catch (error) {
          console.error('SyncManager: Error initializing profile:', error);
          dispatch(syncFailed());
        }
      }
    };
    
    initializeProfile();
  }, [user, initialized, dispatch, userProfile]);
  
  // Periodically sync changes to the server
  useEffect(() => {
    if (!user) return;
    
    const syncInterval = setInterval(async () => {
      if (isSyncing || !user.id) return;
      
      try {
        dispatch(startSync());
        console.log('SyncManager: Running periodic sync');
        
        // Sync profile
        await syncUserProfile(user.id, userProfile);
        
        // Sync any unsynchronized interactions
        if (syncedInteractions.length > 0) {
          await syncUserInteractions(user.id, syncedInteractions);
        }
        
        // Sync any unsynchronized feed changes
        if (syncedFeedChanges.length > 0) {
          await syncFeedChanges(user.id, syncedFeedChanges);
        }
        
        dispatch(finishSync(Date.now()));
      } catch (error) {
        console.error('SyncManager: Error during periodic sync:', error);
        dispatch(syncFailed());
      }
    }, 60000); // Sync every minute
    
    return () => {
      clearInterval(syncInterval);
    };
  }, [user, isSyncing, userProfile, syncedInteractions, syncedFeedChanges, dispatch]);
  
  // Final sync when the user logs out
  useEffect(() => {
    return () => {
      const finalSync = async () => {
        if (user && user.id) {
          console.log('SyncManager: Performing final sync before unmounting');
          try {
            await syncUserProfile(user.id, userProfile);
            
            if (syncedInteractions.length > 0) {
              await syncUserInteractions(user.id, syncedInteractions);
            }
            
            if (syncedFeedChanges.length > 0) {
              await syncFeedChanges(user.id, syncedFeedChanges);
            }
            
            // Final cleanup before unmounting
            await cleanupFeedChanges(user.id);
          } catch (error) {
            console.error('SyncManager: Error during final sync:', error);
          }
        }
      };
      
      finalSync();
    };
  }, [user, userProfile, syncedInteractions, syncedFeedChanges]);
  
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 5,
    borderRadius: 5
  },
  text: {
    color: 'white',
    fontSize: 12
  }
}); 