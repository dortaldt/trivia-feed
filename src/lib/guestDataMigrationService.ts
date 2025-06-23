import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from './personalizationService';
import { QuestionState } from '../store/triviaSlice';
import { TopicRingsState } from '../types/topicRings';

interface GuestDataSnapshot {
  userProfile: UserProfile | null;
  questions: { [questionId: string]: QuestionState };
  topicRings: TopicRingsState | null;
  topicMap: { [questionId: string]: any } | null;
  deviceId: string | null;
  sessionData: { [key: string]: string | null };
  bannerState: { [key: string]: string | null };
  questionsCount: number;
  totalAnswered: number;
}

export class GuestDataMigrationService {
  
  /**
   * Capture all guest user data before signup/signin
   */
  static async captureGuestData(): Promise<GuestDataSnapshot> {
    console.log('[MIGRATION] 📦 Capturing guest data snapshot...');
    
    try {
      // Define all guest-related storage keys
      const guestKeys = [
        'redux_questions_guest',
        'topicRings_guest', 
        'topicRings_guest_topicMap',
        'mixpanel_device_id',
        'dismissed_banners',
        'swipe_tip_shown_questions',
        'sessionCount',
        'lastSessionDate',
        'feature_flags',
        'ring_click_state',
        'popover_dismissed',
        'currentlyViewingAuthScreen'
      ];

      // Get all storage keys first
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter for guest-related keys that actually exist
      const existingGuestKeys = allKeys.filter(key => 
        key.includes('guest') || 
        guestKeys.includes(key) ||
        key.startsWith('banner_') ||
        key.startsWith('mixpanel_')
      );

      console.log('[MIGRATION] Found existing guest keys:', existingGuestKeys);

      // Get all data in parallel
      const keyValuePairs = await AsyncStorage.multiGet(existingGuestKeys);
      const storageData: { [key: string]: string | null } = {};
      
      keyValuePairs.forEach(([key, value]) => {
        storageData[key] = value;
      });

      // Parse the main data structures
      const questions = storageData['redux_questions_guest'] ? 
        JSON.parse(storageData['redux_questions_guest']) : {};
      
      const topicRings = storageData['topicRings_guest'] ? 
        JSON.parse(storageData['topicRings_guest']) : null;
      
      const topicMap = storageData['topicRings_guest_topicMap'] ? 
        JSON.parse(storageData['topicRings_guest_topicMap']) : null;

      const deviceId = storageData['mixpanel_device_id'];

      // Separate session and banner data
      const sessionData: { [key: string]: string | null } = {};
      const bannerState: { [key: string]: string | null } = {};

      Object.entries(storageData).forEach(([key, value]) => {
        if (key.includes('session') || key.includes('Session')) {
          sessionData[key] = value;
        } else if (key.includes('banner') || key.includes('Banner') || key.includes('dismissed') || key.includes('swipe_tip')) {
          bannerState[key] = value;
        }
      });

      // Calculate stats
      const questionsCount = Object.keys(questions).length;
      const totalAnswered = Object.values(questions).filter(
        (q: any) => q.status === 'answered'
      ).length;

      const snapshot: GuestDataSnapshot = {
        userProfile: null, // Will be set by caller from Redux store
        questions,
        topicRings,
        topicMap,
        deviceId,
        sessionData,
        bannerState,
        questionsCount,
        totalAnswered
      };

      console.log('[MIGRATION] 📊 Guest data snapshot captured:', {
        questionsCount,
        totalAnswered,
        hasRings: !!topicRings,
        hasTopicMap: !!topicMap,
        hasDeviceId: !!deviceId,
        sessionDataKeys: Object.keys(sessionData).length,
        bannerStateKeys: Object.keys(bannerState).length
      });

      return snapshot;
    } catch (error) {
      console.error('[MIGRATION] ❌ Error capturing guest data:', error);
      return {
        userProfile: null,
        questions: {},
        topicRings: null,
        topicMap: null,
        deviceId: null,
        sessionData: {},
        bannerState: {},
        questionsCount: 0,
        totalAnswered: 0
      };
    }
  }

