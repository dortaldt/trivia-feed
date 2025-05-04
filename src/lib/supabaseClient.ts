import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

console.log('DEBUG: Initializing Supabase client');

// First check if values are in app.config.js
const extraFromConfig = Constants.expoConfig?.extra;
let supabaseUrl = '';
let supabaseAnonKey = '';

if (extraFromConfig) {
  console.log('DEBUG: Checking app.config.js for Supabase credentials');
  if (extraFromConfig.supabaseUrl) {
    console.log('DEBUG: Found Supabase URL in app.config.js');
    supabaseUrl = extraFromConfig.supabaseUrl;
  }
  
  if (extraFromConfig.supabaseAnonKey) {
    console.log('DEBUG: Found Supabase key in app.config.js');
    supabaseAnonKey = extraFromConfig.supabaseAnonKey;
  }
}

// If not found in app.config.js, try environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.log('DEBUG: Checking environment variables for Supabase credentials');
  
  if (!supabaseUrl && process.env.EXPO_PUBLIC_SUPABASE_URL) {
    console.log('DEBUG: Found Supabase URL in environment');
    supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  }
  
  if (!supabaseAnonKey && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('DEBUG: Found Supabase key in environment');
    supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  }
}

// Log final status
console.log(`DEBUG: Final status - URL: ${supabaseUrl ? 'Set' : 'Not set'}, Key: ${supabaseAnonKey ? 'Set' : 'Not set'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Make sure to set credentials in app.config.js or as environment variables.'
  );
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 