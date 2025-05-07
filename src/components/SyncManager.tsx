import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  startSync, 
  finishSync, 
  syncFailed,
  updateUserProfile
} from '../store/triviaSlice';
import { 
  syncUserProfile, 
  syncUserInteractions,
  syncFeedChanges,
  fetchUserProfile
} from '../lib/syncService';
import { View, Text, StyleSheet } from 'react-native';

interface SyncManagerProps {
  children?: React.ReactNode;
}

/**
 * SyncManager Component
 * 
 * Handles background synchronization of user profile and interaction data
 * with Supabase when the user is authenticated.
 */
export const SyncManager: React.FC<SyncManagerProps> = ({ children }) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [initialized, setInitialized] = useState(false);
  
  // Get selector data from Redux store
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const syncedInteractions = useAppSelector(state => state.trivia.syncedInteractions);
  const syncedFeedChanges = useAppSelector(state => state.trivia.syncedFeedChanges);
  const lastSyncTime = useAppSelector(state => state.trivia.lastSyncTime);
  const isSyncing = useAppSelector(state => state.trivia.isSyncing);
  
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