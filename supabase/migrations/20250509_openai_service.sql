-- OpenAI Service Integration: Database Setup
-- This script creates the necessary tables for the OpenAI service in Supabase

-- Usage tracking table
CREATE TABLE openai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  request_type TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  request_data JSONB,
  response_status INTEGER,
  error_message TEXT
);

-- Configuration table
CREATE TABLE openai_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parameter_name TEXT NOT NULL UNIQUE,
  parameter_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial configuration values
INSERT INTO openai_config (parameter_name, parameter_value, description)
VALUES 
  ('default_model', 'gpt-4-turbo', 'Default OpenAI model to use'),
  ('max_tokens_per_request', '2000', 'Maximum tokens allowed per request'),
  ('default_temperature', '0.7', 'Default temperature setting'),
  ('user_request_limit_daily', '50', 'Maximum requests per user per day');

-- Set up RLS policies for security
-- Policy for openai_usage
ALTER TABLE openai_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view their own usage"
  ON openai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can create usage records (via the function)
CREATE POLICY "Function can insert usage records"
  ON openai_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Config table is admin-only for modifications
ALTER TABLE openai_config ENABLE ROW LEVEL SECURITY;

-- All users can read config
CREATE POLICY "Users can read config"
  ON openai_config
  FOR SELECT
  USING (true);

-- Only admins can modify config (requires admin_users table)
-- Uncomment after creating admin_users table or replace with your own admin logic
-- CREATE POLICY "Only admins can modify config"
--   ON openai_config
--   FOR ALL
--   USING (auth.uid() IN (SELECT user_id FROM admin_users)); 