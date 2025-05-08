-- Retention Policy for user_feed_changes table
-- This file implements SQL functions to regularly clean up old feed changes 

-- Create a function to clean up old feed changes
CREATE OR REPLACE FUNCTION public.clean_old_feed_changes()
RETURNS void AS $$
BEGIN
  -- Keep only 7 days of feed changes
  DELETE FROM public.user_feed_changes 
  WHERE timestamp < (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000);
  
  -- Log the cleanup operation
  RAISE NOTICE 'Cleaned up user_feed_changes older than 7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to this function
ALTER FUNCTION public.clean_old_feed_changes() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.clean_old_feed_changes() TO service_role;

-- Create a schedule for this function using pg_cron if available
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Create a schedule to run the cleanup function daily at 3 AM
    PERFORM cron.schedule(
      'daily-feed-changes-cleanup',
      '0 3 * * *',
      'SELECT public.clean_old_feed_changes()'
    );
    RAISE NOTICE 'Scheduled daily cleanup of user_feed_changes at 3 AM using pg_cron';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. You will need to set up a scheduled task manually.';
  END IF;
END
$$;

-- Create a function that can be called via HTTP to clean up data
-- This can be used if pg_cron is not available
CREATE OR REPLACE FUNCTION public.trigger_feed_changes_cleanup()
RETURNS json AS $$
DECLARE
  deleted_count INTEGER;
  result JSON;
BEGIN
  -- Delete old records and get the count
  WITH deleted AS (
    DELETE FROM public.user_feed_changes 
    WHERE timestamp < (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000)
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Create a result object
  result := json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', 'Successfully cleaned up ' || deleted_count || ' old feed changes records',
    'timestamp', EXTRACT(EPOCH FROM NOW())
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to this function
ALTER FUNCTION public.trigger_feed_changes_cleanup() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_feed_changes_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_feed_changes_cleanup() TO service_role;

-- Instructions for use:
-- 1. If pg_cron extension is available, the cleanup will run automatically at 3 AM daily
-- 2. If pg_cron is not available, you can:
--    a. Call the trigger_feed_changes_cleanup() function via:
--       SELECT public.trigger_feed_changes_cleanup();
--    b. Set up an external cron job to call this function regularly
--    c. Call it from your application code during startup/maintenance 