-- Add country column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- Update RLS policies to include country
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Update or recreate the policy for selecting profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);
  
-- Update or recreate the policy for updating profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id); 