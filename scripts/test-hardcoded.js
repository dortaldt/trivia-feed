// A simplified test script with hardcoded values
// This is ONLY for testing connection and won't be used in production
// Run with: node scripts/test-hardcoded.js

const axios = require('axios');
require('dotenv').config();

// IMPORTANT: This is just to diagnose connection issues
console.log('Starting basic test script...');

// Use the same values as in your app.config.js
const SUPABASE_URL = "https://vdrmtsifivvpioonpqqc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcm10c2lmaXZ2cGlvb25wcXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNDQyMzIsImV4cCI6MjA2MTkyMDIzMn0.OtAUoIz1ZCCE5IncVvpHnDGrTXEQy_JoyvNE0QQf6wA";

// First, test network connectivity to Supabase
async function testSupabaseConnection() {
  try {
    console.log('Testing basic HTTP connection to Supabase...');
    console.log(`URL: ${SUPABASE_URL}`);
    
    const response = await axios.get(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log('Supabase connection successful! Status:', response.status);
    return true;
  } catch (error) {
    console.error('Error connecting to Supabase:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('This looks like a DNS resolution issue. Check your internet connection.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Connection refused. Check your firewall settings or VPN configuration.');
    }
    return false;
  }
}

// Test OpenAI connection if we have an API key
async function testOpenAIConnection() {
  // Get OpenAI key if available
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    console.log('No OpenAI API key found in environment variables. Skipping OpenAI test.');
    return false;
  }
  
  try {
    console.log('Testing connection to OpenAI API...');
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`
      }
    });
    console.log('OpenAI connection successful! Status:', response.status);
    return true;
  } catch (error) {
    console.error('Error connecting to OpenAI:', error.message);
    return false;
  }
}

// Run tests
async function runTest() {
  try {
    console.log('Running network connectivity tests...');
    
    // Test internet connectivity by pinging a reliable service
    try {
      console.log('Testing general internet connectivity...');
      const googleResponse = await axios.get('https://www.google.com');
      console.log('Internet connectivity test passed. Status:', googleResponse.status);
    } catch (error) {
      console.error('Internet connectivity test failed:', error.message);
      console.log('You may have network connectivity issues. Check your internet connection.');
      return;
    }
    
    // Test Supabase connection
    const supabaseConnected = await testSupabaseConnection();
    
    // Test OpenAI if Supabase was successful
    if (supabaseConnected) {
      await testOpenAIConnection();
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure your .env file contains all required variables');
    console.log('2. Check your internet connection and firewall settings');
    console.log('3. If you\'re using a VPN, try disconnecting it');
    console.log('4. Check that your database schema is properly set up');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
runTest(); 