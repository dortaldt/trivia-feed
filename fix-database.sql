-- Fix database script for Supabase SQL Editor

-- Step 1: Drop and recreate the check_table_exists function with proper permissions
DROP FUNCTION IF EXISTS public.check_table_exists(text);

CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
  exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = $1
  ) INTO exists;
  
  RETURN exists;
END;
$$;

-- Grant proper permissions to this function
ALTER FUNCTION public.check_table_exists(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO service_role;

-- Step 2: Execute a SELECT to test the function works
SELECT public.check_table_exists('user_profile_data') as user_profile_data_exists,
       public.check_table_exists('user_weight_changes') as user_weight_changes_exists,
       public.check_table_exists('user_interactions') as user_interactions_exists,
       public.check_table_exists('user_feed_changes') as user_feed_changes_exists;

-- Step 3: Create user_weight_changes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_weight_changes (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL, -- timestamp in milliseconds
  question_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('correct', 'incorrect', 'skipped')),
  question_text TEXT,
  category TEXT NOT NULL,
  subtopic TEXT,
  branch TEXT,
  old_topic_weight FLOAT,
  old_subtopic_weight FLOAT,
  old_branch_weight FLOAT,
  new_topic_weight FLOAT,
  new_subtopic_weight FLOAT,
  new_branch_weight FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_from_device TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_weight_changes_user_id ON public.user_weight_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_weight_changes_timestamp ON public.user_weight_changes(timestamp);

-- Enable RLS on tables
ALTER TABLE public.user_weight_changes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_weight_changes
DROP POLICY IF EXISTS "Users can view their own weight changes" ON public.user_weight_changes;
CREATE POLICY "Users can view their own weight changes" ON public.user_weight_changes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own weight changes" ON public.user_weight_changes;
CREATE POLICY "Users can insert their own weight changes" ON public.user_weight_changes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can do anything weight" ON public.user_weight_changes;
CREATE POLICY "Service role can do anything weight" ON public.user_weight_changes
  FOR ALL USING (true);

-- Step 4: Make sure RPC calls function properly by creating exec_sql function
CREATE OR REPLACE FUNCTION public.exec_sql(sql_string text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_string;
END;
$$;

-- Grant permissions to exec_sql
ALTER FUNCTION public.exec_sql(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Step 5: Set up sample topics data in the user_profile_data table
-- Find user IDs
SELECT id FROM auth.users LIMIT 5;

-- Update with sample data (you'll need to replace YOUR_USER_ID with a real user ID)
UPDATE public.user_profile_data
SET topics = '{
  "Technology": {
    "weight": 0.5,
    "subtopics": {
      "General": {
        "weight": 0.5,
        "branches": {
          "General": {
            "weight": 0.5
          }
        }
      }
    }
  },
  "Science": {
    "weight": 0.6,
    "subtopics": {
      "Physics": {
        "weight": 0.7,
        "branches": {
          "Quantum": {
            "weight": 0.8
          }
        }
      }
    }
  }
}'::jsonb
WHERE id IN (SELECT id FROM public.user_profile_data LIMIT 1);

-- Step 6: Verify permissions
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('user_profile_data', 'user_weight_changes', 'user_interactions', 'user_feed_changes');

-- Step 7: List table and column definitions
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public'
  AND table_name IN ('user_profile_data', 'user_weight_changes', 'user_interactions', 'user_feed_changes');