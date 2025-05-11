-- Migration to add skip compensation columns to user_weight_changes table
ALTER TABLE public.user_weight_changes 
ADD COLUMN IF NOT EXISTS skip_compensation_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS skip_compensation_topic float DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_compensation_subtopic float DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_compensation_branch float DEFAULT 0; 