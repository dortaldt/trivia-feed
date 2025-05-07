#!/bin/bash

# Fix Database Script
# This script fixes issues with database tables and permissions

# Set your Supabase URL and Key - replace these with your actual values
# SUPABASE_URL="https://your-project-id.supabase.co"
# SUPABASE_KEY="your-service-role-key"

# Prompt for credentials if not set
if [ -z "$SUPABASE_URL" ]; then
  echo "Please enter your Supabase URL (e.g., https://yourproject.supabase.co):"
  read SUPABASE_URL
fi

if [ -z "$SUPABASE_KEY" ]; then
  echo "Please enter your Supabase service_role key:"
  read SUPABASE_KEY
fi

echo "Using Supabase URL: $SUPABASE_URL"
echo "Using Supabase API Key: ${SUPABASE_KEY:0:5}... (hidden for security)"

# Fix database - part 1: Create or replace the check_table_exists function
echo "Step 1: Creating check_table_exists function..."
curl -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "query": "DROP FUNCTION IF EXISTS public.check_table_exists(text); CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE exists boolean; BEGIN SELECT EXISTS ( SELECT FROM information_schema.tables WHERE table_schema = '"'"'public'"'"' AND table_name = $1 ) INTO exists; RETURN exists; END; $$; ALTER FUNCTION public.check_table_exists(text) OWNER TO postgres; GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO authenticated; GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO anon; GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO service_role;" }' \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql"
echo ""

# Fix database - part 2: Fix permissions on tables
echo "Step 2: Ensuring RLS policies..."
curl -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "query": "ALTER TABLE public.user_profile_data ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS \"Service role can do anything\" ON public.user_profile_data; CREATE POLICY \"Service role can do anything\" ON public.user_profile_data USING (true) WITH CHECK (true); GRANT ALL ON public.user_profile_data TO service_role;" }' \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql"
echo ""

# Fix database - part 3: Create exec_sql function if it doesn't exist
echo "Step 3: Creating exec_sql function if needed..."
curl -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "query": "CREATE OR REPLACE FUNCTION exec_sql(sql_string text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql_string; END; $$; GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;" }' \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql"
echo ""

# Check if tables exist by directly querying information_schema
echo "Step 4: Verifying tables exist..."
curl -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "query": "SELECT table_name FROM information_schema.tables WHERE table_schema = '"'"'public'"'"' AND table_name IN ('"'"'user_profile_data'"'"', '"'"'user_weight_changes'"'"', '"'"'user_interactions'"'"', '"'"'user_feed_changes'"'"');" }' \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql"
echo ""

# Fix database - part 5: Update sample topics data
echo "Step 5: Adding sample topics data to a profile..."
# Using example UUID - you'll need to replace with actual UUID
curl -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "query": "UPDATE public.user_profile_data SET topics = '"'"'{\"Technology\": {\"weight\": 0.5, \"subtopics\": {\"General\": {\"weight\": 0.5, \"branches\": {\"General\": {\"weight\": 0.5}}}}}, \"Science\": {\"weight\": 0.6, \"subtopics\": {\"Physics\": {\"weight\": 0.7, \"branches\": {\"Quantum\": {\"weight\": 0.8}}}}}}'"'"'::jsonb WHERE id = (SELECT id FROM public.user_profile_data LIMIT 1);" }' \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql"
echo ""

echo "Database fix completed! Please try the Debug DB button again in the app." 