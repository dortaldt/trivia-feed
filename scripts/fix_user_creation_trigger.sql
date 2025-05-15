-- Fix the user profile creation system with a simple, direct approach

-- Step 1: Recreate the function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user profile with random username and metadata
  INSERT INTO public.user_profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    -- Generate a simple random username if not provided
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'User_' || substring(md5(random()::text) from 1 for 8)
    ),
    -- Use full_name from metadata or derive from email
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    ),
    -- Use avatar_url from metadata or null
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Recreate the trigger (this is the critical fix)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Fix existing users without profiles
INSERT INTO public.user_profiles (id, username, full_name, avatar_url)
SELECT 
  au.id,
  'User_' || substring(md5(random()::text) from 1 for 8),
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL; 