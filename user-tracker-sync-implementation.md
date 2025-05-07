# User Tracking Data Synchronization Implementation

## Overview
This document outlines the implementation of storing user tracking data in Supabase to enable cross-device sync and persistent user profiles. Currently, the app maintains user interaction data and personalization profile locally, which is lost when the app is reinstalled or when using a different device.

## Goals
- Store all user interaction data in Supabase
- Enable profile synchronization across devices
- Maintain local performance while providing server sync
- Support offline functionality with sync when connection is restored

## Implementation Phases

### Phase 1: Data Analysis ✅
- [x] Analyze tracker data structure
- [x] Identify required database schema changes
- [x] Map client-side data to server-side schema

### Phase 2: Database Schema ✅
- [x] Create user profile sync table for personalization data
- [x] Create user interactions table for individual question interactions
- [x] Create user feed changes table for tracking feed changes
- [x] Add necessary indexes and constraints
- [x] Set up Row Level Security (RLS) policies

### Phase 3: Client Implementation ✅
- [x] Modify personalization service to support server sync
- [x] Create sync service to handle data transfer
- [x] Implement background sync with retry mechanism
- [x] Add conflict resolution strategy
- [x] Update reducer actions to handle sync state

### Phase 4: Testing & Optimization
- [ ] Test sync functionality across devices
- [ ] Optimize data transfer payloads
- [ ] Add offline support with local-first approach
- [ ] Performance testing

## Data Structure Analysis

### Key Data Types to Sync

1. **User Profile**
   - Topic weights and preferences
   - Cold start status
   - Question interaction history

2. **Interaction Logs**
   - Question interactions (correct/incorrect/skipped)
   - Time spent on questions
   - Timestamps

3. **Feed Personalization Data**
   - Selection methods
   - Weight factors used in selection
   - Feed explanations

## Database Schema Design

We have created the following tables:
1. `user_profile_data` - Stores serialized user profile JSON
   - Contains topics as JSONB data
   - Cold start status and total questions answered
   - Versioning for optimistic concurrency control

2. `user_interactions` - Stores individual question interactions
   - Timestamps in milliseconds for precise ordering
   - Interaction type (correct/incorrect/skipped)
   - Time spent on questions
   - Unique constraint on user_id + question_id + timestamp

3. `user_feed_changes` - Stores feed personalization data
   - Weight factors and explanations as JSONB
   - Support for tracking both additions and removals

All tables have Row Level Security to ensure users can only access their own data, and appropriate indexes have been added for query performance.

## Client Implementation

We've built the following components to enable synchronization:

1. **SyncService**
   - Core functions for syncing data to and from Supabase
   - Support for user profile, interactions, and feed changes
   - Optimistic concurrency control for profile updates
   - Conflict resolution for simultaneous updates

2. **Redux Integration**
   - Updated triviaSlice to track sync state
   - Added reducers for sync operations
   - Integrated sync operations into existing actions
   - Tracking of synced vs. unsynced data

3. **Type Definitions**
   - Created proper TypeScript interfaces for all sync-related data
   - Ensured type safety between client and server representations

4. **SyncManager Component**
   - Background synchronization management
   - Initializes user profile from server on login
   - Performs periodic sync to ensure data consistency
   - Final sync when user logs out

The implementation follows a "local-first" approach where operations are performed locally first for performance, then synchronized with the server. This ensures the app remains responsive even in low connectivity situations.

## Implementation Steps

1. **Database Setup**
   - Run the SQL script `sql/create_user_tracking_tables.sql` in the Supabase SQL Editor

2. **Dependencies Installation**
   - Run `./install-sync-dependencies.sh` to install required packages
   - These include `@react-native-community/netinfo` and `expo-device`

3. **Code Implementation**
   - Created tracker data types in `src/types/trackerTypes.ts`
   - Implemented sync service in `src/lib/syncService.ts`
   - Updated Redux slice in `src/store/triviaSlice.ts`
   - Added SyncManager component in `src/components/SyncManager.tsx`
   - Integrated SyncManager in `app/_layout.tsx`

## Testing

To test the implementation:

1. **Local Testing**
   - Log in with a test account
   - Check the console for sync-related log messages
   - Verify data is being stored in Supabase tables

2. **Cross-Device Testing**
   - Log in with the same account on different devices
   - Interact with the app on one device (answer questions, etc.)
   - Check if the interactions synchronize to the other device

3. **Offline Testing**
   - Put the device in airplane mode
   - Interact with the app
   - Turn airplane mode off
   - Verify that data syncs when connectivity is restored

## Future Improvements

1. **Optimize Sync Frequency**
   - Currently syncs every minute, which might be too frequent
   - Consider context-aware syncing (e.g., on app background/foreground)

2. **Batch Processing**
   - Implement batching for large data sets to reduce API calls

3. **Compression**
   - Add compression for profile data to reduce payload size

4. **Conflict Resolution**
   - Enhance conflict resolution with more sophisticated merging strategies 