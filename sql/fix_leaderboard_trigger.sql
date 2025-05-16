-- Fix for leaderboard trigger to update user stats correctly
-- This adds SECURITY DEFINER to properly update user_profiles 
-- when a user answers a trivia question correctly

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_correct_answer ON public.user_answers;
DROP FUNCTION IF EXISTS update_user_correct_answer_stats();

-- Recreate the function with security definer
CREATE OR REPLACE FUNCTION update_user_correct_answer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Recreate the trigger
CREATE TRIGGER on_correct_answer
AFTER INSERT ON public.user_answers
FOR EACH ROW
WHEN (NEW.is_correct = TRUE)
EXECUTE FUNCTION update_user_correct_answer_stats(); 