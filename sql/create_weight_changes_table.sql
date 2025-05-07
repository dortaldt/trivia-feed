-- Create table for tracking user weight changes
CREATE TABLE IF NOT EXISTS public.user_weight_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_weight_changes_user_id ON public.user_weight_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_weight_changes_timestamp ON public.user_weight_changes(timestamp);

-- Set up Row Level Security (RLS)
ALTER TABLE public.user_weight_changes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_weight_changes
CREATE POLICY "Users can view their own weight changes" ON public.user_weight_changes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight changes" ON public.user_weight_changes
  FOR INSERT WITH CHECK (auth.uid() = user_id); 