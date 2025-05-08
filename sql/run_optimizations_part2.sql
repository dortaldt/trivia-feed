-- EXECUTE OPTIMIZATIONS (PART 2)
-- Run this script AFTER running run_optimizations_part1.sql
-- These operations cannot run inside a transaction block

-- First, make sure there's no active transaction
-- If you're using the Supabase SQL Editor, it might start transactions automatically
COMMIT;

-- Now run commands that must be outside transactions
-- Note: These commands will be run directly by the server, not in a transaction
\set ON_ERROR_STOP on

-- Optimize storage and reclaim space (one table at a time)
VACUUM FULL VERBOSE public.user_feed_changes;
ANALYZE VERBOSE public.user_feed_changes;

-- Note: 
-- If this still fails, you can run these commands directly in a psql terminal:
--   \c your_database_name
--   VACUUM FULL public.user_feed_changes;
--   ANALYZE public.user_feed_changes;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'VACUUM and ANALYZE completed successfully';
END $$; 