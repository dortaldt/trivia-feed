-- AGGRESSIVE CLEANUP for user_feed_changes table
-- This script will dramatically reduce table size through multiple optimizations

-- Create a backup of the current table
CREATE TABLE IF NOT EXISTS public.user_feed_changes_backup AS 
SELECT * FROM public.user_feed_changes;

-- Log count before cleanup
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.user_feed_changes;
    RAISE NOTICE 'Before cleanup: Total records: %', total_count;
END $$;

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

-- STEP 4: Truncate oversized text fields
UPDATE public.user_feed_changes
SET explanations = (SELECT array_agg(SUBSTRING(x FROM 1 FOR 100)) FROM unnest(explanations) AS x)
WHERE EXISTS (SELECT 1 FROM unnest(explanations) AS x WHERE LENGTH(x) > 100);

-- STEP 5: Remove old records (aggressive 3-day retention)
DELETE FROM public.user_feed_changes
WHERE timestamp < (EXTRACT(EPOCH FROM NOW() - INTERVAL '3 days') * 1000);

-- STEP 6: Optimize storage
VACUUM FULL public.user_feed_changes;
ANALYZE public.user_feed_changes;

-- Log final results
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.user_feed_changes;
    RAISE NOTICE 'After cleanup: Total records: %', total_count;
END $$;

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

-- Trigger the cleanup now
SELECT public.trigger_feed_changes_cleanup();

-- Instructions:
-- 1. Run this script on your Supabase database using the SQL editor
-- 2. If there are any issues, you can restore from the backup table:
--    INSERT INTO public.user_feed_changes SELECT * FROM public.user_feed_changes_backup; 