  /**
   * Migrate guest data to authenticated user storage
   */
  static async migrateToAuthenticatedUser(
    snapshot: GuestDataSnapshot, 
    authenticatedUserId: string
  ): Promise<boolean> {
    console.log('[MIGRATION] 🚀 Migrating guest data to authenticated user:', authenticatedUserId);
    console.log('[MIGRATION] 📊 Snapshot contents:', {
      hasUserProfile: !!snapshot.userProfile,
      userProfileData: snapshot.userProfile ? {
        totalQuestionsAnswered: snapshot.userProfile.totalQuestionsAnswered,
        topicsCount: Object.keys(snapshot.userProfile.topics || {}).length,
        coldStartComplete: snapshot.userProfile.coldStartComplete,
        lastRefreshed: snapshot.userProfile.lastRefreshed
      } : null,
      questionsCount: Object.keys(snapshot.questions).length,
      hasTopicRings: !!snapshot.topicRings,
      hasTopicMap: !!snapshot.topicMap
    });
    
    try {
      // Create new storage keys for authenticated user
      const authKeys = {
        questions: `redux_questions_${authenticatedUserId}`,
        topicRings: `topicRings_${authenticatedUserId}`,
        topicMap: `topicRings_${authenticatedUserId}_topicMap`
      };

      const migrations: Promise<void>[] = [];

      // Migrate questions data
      if (Object.keys(snapshot.questions).length > 0) {
        migrations.push(
          AsyncStorage.setItem(authKeys.questions, JSON.stringify(snapshot.questions))
        );
        console.log('[MIGRATION] Will migrate questions data:', Object.keys(snapshot.questions).length);
      }

      // Migrate topic rings data
      if (snapshot.topicRings) {
        migrations.push(
          AsyncStorage.setItem(authKeys.topicRings, JSON.stringify(snapshot.topicRings))
        );
        console.log('[MIGRATION] Will migrate topic rings data');
      }

      // Migrate topic mapping data
      if (snapshot.topicMap && Object.keys(snapshot.topicMap).length > 0) {
        migrations.push(
          AsyncStorage.setItem(authKeys.topicMap, JSON.stringify(snapshot.topicMap))
        );
        console.log('[MIGRATION] Will migrate topic mapping data:', Object.keys(snapshot.topicMap).length);
      }

      // **CRITICAL FIX**: Migrate user profile data to database
      console.log('[MIGRATION] 🔍 Checking user profile for database migration...');
      console.log('[MIGRATION] User profile exists:', !!snapshot.userProfile);
      
      if (snapshot.userProfile) {
        const totalQuestions = snapshot.userProfile.totalQuestionsAnswered || 0;
        const topicsCount = Object.keys(snapshot.userProfile.topics || {}).length;
        
        console.log('[MIGRATION] User profile details:', {
          totalQuestionsAnswered: totalQuestions,
          topicsCount: topicsCount,
          coldStartComplete: snapshot.userProfile.coldStartComplete,
          hasTopics: !!snapshot.userProfile.topics,
          topicKeys: Object.keys(snapshot.userProfile.topics || {})
        });
        
        const shouldMigrate = totalQuestions > 0 || topicsCount > 0;
        console.log('[MIGRATION] Should migrate to database:', shouldMigrate);
        
        if (shouldMigrate) {
          console.log('[MIGRATION] 🗄️ Starting database migration for user profile...');

          try {
            // Import Supabase client for database migration
            console.log('[MIGRATION] Importing Supabase client...');
            const { supabase } = await import('../lib/supabaseClient');
            console.log('[MIGRATION] Supabase client imported successfully');
            
            // Prepare user profile data for database
            const profileData = {
              id: authenticatedUserId,
              topics: snapshot.userProfile.topics || {},
              cold_start_complete: snapshot.userProfile.coldStartComplete || false,
              total_questions_answered: snapshot.userProfile.totalQuestionsAnswered || 0,
              last_refreshed: snapshot.userProfile.lastRefreshed || Date.now()
            };

            console.log('[MIGRATION] 📝 Profile data prepared for database:', {
              id: profileData.id,
              topicsCount: Object.keys(profileData.topics).length,
              cold_start_complete: profileData.cold_start_complete,
              total_questions_answered: profileData.total_questions_answered,
              last_refreshed: new Date(profileData.last_refreshed).toISOString(),
              sampleTopics: Object.keys(profileData.topics).slice(0, 3)
            });

            // Save to database using upsert to handle both insert and update cases
            console.log('[MIGRATION] 💾 Calling Supabase upsert...');
            const { data: upsertData, error: dbError } = await supabase
              .from('user_profile_data')
              .upsert(profileData, { 
                onConflict: 'id'
              })
              .select(); // Add select to get the upserted data back

            console.log('[MIGRATION] 📤 Supabase upsert response:', {
              hasError: !!dbError,
              errorMessage: dbError?.message,
              errorCode: dbError?.code,
              dataReturned: !!upsertData,
              dataLength: upsertData?.length || 0
            });

            if (dbError) {
              console.error('[MIGRATION] ❌ Error saving user profile to database:', {
                message: dbError.message,
                code: dbError.code,
                details: dbError.details,
                hint: dbError.hint
              });
              // Don't fail the entire migration if database save fails - local storage migration is still valuable
            } else {
              console.log('[MIGRATION] ✅ Successfully saved user profile to database');
              console.log('[MIGRATION] 📊 Upserted data:', upsertData);
              
              // Verify the data was saved by reading it back
              console.log('[MIGRATION] 🔍 Verifying data was saved by reading it back...');
              const { data: verifyData, error: verifyError } = await supabase
                .from('user_profile_data')
                .select('*')
                .eq('id', authenticatedUserId)
                .single();
                
              if (verifyError) {
                console.error('[MIGRATION] ❌ Error verifying saved data:', verifyError);
              } else {
                console.log('[MIGRATION] ✅ Verification successful - data in database:', {
                  id: verifyData.id,
                  topicsCount: Object.keys(verifyData.topics || {}).length,
                  total_questions_answered: verifyData.total_questions_answered,
                  cold_start_complete: verifyData.cold_start_complete
                });
              }
            }
                     } catch (dbSaveError: any) {
             console.error('[MIGRATION] 💥 Exception during database save:', {
               error: dbSaveError,
               message: dbSaveError?.message,
               stack: dbSaveError?.stack
             });
          }
        } else {
          console.log('[MIGRATION] ⏭️ Skipping database migration - no significant profile data');
        }
      } else {
        console.log('[MIGRATION] ⏭️ No user profile in snapshot - skipping database migration');
      }

      // Execute all local storage migrations in parallel
      console.log('[MIGRATION] 💾 Executing local storage migrations...');
      await Promise.all(migrations);
      console.log('[MIGRATION] ✅ Local storage migrations completed');

      // Keep device ID and global data intact - these don't need user-specific keys
      // Banner dismissals, session data, etc. should remain global for UX consistency

      console.log('[MIGRATION] ✅ Successfully migrated all guest data to authenticated user');
      
      // Log final migration summary
      console.log('[MIGRATION] 📋 Migration Summary:', {
        userId: authenticatedUserId,
        questionsTransferred: Object.keys(snapshot.questions).length,
        answeredQuestionsTransferred: snapshot.totalAnswered,
        topicRingsTransferred: !!snapshot.topicRings,
        topicMappingTransferred: !!snapshot.topicMap && Object.keys(snapshot.topicMap).length > 0,
        userProfileTransferred: !!snapshot.userProfile && ((snapshot.userProfile.totalQuestionsAnswered || 0) > 0 || Object.keys(snapshot.userProfile.topics || {}).length > 0),
        preservedGlobalData: ['deviceId', 'bannerState', 'sessionData']
      });

      return true;
    } catch (error: any) {
      console.error('[MIGRATION] ❌ Error migrating guest data:', {
        error,
        message: error?.message,
        stack: error?.stack
      });
      return false;
    }
  }

