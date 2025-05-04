/**
 * Script to manually add the country column to the user_profiles table
 * 
 * Instructions:
 * 1. Make sure you have the Supabase CLI installed
 * 2. Run this script with Node.js: node scripts/run_user_profile_migration.js
 * 
 * Or if you prefer, you can run the SQL directly in the Supabase dashboard SQL editor:
 * 
 * ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;
 */

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env file if available
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not found, using environment variables directly');
}

// Check for environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables or .env file');
  process.exit(1);
}

async function main() {
  try {
    console.log('Creating Supabase client...');
    
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Running SQL migration to add country column...');
    
    // Run the SQL query directly
    const { error } = await supabase.rpc('pgcrypto.pg_execute', {
      query: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;'
    });
    
    if (error) {
      console.error('Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('Migration successful! The country column has been added to user_profiles table.');
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main(); 