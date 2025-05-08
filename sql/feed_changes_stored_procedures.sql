-- Additional stored procedures for advanced feed changes optimization

-- 1. Fix future timestamps
-- This function corrects any timestamps that are in the future
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

-- 2. Limit records per user
-- This function ensures no user has more than max_records entries
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

-- 3. Optimize the cleanup trigger to run every day
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

-- Run the setup function to establish the scheduled jobs
SELECT public.setup_feed_changes_daily_cleanup(); 