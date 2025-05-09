/**
 * Supabase Client Configuration
 * 
 * This file exports a configured Supabase client instance for use throughout the application.
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

// Get environment variables
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY;

// Ensure we have the required configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment or app.config.js.'
  );
}

// Create and export the Supabase client
export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || ''); 