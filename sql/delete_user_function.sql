-- Function to completely delete a user's account and all related data
-- This should be executed in Supabase SQL Editor to add the function to your database
-- IMPORTANT: This requires appropriate security policies and uses CASCADE delete rules

-- Create an RPC function that can be called from client-side to delete a user
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Using security definer to allow function to delete from auth schema
SET search_path = public, auth
AS $$
DECLARE
    deleted_id UUID;
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid();
    
    -- Log for debugging purposes
    RAISE NOTICE 'delete_user: Current user (auth.uid): %, Target user: %', current_user_id, user_id;
    
    -- Make sure we have a valid authenticated user
    IF current_user_id IS NULL THEN
        RAISE WARNING 'delete_user: No authenticated user detected';
        RETURN false;
    END IF;
    
    -- Verify that the user is deleting their own account
    -- This prevents users from deleting other users' accounts
    IF current_user_id <> user_id THEN
        RAISE WARNING 'delete_user: Users can only delete their own accounts (current: %, requested: %)', 
                     current_user_id, user_id;
        RETURN false;
    END IF;
    
    -- Verify the user exists before attempting deletion
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        RAISE WARNING 'delete_user: User % does not exist', user_id;
        RETURN false;
    END IF;

    -- Handle tables with NO ACTION constraints first
    -- Use individual try/catch blocks to continue even if one fails
    BEGIN
        DELETE FROM public.openai_usage WHERE user_id = user_id;
    EXCEPTION WHEN OTHERS THEN
        -- Log but continue
        RAISE WARNING 'delete_user: Error deleting from openai_usage: %', SQLERRM;
    END;
    
    -- Handle storage objects
    BEGIN
        DELETE FROM storage.objects WHERE owner = user_id;
    EXCEPTION WHEN OTHERS THEN
        -- Log but continue
        RAISE WARNING 'delete_user: Error deleting from storage.objects: %', SQLERRM;
    END;
    
    -- Explicitly delete from key tables in case CASCADE isn't working properly
    BEGIN
        -- Delete from public schema tables first
        DELETE FROM public.user_profiles WHERE id = user_id;
        DELETE FROM public.user_profile_data WHERE id = user_id;
        DELETE FROM public.user_answers WHERE user_id = user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'delete_user: Error deleting from public tables: %', SQLERRM;
    END;
    
    -- Now delete the user from auth.users and verify deletion worked
    DELETE FROM auth.users 
    WHERE id = user_id
    RETURNING id INTO deleted_id;
    
    -- Check if deletion was successful
    IF deleted_id IS NULL THEN
        RAISE WARNING 'delete_user: Failed to delete user % from auth.users', user_id;
        RETURN false;
    END IF;
    
    RAISE NOTICE 'delete_user: Successfully deleted user %', user_id;
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Catch any unhandled exceptions
    RAISE WARNING 'delete_user: Unhandled exception: %', SQLERRM;
    RETURN false;
END;
$$;

-- Drop any existing grants to ensure we're starting fresh
DROP FUNCTION IF EXISTS public.delete_user_debug(UUID);

-- Ensure the function can only be executed by authenticated users
REVOKE ALL ON FUNCTION public.delete_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.delete_user(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

-- Create a comment for documentation
COMMENT ON FUNCTION public.delete_user(UUID) IS 'Permanently deletes a user and all their data from the database using CASCADE delete rules';

-- Create a debug version of the function that can be used for testing
-- This version doesn't check the auth.uid() match requirement
CREATE OR REPLACE FUNCTION public.delete_user_debug(admin_key TEXT, user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    deleted_id UUID;
    valid_key BOOLEAN;
BEGIN
    -- This is a very basic check - in production you would use a proper secure mechanism
    -- This is ONLY for debugging purposes
    valid_key := admin_key = current_setting('app.settings.admin_key', true);
    
    IF NOT valid_key THEN
        RAISE WARNING 'delete_user_debug: Invalid admin key';
        RETURN false;
    END IF;
    
    RAISE NOTICE 'delete_user_debug: Starting deletion for user %', user_id;
    
    -- Verify the user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        RAISE WARNING 'delete_user_debug: User % does not exist', user_id;
        RETURN false;
    END IF;

    -- Handle tables with NO ACTION constraints first
    BEGIN
        DELETE FROM public.openai_usage WHERE user_id = user_id;
        RAISE NOTICE 'delete_user_debug: Deleted from openai_usage';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'delete_user_debug: Error deleting from openai_usage: %', SQLERRM;
    END;
    
    -- Handle storage objects
    BEGIN
        DELETE FROM storage.objects WHERE owner = user_id;
        RAISE NOTICE 'delete_user_debug: Deleted from storage.objects';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'delete_user_debug: Error deleting from storage.objects: %', SQLERRM;
    END;
    
    -- Explicitly delete from key tables
    BEGIN
        DELETE FROM public.user_profiles WHERE id = user_id;
        DELETE FROM public.user_profile_data WHERE id = user_id;
        DELETE FROM public.user_answers WHERE user_id = user_id;
        RAISE NOTICE 'delete_user_debug: Deleted from public schema tables';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'delete_user_debug: Error deleting from public tables: %', SQLERRM;
    END;
    
    -- Delete from auth.users
    DELETE FROM auth.users 
    WHERE id = user_id
    RETURNING id INTO deleted_id;
    
    IF deleted_id IS NULL THEN
        RAISE WARNING 'delete_user_debug: Failed to delete user from auth.users';
        RETURN false;
    END IF;
    
    RAISE NOTICE 'delete_user_debug: Successfully deleted user %', user_id;
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'delete_user_debug: Unhandled exception: %', SQLERRM;
    RETURN false;
END;
$$;

-- Set a comment on the debug function
COMMENT ON FUNCTION public.delete_user_debug(TEXT, UUID) IS 'DEBUG ONLY: Permanently deletes a user without checking auth.uid() match'; 