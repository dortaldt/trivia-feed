-- Add country column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- The rest of the permissions should already be set up
-- This just ensures the country field is included in existing policies 