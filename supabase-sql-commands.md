# Supabase SQL Commands

Use these commands in the Supabase SQL Editor to update your database schema.

## Adding Country to User Profiles

```sql
-- Add country column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- Verify the column was added
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'user_profiles' 
  AND column_name = 'country';
```

## Setting Default Values (Optional)

If you want to set a default country for existing users:

```sql
-- Update existing profiles to have a default country value
UPDATE user_profiles
SET country = 'Not specified'
WHERE country IS NULL;
```

## Adding Leaderboard Statistics

Run the following SQL commands in the Supabase SQL Editor to add leaderboard functionality:

```sql
-- Add leaderboard statistics columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS correct_answers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_correct_answer TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS correct_answers_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_answers_week INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_answers_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- Create user_answers table to track all user answers
CREATE TABLE IF NOT EXISTS public.user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL, 
  is_correct BOOLEAN NOT NULL,
  answer_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answer_index INTEGER
);

-- Set up Row Level Security for the answers table
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
-- Users can only add their own answers
CREATE POLICY "Users can insert their own answers" ON public.user_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only view their own answers
CREATE POLICY "Users can view their own answers" ON public.user_answers
  FOR SELECT USING (auth.uid() = user_id);

-- Create function to update user stats when answering correctly
CREATE OR REPLACE FUNCTION update_user_correct_answer_stats()
RETURNS TRIGGER AS $$
DECLARE
  last_answer_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the last answer time
  SELECT last_correct_answer INTO last_answer_time
  FROM public.user_profiles
  WHERE id = NEW.user_id;
  
  -- Update user stats
  UPDATE public.user_profiles
  SET 
    correct_answers_count = correct_answers_count + 1,
    correct_answers_today = correct_answers_today + 1,
    correct_answers_week = correct_answers_week + 1, 
    correct_answers_month = correct_answers_month + 1,
    last_correct_answer = NOW(),
    streak = CASE
      -- If last answer was yesterday or this is first answer, increment streak
      WHEN last_answer_time IS NULL OR DATE(last_answer_time) = DATE(NOW() - INTERVAL '1 day') THEN streak + 1
      -- If last answer was today, keep streak
      WHEN DATE(last_answer_time) = DATE(NOW()) THEN streak
      -- Otherwise reset streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      longest_streak, 
      CASE
        WHEN last_answer_time IS NULL OR DATE(last_answer_time) = DATE(NOW() - INTERVAL '1 day') THEN streak + 1
        WHEN DATE(last_answer_time) = DATE(NOW()) THEN streak
        ELSE 1
      END
    )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user stats on correct answer
CREATE TRIGGER on_correct_answer
AFTER INSERT ON public.user_answers
FOR EACH ROW
WHEN (NEW.is_correct = TRUE)
EXECUTE FUNCTION update_user_correct_answer_stats();
```

To reset counter periods (optional if you have pg_cron extension):

```sql
-- Create functions to reset counters at specific intervals

-- Daily reset
CREATE OR REPLACE FUNCTION reset_daily_correct_answers()
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles
  SET correct_answers_today = 0
  WHERE DATE(last_correct_answer) < DATE(NOW());
END;
$$ LANGUAGE plpgsql;

-- Weekly reset
CREATE OR REPLACE FUNCTION reset_weekly_correct_answers()
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles
  SET correct_answers_week = 0
  WHERE DATE_TRUNC('week', last_correct_answer) < DATE_TRUNC('week', NOW());
END;
$$ LANGUAGE plpgsql;

-- Monthly reset
CREATE OR REPLACE FUNCTION reset_monthly_correct_answers()
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles
  SET correct_answers_month = 0
  WHERE DATE_TRUNC('month', last_correct_answer) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- If you have pg_cron extension, you can schedule these to run automatically:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 
-- SELECT cron.schedule(
--   'reset_daily_stats',
--   '0 0 * * *',  -- Run at midnight every day
--   $$SELECT reset_daily_correct_answers()$$
-- );
-- 
-- SELECT cron.schedule(
--   'reset_weekly_stats',
--   '0 0 * * 1',  -- Run at midnight on Monday
--   $$SELECT reset_weekly_correct_answers()$$
-- );
-- 
-- SELECT cron.schedule(
--   'reset_monthly_stats',
--   '0 0 1 * *',  -- Run at midnight on the 1st of each month
--   $$SELECT reset_monthly_correct_answers()$$
-- );
``` 