  /**
   * Clean up guest user data after successful migration
   */
  static async cleanupGuestData(): Promise<void> {
    console.log('[MIGRATION] 🧹 Cleaning up guest data...');
    
    try {
      // Only remove guest-specific data, keep global data like device ID, banners, etc.
      const guestKeysToRemove = [
        'redux_questions_guest',
        'topicRings_guest',
        'topicRings_guest_topicMap',
        'guestMode'
      ];

      await AsyncStorage.multiRemove(guestKeysToRemove);
      console.log('[MIGRATION] ✅ Guest data cleanup completed - removed:', guestKeysToRemove);
    } catch (error) {
      console.error('[MIGRATION] ⚠️ Error cleaning up guest data:', error);
      // Don't throw - cleanup failure shouldn't break the migration
    }
  }

  /**
   * Complete migration workflow
   */
  static async performCompleteMigration(
    guestUserProfile: UserProfile,
    authenticatedUserId: string
  ): Promise<boolean> {
    try {
      console.log('[MIGRATION] 🎯 Starting complete migration workflow...');
      console.log('[MIGRATION] Guest profile summary:', {
        totalQuestionsAnswered: guestUserProfile.totalQuestionsAnswered,
        topicsCount: Object.keys(guestUserProfile.topics || {}).length,
        coldStartComplete: guestUserProfile.coldStartComplete
      });

      // Step 1: Capture guest data
      const snapshot = await this.captureGuestData();
      snapshot.userProfile = guestUserProfile;

      // Only proceed if we have meaningful data to migrate
      if (snapshot.questionsCount === 0 && !snapshot.topicRings && (!snapshot.topicMap || Object.keys(snapshot.topicMap).length === 0)) {
        console.log('[MIGRATION] ℹ️ No significant guest data to migrate');
        
        // Still clean up guest mode flag
        await AsyncStorage.removeItem('guestMode');
        return true;
      }

      // Step 2: Migrate to authenticated user storage
      const migrationSuccess = await this.migrateToAuthenticatedUser(snapshot, authenticatedUserId);
      
      if (migrationSuccess) {
        // Step 3: Clean up guest data
        await this.cleanupGuestData();
        
        console.log('[MIGRATION] 🎉 Complete migration successful!');
        console.log('[MIGRATION] 📊 Final Summary:', {
          userId: authenticatedUserId,
          questionsPreserved: snapshot.questionsCount,
          answeredQuestionsPreserved: snapshot.totalAnswered,
          userProgressPreserved: guestUserProfile.totalQuestionsAnswered,
          personalizationPreserved: Object.keys(guestUserProfile.topics || {}).length > 0
        });
        
        return true;
      } else {
        console.log('[MIGRATION] ❌ Migration failed, keeping guest data');
        return false;
      }
    } catch (error) {
      console.error('[MIGRATION] 💥 Complete migration failed:', error);
      return false;
    }
  }

  /**
   * Check if guest has meaningful data worth migrating
   */
  static async hasSignificantGuestData(): Promise<{
    hasData: boolean;
    summary: {
      questionsAnswered: number;
      topicsExplored: string[];
      hasProgress: boolean;
    }
  }> {
    try {
      const snapshot = await this.captureGuestData();
      
      const questionsAnswered = Object.values(snapshot.questions).filter(
        (q: any) => q.status === 'answered'
      ).length;

      const topicsExplored = snapshot.topicMap ? 
        [...new Set(Object.values(snapshot.topicMap).map((mapping: any) => mapping.topic || mapping))] : 
        [];

             const hasProgress = questionsAnswered > 2 || topicsExplored.length > 1 || 
         (snapshot.topicRings && Object.keys(snapshot.topicRings.rings || {}).length > 0);

       return {
         hasData: Boolean(hasProgress),
         summary: {
           questionsAnswered,
           topicsExplored,
           hasProgress: Boolean(hasProgress)
         }
       };
    } catch (error) {
      console.error('[MIGRATION] Error checking guest data significance:', error);
      return {
        hasData: false,
        summary: {
          questionsAnswered: 0,
          topicsExplored: [],
          hasProgress: false
        }
      };
    }
  }
} 