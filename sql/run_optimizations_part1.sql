-- EXECUTE ALL OPTIMIZATIONS (PART 1)
-- Run this script in Supabase SQL Editor to immediately optimize the user_feed_changes table

-- Start a transaction
BEGIN;

-- Log the starting state
DO $$
DECLARE
    total_count INTEGER;
    future_dates INTEGER;
    duplicate_estimate INTEGER;
BEGIN
    -- Count total records
    SELECT COUNT(*) INTO total_count FROM public.user_feed_changes;
    
    -- Count future dates
    SELECT COUNT(*) INTO future_dates 
    FROM public.user_feed_changes 
    WHERE created_at > NOW();
    
    -- Estimate duplicates (simplified)
    WITH sample AS (
        SELECT user_id, item_id, COUNT(*) as ct
        FROM public.user_feed_changes
        GROUP BY user_id, item_id
        HAVING COUNT(*) > 1
        LIMIT 1000
    )
    SELECT SUM(ct - 1) INTO duplicate_estimate FROM sample;
    
    -- Log the counts
    RAISE NOTICE 'Before optimization: Total records: %, Future dates: %, Estimated duplicates: %', 
                 total_count, future_dates, duplicate_estimate;
END $$;

-- 1. Execute stored procedures directly instead of importing
-- Create fix_future_timestamps function
CREATE OR REPLACE FUNCTION public.fix_future_timestamps(user_id_param UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Fix created_at and timestamp for records with future dates
  IF user_id_param IS NULL THEN
    -- Fix for all users
    UPDATE public.user_feed_changes
    SET created_at = NOW(),
        timestamp = EXTRACT(EPOCH FROM NOW()) * 1000
    WHERE created_at > NOW();
  ELSE
    -- Fix only for specific user
    UPDATE public.user_feed_changes
    SET created_at = NOW(),
        timestamp = EXTRACT(EPOCH FROM NOW()) * 1000
    WHERE created_at > NOW() AND user_id = user_id_param;
  END IF;
  
  RAISE NOTICE 'Fixed future timestamps in user_feed_changes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for this function
ALTER FUNCTION public.fix_future_timestamps(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fix_future_timestamps(UUID) TO service_role;

-- Create limit_feed_changes_per_user function
CREATE OR REPLACE FUNCTION public.limit_feed_changes_per_user(
  user_id_param UUID DEFAULT NULL,
  max_records INTEGER DEFAULT 100
)
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF user_id_param IS NULL THEN
    -- Process all users
    WITH ranked_changes AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp DESC) as rn
      FROM public.user_feed_changes
    ),
    deleted AS (
      DELETE FROM public.user_feed_changes
      WHERE id IN (SELECT id FROM ranked_changes WHERE rn > max_records)
      RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
  ELSE
    -- Process specific user
    WITH ranked_changes AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp DESC) as rn
      FROM public.user_feed_changes
      WHERE user_id = user_id_param
    ),
    deleted AS (
      DELETE FROM public.user_feed_changes
      WHERE id IN (SELECT id FROM ranked_changes WHERE rn > max_records)
      RETURNING *
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
  END IF;
  
  RAISE NOTICE 'Limited feed changes to % per user, deleted % records', max_records, deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for this function
ALTER FUNCTION public.limit_feed_changes_per_user(UUID, INTEGER) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.limit_feed_changes_per_user(UUID, INTEGER) TO service_role;

-- Create setup_feed_changes_daily_cleanup function
CREATE OR REPLACE FUNCTION public.setup_feed_changes_daily_cleanup()
RETURNS void AS $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- First remove any existing schedule
    PERFORM cron.unschedule('daily-feed-changes-cleanup');
    
    -- Create a schedule to run the cleanup function 3 times daily (every 8 hours)
    PERFORM cron.schedule(
      'feed-changes-cleanup-morning',
      '0 6 * * *',  -- 6 AM
      'SELECT public.clean_old_feed_changes()'
    );
    
    PERFORM cron.schedule(
      'feed-changes-cleanup-afternoon',
      '0 14 * * *', -- 2 PM
      'SELECT public.clean_old_feed_changes()'
    );
    
    PERFORM cron.schedule(
      'feed-changes-cleanup-night',
      '0 22 * * *', -- 10 PM
      'SELECT public.clean_old_feed_changes()'
    );
    
    RAISE NOTICE 'Scheduled feed changes cleanup to run 3 times daily using pg_cron';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. You will need to set up a scheduled task manually.';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Execute data cleanup operations directly

-- Create a backup of the current table
CREATE TABLE IF NOT EXISTS public.user_feed_changes_backup AS 
SELECT * FROM public.user_feed_changes;

-- STEP 1: Fix future timestamps (2025 dates)
UPDATE public.user_feed_changes
SET created_at = NOW(),
    timestamp = EXTRACT(EPOCH FROM NOW()) * 1000
WHERE created_at > NOW();

-- STEP 2: Remove exact duplicates (keep only one copy)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY user_id, item_id, timestamp, change_type, question_text
               ORDER BY id
           ) as rn
    FROM public.user_feed_changes
)
DELETE FROM public.user_feed_changes
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- STEP 3: Limit entries per user_id (keep only most recent 100 per user)
WITH ranked_changes AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp DESC) as rn
    FROM public.user_feed_changes
)
DELETE FROM public.user_feed_changes
WHERE id IN (SELECT id FROM ranked_changes WHERE rn > 100);

