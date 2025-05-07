-- Create tables for user tracking data synchronization

-- 1. User Profile Data - Stores serialized user profile JSON
CREATE TABLE IF NOT EXISTS public.user_profile_data (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  topics JSONB NOT NULL DEFAULT '{}'::jsonb,
  cold_start_complete BOOLEAN DEFAULT FALSE,
  total_questions_answered INTEGER DEFAULT 0,
  last_refreshed BIGINT NOT NULL, -- timestamp in milliseconds
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
  version INTEGER DEFAULT 1,  -- For optimistic concurrency control
  CONSTRAINT user_profile_data_id_key UNIQUE (id)
);

-- 2. User Interactions - Stores individual question interactions
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL, -- timestamp in milliseconds  
  time_spent INTEGER NOT NULL, -- in milliseconds
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('correct', 'incorrect', 'skipped')),
  question_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_from_device TEXT,
  CONSTRAINT user_interactions_user_question_unique UNIQUE (user_id, question_id, timestamp)
);

-- 3. User Feed Changes - Stores feed personalization data
CREATE TABLE IF NOT EXISTS public.user_feed_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL, -- timestamp in milliseconds
  change_type TEXT NOT NULL CHECK (change_type IN ('added', 'removed')),
  item_id TEXT NOT NULL,
  question_text TEXT,
  explanations JSONB,
  weight_factors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_from_device TEXT
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON public.user_interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_feed_changes_user_id ON public.user_feed_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feed_changes_timestamp ON public.user_feed_changes(timestamp);

-- Set up Row Level Security (RLS)
ALTER TABLE public.user_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feed_changes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profile_data
CREATE POLICY "Users can view their own profile data" ON public.user_profile_data
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile data" ON public.user_profile_data
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile data" ON public.user_profile_data
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for user_interactions
CREATE POLICY "Users can view their own interactions" ON public.user_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions" ON public.user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for user_feed_changes
CREATE POLICY "Users can view their own feed changes" ON public.user_feed_changes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feed changes" ON public.user_feed_changes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update last_synced timestamp
CREATE OR REPLACE FUNCTION update_last_synced()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_synced = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profile_data
CREATE TRIGGER update_user_profile_data_last_synced
BEFORE UPDATE ON public.user_profile_data
FOR EACH ROW
EXECUTE FUNCTION update_last_synced(); 