#!/bin/bash

# Setup Database Script
# This script applies all database SQL files in the correct order

# Set your Supabase URL and Key
echo "Please enter your Supabase URL:"
read SUPABASE_URL

echo "Please enter your Supabase service_role key:"
read SUPABASE_KEY

# Apply the SQL files in correct order
echo "Applying database schema..."

echo "1. Creating user tracking tables..."
curl -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d @./sql/create_user_tracking_tables.sql \
  "$SUPABASE_URL/rest/v1/sql"

echo "2. Creating weight changes table..."
curl -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d @./sql/create_weight_changes_table.sql \
  "$SUPABASE_URL/rest/v1/sql"

# Add any additional SQL files as needed

echo "Database setup complete!" 