-- STEP 4: Truncate oversized text fields (alternative approach)
UPDATE public.user_feed_changes
SET explanations = (
    -- Convert to a text array, truncate elements, then back to JSONB
    SELECT to_jsonb(array(
        SELECT CASE
            WHEN length(x) > 100 THEN substring(x, 1, 100)
            ELSE x
        END
        FROM jsonb_array_elements_text(explanations) AS x
    ))
)
WHERE explanations IS NOT NULL 
AND jsonb_array_length(explanations) > 0;

-- STEP 5: Remove old records (aggressive 3-day retention)
DELETE FROM public.user_feed_changes
WHERE timestamp < (EXTRACT(EPOCH FROM NOW() - INTERVAL '3 days') * 1000);

-- Update the retention policy to be more aggressive (3 days instead of 7)
CREATE OR REPLACE FUNCTION public.clean_old_feed_changes()
RETURNS void AS $$
BEGIN
  -- Keep only 3 days of feed changes
  DELETE FROM public.user_feed_changes 
  WHERE timestamp < (EXTRACT(EPOCH FROM NOW() - INTERVAL '3 days') * 1000);
  
  -- Log the cleanup operation
  RAISE NOTICE 'Cleaned up user_feed_changes older than 3 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Run cleanup and setup functions
SELECT public.setup_feed_changes_daily_cleanup();
SELECT public.fix_future_timestamps();
SELECT public.limit_feed_changes_per_user();
SELECT public.clean_old_feed_changes();

-- 4. Create index to improve query performance
CREATE INDEX IF NOT EXISTS idx_user_feed_changes_user_timestamp 
ON public.user_feed_changes(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_user_feed_changes_item_id
ON public.user_feed_changes(item_id);

-- Log the final state
DO $$
DECLARE
    total_count INTEGER;
    per_user_stats TEXT;
BEGIN
    -- Count total records
    SELECT COUNT(*) INTO total_count FROM public.user_feed_changes;
    
    -- Get stats per user (top 5 users)
    WITH user_counts AS (
        SELECT 
            user_id, 
            COUNT(*) as record_count,
            MIN(timestamp) as oldest_timestamp,
            MAX(timestamp) as newest_timestamp
        FROM public.user_feed_changes
        GROUP BY user_id
        ORDER BY COUNT(*) DESC
        LIMIT 5
    )
    SELECT string_agg(
        'User: ' || user_id || 
        ', Records: ' || record_count || 
        ', Date range: ' || TO_CHAR(TO_TIMESTAMP(oldest_timestamp/1000), 'YYYY-MM-DD') || 
        ' to ' || TO_CHAR(TO_TIMESTAMP(newest_timestamp/1000), 'YYYY-MM-DD'),
        E'\n'
    ) INTO per_user_stats
    FROM user_counts;
    
    -- Log the results
    RAISE NOTICE 'After optimization: Total records: %', total_count;
    RAISE NOTICE 'Top 5 users by record count: %', per_user_stats;
END $$;

-- Commit the transaction
COMMIT; 