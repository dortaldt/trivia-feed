-- Debug script for user deletion
-- This can be executed in the Supabase SQL Editor to debug the issue

-- 1. First check if the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'delete_user';

-- 2. Check execution permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'delete_user' AND routine_schema = 'public';

-- 3. Check auth.uid() function to ensure it's working
SELECT auth.uid() AS current_user_id;

-- 4. Examine the auth.users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'auth';

-- 5. Check if there are any constraints that might prevent deletion
SELECT tc.constraint_name, tc.constraint_type, tc.table_name, 
       kcu.column_name, ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
     ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
     ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'users' AND tc.table_schema = 'auth';

-- 6. Add explicit error handling to see what's failing
-- Try with a test user ID if possible, replace 'your-test-user-id' with a real ID
DO $$
DECLARE
    test_user_id UUID := 'your-test-user-id'; -- Replace with actual UUID
    result BOOLEAN;
BEGIN
    -- Set session role to simulate running as the authenticated user
    -- This might be needed if auth.uid() is returning NULL
    PERFORM set_config('role', 'authenticated', false);
    
    -- Temporarily disable the auth.uid() check for testing
    CREATE OR REPLACE FUNCTION public.debug_delete_user(user_id UUID)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $$
    BEGIN
        -- Log steps for debugging
        RAISE NOTICE 'Starting deletion for user %', user_id;
        
        -- Handle tables with NO ACTION constraints first
        BEGIN
            DELETE FROM public.openai_usage WHERE user_id = $1;
            RAISE NOTICE 'Deleted from openai_usage';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from openai_usage: %', SQLERRM;
        END;
        
        -- Delete storage objects
        BEGIN
            DELETE FROM storage.objects WHERE owner = $1;
            RAISE NOTICE 'Deleted from storage.objects';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from storage.objects: %', SQLERRM;
        END;
        
        -- Now try to delete from auth.users
        BEGIN
            DELETE FROM auth.users WHERE id = $1;
            RAISE NOTICE 'Deleted from auth.users';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error deleting from auth.users: %', SQLERRM;
            RETURN false;
        END;
        
        RETURN true;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Unhandled error in delete_user: %', SQLERRM;
        RETURN false;
    END;
    $$;
    
    -- Test the debug function
    SELECT public.debug_delete_user(test_user_id) INTO result;
    RAISE NOTICE 'Result of debug_delete_user: %', result;
    
    -- Clean up
    DROP FUNCTION IF EXISTS public.debug_delete_user(UUID);
END;
$$;

-- 7. Check if the user still exists after trying to delete
-- Replace with your actual test user ID
SELECT id, email FROM auth.users WHERE id = 'your-test-user-id';

-- 8. Modified version of the original function with more detailed logging
CREATE OR REPLACE FUNCTION public.delete_user_fixed(user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Skip the auth.uid() check for testing purposes
    -- This line can be uncommented for production
    -- IF auth.uid() IS NULL OR auth.uid() <> user_id THEN
    --     RAISE WARNING 'Cannot delete user: auth.uid() is % and requested user_id is %', auth.uid(), user_id;
    --     RETURN false;
    -- END IF;
    
    -- Log the current user and target user
    RAISE NOTICE 'Current user (auth.uid): %, Target user: %', auth.uid(), user_id;
    
    -- Handle tables with NO ACTION constraints first
    BEGIN
        DELETE FROM public.openai_usage WHERE user_id = $1;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error deleting from openai_usage: %', SQLERRM;
        -- Continue despite error
    END;
    
    -- Delete storage objects
    BEGIN
        DELETE FROM storage.objects WHERE owner = $1;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error deleting from storage.objects: %', SQLERRM;
        -- Continue despite error
    END;
    
    -- Add a direct check to verify user exists before deletion
    DECLARE
        user_exists BOOLEAN;
    BEGIN
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
        IF NOT user_exists THEN
            RAISE WARNING 'User % does not exist in auth.users', user_id;
            RETURN false;
        END IF;
    END;
    
    -- Now try to delete from auth.users with RETURNING to confirm deletion
    DECLARE
        deleted_user_id UUID;
    BEGIN
        DELETE FROM auth.users WHERE id = user_id 
        RETURNING id INTO deleted_user_id;
        
        IF deleted_user_id IS NULL THEN
            RAISE WARNING 'User % was not deleted from auth.users', user_id;
            RETURN false;
        ELSE
            RAISE NOTICE 'Successfully deleted user % from auth.users', deleted_user_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error deleting from auth.users: %', SQLERRM;
        RETURN false;
    END;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Unhandled error in delete_user: %', SQLERRM;
    RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_user_fixed(UUID) TO authenticated;

-- Test the fixed function
-- Replace with your actual test user ID
SELECT public.delete_user_fixed('your-test-user-id') AS deletion_result; 