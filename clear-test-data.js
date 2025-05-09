// Script to clear OpenAI test data using direct database access
// This script requires the SERVICE_ROLE key, not the anon key

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Initialize Supabase client 
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vdrmtsifivvpioonpqqc.supabase.co';
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptForKey() {
  return new Promise((resolve) => {
    if (SUPABASE_SERVICE_KEY) {
      console.log('Using Supabase service key from environment variable');
      resolve(SUPABASE_SERVICE_KEY);
      return;
    }
    
    rl.question('Enter your Supabase SERVICE ROLE key (not anon key): ', (key) => {
      resolve(key);
    });
  });
}

async function clearTestData() {
  try {
    // Get the service key if not available in environment
    SUPABASE_SERVICE_KEY = await promptForKey();
    
    // Initialize client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    console.log('Deleting test data from openai_usage table...');
    
    // Directly delete the records using service role permissions
    const { data, error } = await supabase
      .from('openai_usage')
      .delete()
      .eq('request_type', 'generateQuestions')
      .select();
    
    if (error) {
      console.error('Error clearing test data:', error);
      rl.close();
      return;
    }
    
    // Fall back method if the above fails
    if (!data || error) {
      console.log('Attempting to call the Edge Function instead...');
      const { data: funcData, error: funcError } = await supabase.functions.invoke('openai-proxy', {
        body: {
          action: 'clearTestData',
          params: {}
        }
      });
      
      if (funcError) {
        console.error('Edge function error:', funcError);
        rl.close();
        return;
      }
      
      console.log('Test data cleared via function:', funcData);
      rl.close();
      return;
    }
    
    console.log(`Test data cleared successfully. Deleted ${data.length} records.`);
    rl.close();
  } catch (err) {
    console.error('Unexpected error:', err);
    rl.close();
  }
}

clearTestData(); 