const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Check if env variables are defined
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be defined');
  console.error('You can either:');
  console.error('1. Create a .env file with SUPABASE_URL and SUPABASE_KEY');
  console.error('2. Set them as environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple function to verify connection
async function verifyConnection() {
  try {
    console.log('Attempting to connect to Supabase...');
    
    // Try to get a count of rows from the trivia_questions table
    const { count, error } = await supabase
      .from('trivia_questions')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      process.exit(1);
    }
    
    console.log('Successfully connected to Supabase!');
    console.log(`Current number of questions in the database: ${count || 0}`);
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Run the verification
verifyConnection(); 