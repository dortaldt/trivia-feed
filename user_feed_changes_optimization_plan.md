# User Feed Changes Optimization Plan

## Problem Statement

The `user_feed_changes` table currently has approximately 1,000 records and continues to grow without bounds. This is causing:

1. Database bloat
2. Potential performance degradation
3. Increased storage costs
4. Slower query performance

## Root Causes Identified

Based on code analysis, the following issues contribute to the problem:

1. **No Retention Policy**: No mechanism exists to delete or archive old records
2. **Frequent Feed Change Recording**: Changes are recorded in multiple places:
   - Redux store updates via `setPersonalizedFeed`
   - During cold start phase
   - Proactive feed replenishment
   - Manual feed refreshes
3. **Redundant Data Storage**: Large JSON objects in `explanations` and `weight_factors` columns
4. **Missing Batching**: Changes are inserted immediately rather than batched

## Implementation Plan

### 1. Database Retention Policy
- [x] **Status**: Completed - 2024-07-30
- **Description**: Create a SQL procedure to regularly clean up old feed changes
- **Implementation**:
  ```sql
  -- Create a retention policy function to run regularly
  CREATE OR REPLACE FUNCTION clean_old_feed_changes()
  RETURNS void AS $$
  BEGIN
    -- Keep only 7 days of feed changes
    DELETE FROM public.user_feed_changes 
    WHERE timestamp < (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000);
  END;
  $$ LANGUAGE plpgsql;

  -- Create a cron job to run the function regularly (if using pg_cron extension)
  SELECT cron.schedule('daily-feed-changes-cleanup', '0 3 * * *', 'SELECT clean_old_feed_changes()');
  ```
- **Alternative Without pg_cron**:
  - [x] Create a manual cleanup endpoint that can be called on application startup
  - [x] Schedule cleanup as part of a regular maintenance task
- **Notes**: Implemented in `sql/feed_changes_retention_policy.sql`. The script includes both pg_cron scheduling (if available) and a manual trigger function that can be called from the application.

### 2. Optimize Data Storage in syncFeedChanges Function
- [x] **Status**: Completed - 2024-07-30
- **Description**: Modify the function to store only essential data and batch changes
- **File**: `src/lib/syncService.ts`
- **Implementation**:
  ```typescript
  export async function syncFeedChanges(
    userId: string, 
    feedChanges: FeedChange[]
  ): Promise<void> {
    try {
      if (!userId || !feedChanges.length) {
        return;
      }

      // Only record significant feed changes or batch multiple changes
      if (feedChanges.length < 5) {
        console.log(`Skipping sync of only ${feedChanges.length} feed changes`);
        return; // Skip small batches
      }

      console.log(`Syncing ${feedChanges.length} feed changes`);
      
      const deviceId = getDeviceId();
      
      // Prepare feed changes for insert - optimize storage
      const formattedChanges = feedChanges.map(change => ({
        user_id: userId,
        timestamp: change.timestamp,
        change_type: change.type,
        item_id: change.itemId,
        question_text: change.questionText,
        // Only store essential explanations
        explanations: change.explanations.slice(0, 2), // Limit to first 2 explanations
        // Only store essential weight factors
        weight_factors: {
          category: change.weightFactors?.category,
          selectionMethod: change.weightFactors?.selectionMethod
        }
      }));
      
      // Insert feed changes
      const { error } = await supabase
        .from('user_feed_changes')
        .insert(formattedChanges);
      
      // Log the insert operation
      logDbOperation(
        'sent', 
        'user_feed_changes', 
        'insert', 
        feedChanges.length, 
        formattedChanges,
        userId,
        error ? 'error' : 'success',
        error?.message
      );
      
      if (error) {
        console.error('Error syncing feed changes:', error);
      } else {
        console.log(`Successfully synced ${feedChanges.length} feed changes`);
      }
    } catch (error) {
      console.error('Error in syncFeedChanges:', error);
    }
  }
  ```
- **Notes**: Modified to skip small batches and reduce storage size by limiting explanations and weight factors.

### 3. Add Record Limiting to fetchFeedChanges
- [x] **Status**: Completed - 2024-07-30
- **Description**: Modify the fetch function to limit the number of records returned
- **File**: `src/lib/syncService.ts`
- **Implementation**:
  ```typescript
  export async function fetchFeedChanges(
    userId: string,
    afterTimestamp?: number
  ): Promise<FeedChange[]> {
    try {
      if (!userId) {
        return [];
      }

      console.log('Fetching feed changes');
      
      let query = supabase
        .from('user_feed_changes')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100); // Only fetch the most recent 100 records
      
      // If afterTimestamp is provided, only get newer changes
      if (afterTimestamp) {
        query = query.gt('timestamp', afterTimestamp);
      }
      
      // Rest of the implementation remains the same...
      
      return data.map((item: any) => ({
        timestamp: item.timestamp,
        type: item.change_type as 'added' | 'removed',
        itemId: item.item_id,
        questionText: item.question_text || `Question ${item.item_id}`,
        explanations: item.explanations || [],
        weightFactors: item.weight_factors
      }));
    } catch (error) {
      console.error('Error in fetchFeedChanges:', error);
      return [];
    }
  }
  ```
