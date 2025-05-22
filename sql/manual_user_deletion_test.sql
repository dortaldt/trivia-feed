-- Manual User Deletion Test Script
-- This script should be run in the Supabase SQL Editor to test the delete_user function
-- IMPORTANT: This is for debugging purposes only and requires manual setup steps

-- Step 1: Set up admin key if not already set
-- This is needed for the debug function to work without auth.uid() checks
DO $$
BEGIN
  -- Only set if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.settings.admin_key') THEN
    -- Use a secure random string in a real environment
    PERFORM set_config('app.settings.admin_key', 'debug_admin_key_for_testing', false);
  END IF;
END
$$;

-- Step 2: Get a list of users to check IDs
-- You should use this to identify a test user to delete
SELECT id, email, last_sign_in_at, created_at 
FROM auth.users 
LIMIT 10;

-- Step 3: Set the test user ID
-- ⚠️ REPLACE THIS WITH AN ACTUAL USER ID ⚠️
-- Make sure this is a test account you're willing to delete
\set test_user_id '00000000-0000-0000-0000-000000000000'

-- Step 4: Check if the user exists and their associated data
SELECT 'User exists in auth.users' as check, 
       EXISTS(SELECT 1 FROM auth.users WHERE id = :'test_user_id') as result;

SELECT 'User has profile' as check,
       EXISTS(SELECT 1 FROM public.user_profiles WHERE id = :'test_user_id') as result;

SELECT 'User has profile data' as check,
       EXISTS(SELECT 1 FROM public.user_profile_data WHERE id = :'test_user_id') as result;

SELECT 'User has answers' as check,
       EXISTS(SELECT 1 FROM public.user_answers WHERE user_id = :'test_user_id') as result;

-- Step 5: Test the regular delete_user function
-- This is what normally gets called from the client
DO $$
DECLARE
    result BOOLEAN;
BEGIN
    -- Force the auth.uid() function to return our test user's ID
    -- IMPORTANT: This is only for testing - in a real environment, auth.uid() is controlled by Supabase Auth
    -- This will not work if you don't have proper permissions or if the function has been modified by Supabase
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
    BEGIN
        RETURN '00000000-0000-0000-0000-000000000000'::uuid; -- Replace with your test user ID
    END;
    $$ LANGUAGE plpgsql;
    
    -- Now test the delete_user function
    SELECT public.delete_user('00000000-0000-0000-0000-000000000000'::uuid) INTO result; -- Replace with your test user ID
    
    RAISE NOTICE 'Result of delete_user function: %', result;
    
    -- Reset the auth.uid() function (this might not work depending on your permissions)
    -- In a real environment, you'd need to restart your SQL session
    DROP FUNCTION IF EXISTS auth.uid();
END;
$$;

-- Step 6: Test the debug version of the delete_user function
-- This bypasses the auth.uid() check and is useful for debugging
SELECT public.delete_user_debug('debug_admin_key_for_testing', '00000000-0000-0000-0000-000000000000'::uuid) AS deletion_result; -- Replace with your test user ID

-- Step 7: Verify deletion (check if the user still exists)
SELECT 'User deleted from auth.users' as check, 
       NOT EXISTS(SELECT 1 FROM auth.users WHERE id = :'test_user_id') as result;

SELECT 'User profile deleted' as check,
       NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = :'test_user_id') as result;

-- Step 8: Check for rows that weren't deleted but should have been
SELECT 'Remaining profile data' as check,
       EXISTS(SELECT 1 FROM public.user_profile_data WHERE id = :'test_user_id') as result;

SELECT 'Remaining answers' as check,
       EXISTS(SELECT 1 FROM public.user_answers WHERE user_id = :'test_user_id') as result;

-- Additional: List any tables that still contain the user's data
-- This helps identify if we missed any tables in our delete function
SELECT table_schema, table_name
FROM information_schema.tables 
WHERE table_schema IN ('public', 'auth')
  AND table_type = 'BASE TABLE'
  AND EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE columns.table_schema = tables.table_schema 
      AND columns.table_name = tables.table_name
      AND (column_name = 'user_id' OR column_name = 'id')
  )
ORDER BY table_schema, table_name;

-- Instructions for reviewing the results:
/*
1. First check if auth.uid() is working correctly (Step 5)
2. If that doesn't work, use the debug function (Step 6)
3. Verify deletion by checking if the user no longer exists (Step 7)
4. If any tables still have the user's data, add them to the delete_user function (Step 8)
*/ 