- **Notes**: Added a limit of 100 records to prevent loading too much data at once.

### 4. Optimize InteractionTracker Component
- [x] **Status**: Completed - 2024-07-30
- **Description**: Limit the number of operations tracked in the UI
- **File**: `src/components/InteractionTracker.tsx`
- **Implementation**:
  ```typescript
  // Modify the handleDbOperation function
  const handleDbOperation = (operation: DbOperation) => {
    // Filter operations for user_feed_changes table to reduce noise
    if (operation.table === 'user_feed_changes') {
      // Only track operations with significant record count for feed changes
      if (operation.records > 5 || operation.operation !== 'insert') {
        setDbOperations(prev => [operation, ...prev].slice(0, 50)); // Limit to 50 operations for feed changes
      }
    } else {
      // For other tables: keep more detailed history
      setDbOperations(prev => [operation, ...prev].slice(0, 100));
    }
  };
  ```
- **Notes**: Enhanced filtering to show only significant user_feed_changes operations (more than 5 records or non-insert operations).

### 5. Add Client-Side Cleanup Mechanism
- [x] **Status**: Completed - 2024-07-30
- **Description**: Add a function to clean up old feed changes on client startup
- **File**: `src/lib/syncService.ts`
- **Implementation**:
  ```typescript
  export async function cleanupFeedChanges(userId: string): Promise<void> {
    try {
      if (!userId) {
        return;
      }
      
      // Get timestamp from 7 days ago
      const oldTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      console.log('Cleaning up old feed changes');
      
      // Delete old records
      const { data, error } = await supabase
        .from('user_feed_changes')
        .delete()
        .eq('user_id', userId)
        .lt('timestamp', oldTimestamp)
        .select('count');
      
      // Log the delete operation
      logDbOperation(
        'sent', 
        'user_feed_changes', 
        'delete', 
        1, 
        { 
          query: { user_id: userId, timestamp: `<${oldTimestamp}` }
        },
        userId,
        error ? 'error' : 'success',
        error?.message
      );
      
      if (error) {
        console.error('Error cleaning up feed changes:', error);
      } else {
        const count = data ? data.length : 0;
        console.log(`Successfully cleaned up ${count} old feed changes`);
      }
    } catch (error) {
      console.error('Error in cleanupFeedChanges:', error);
    }
  }
  ```
- **Notes**: Function added and integrated into SyncManager component to run on app startup.

### 6. Create a Migration to Clean Existing Data
- [x] **Status**: Completed - 2024-07-30
- **Description**: One-time operation to clean up existing records
- **Implementation**:
  ```sql
  -- Remove duplicate feed changes
  WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, item_id, timestamp ORDER BY id) as rn
    FROM public.user_feed_changes
  )
  DELETE FROM public.user_feed_changes
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  -- Keep only recent records
  DELETE FROM public.user_feed_changes
  WHERE timestamp < (EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000);

  -- Optional: Vacuum the table to reclaim space
  VACUUM FULL public.user_feed_changes;
  ```
- **Notes**: Created comprehensive script in `sql/feed_changes_data_cleanup.sql` that creates a backup, removes duplicates, cleans up old records, and optimizes table storage.

### 7. Add Change Summary Table (Optional - Long Term)
- [ ] **Status**: Not started
- **Description**: Create a summary table to store aggregated changes instead of individual records
- **Implementation**:
  - [ ] Create new table schema for `user_feed_change_summaries`
  - [ ] Implement summary generation function
  - [ ] Update data retrieval to use summary table where appropriate

## Tracking Implementation Progress

| Step | Description | Owner | Status | Date Completed | Notes |
|------|-------------|-------|--------|----------------|-------|
| 1 | Database Retention Policy | | Completed | 2024-07-30 | Created SQL function with pg_cron support and manual trigger |
| 2 | Optimize Data Storage | | Completed | 2024-07-30 | Modified syncFeedChanges to skip small batches and reduce storage size |
| 3 | Add Record Limiting | | Completed | 2024-07-30 | Added 100 record limit to fetchFeedChanges |
| 4 | Optimize InteractionTracker | | Completed | 2024-07-30 | Enhanced tracking filter for user_feed_changes operations |
| 5 | Add Client-Side Cleanup | | Completed | 2024-07-30 | Added cleanupFeedChanges function and integration with SyncManager |
| 6 | Create Data Migration | | Completed | 2024-07-30 | Created comprehensive SQL script for one-time cleanup |
| 7 | Add Summary Table | | Not started | | |

## Metrics to Measure Success

1. **Record Count**: Monitor the total number of records in the `user_feed_changes` table
2. **Database Size**: Track the size of the table before and after implementation
3. **Query Performance**: Measure query execution time before and after optimization
4. **Data Transfer**: Monitor the amount of data transferred when fetching feed changes

## Rollback Plan

In case of issues with any of the optimization steps:

1. **Retention Policy**: Can be disabled by removing the scheduled job
2. **Code Changes**: Maintain previous versions in Git for quick rollback
3. **Data Migration**: Create a backup before executing any data cleanup scripts 