#!/usr/bin/env node

/**
 * Script to debug answer structure differences between trivia_questions and niche_trivia_questions tables
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://vdrmtsifivvpioonpqqc.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcm10c2lmaXZ2cGlvb25wcXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNDQyMzIsImV4cCI6MjA2MTkyMDIzMn0.OtAUoIz1ZCCE5IncVvpHnDGrTXEQy_JoyvNE0QQf6wA";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function examineAnswerStructures() {
  try {
    console.log('🔍 Examining answer structures in both tables...\n');

    // Get a sample from the standard trivia_questions table
    console.log('📚 STANDARD TABLE (trivia_questions):');
    console.log('=====================================');
    
    const { data: standardData, error: standardError } = await supabase
      .from('trivia_questions')
      .select('*')
      .limit(2);

    if (standardError) {
      console.error('❌ Error querying standard table:', standardError.message);
    } else if (standardData && standardData.length > 0) {
      standardData.forEach((row, index) => {
        console.log(`\n--- Standard Question ${index + 1} ---`);
        console.log('Available columns:', Object.keys(row));
        console.log('Full row data:', JSON.stringify(row, null, 2));
      });
    } else {
      console.log('No data found in standard table');
    }

    // Get a sample from the niche_trivia_questions table
    console.log('\n\n🔬 NICHE TABLE (niche_trivia_questions):');
    console.log('=======================================');
    
    const { data: nicheData, error: nicheError } = await supabase
      .from('niche_trivia_questions')
      .select('*')
      .eq('topic', '90s')
      .limit(2);

    if (nicheError) {
      console.error('❌ Error querying niche table:', nicheError.message);
    } else if (nicheData && nicheData.length > 0) {
      nicheData.forEach((row, index) => {
        console.log(`\n--- Niche Question ${index + 1} ---`);
        console.log('Available columns:', Object.keys(row));
        console.log('Full row data:', JSON.stringify(row, null, 2));
      });
    } else {
      console.log('No 90s data found in niche table');
    }

    // Analyze the differences
    console.log('\n\n📊 ANALYSIS:');
    console.log('=============');
    
    if (standardData && nicheData) {
      console.log('Comparing answer structures...');
      
      // Check if standard table has answers array vs answer_choices
      const standardHasAnswersArray = standardData.some(row => Array.isArray(row.answers));
      const nicheHasAnswersArray = nicheData.some(row => Array.isArray(row.answers));
      
      console.log(`Standard table has 'answers' array: ${standardHasAnswersArray}`);
      console.log(`Niche table has 'answers' array: ${nicheHasAnswersArray}`);
      
      // Check answer_choices format
      const standardAnswerChoicesFormat = standardData[0]?.answer_choices;
      const nicheAnswerChoicesFormat = nicheData[0]?.answer_choices;
      
      console.log(`Standard answer_choices format: ${typeof standardAnswerChoicesFormat} - ${Array.isArray(standardAnswerChoicesFormat) ? 'Array' : 'Other'}`);
      console.log(`Niche answer_choices format: ${typeof nicheAnswerChoicesFormat} - ${Array.isArray(nicheAnswerChoicesFormat) ? 'Array' : 'Other'}`);
      
      // Check correct_answer format
      console.log(`Standard correct_answer: "${standardData[0]?.correct_answer}" (${typeof standardData[0]?.correct_answer})`);
      console.log(`Niche correct_answer: "${nicheData[0]?.correct_answer}" (${typeof nicheData[0]?.correct_answer})`);
    }

    console.log('\n💡 POTENTIAL ISSUES:');
    console.log('====================');
    console.log('1. Different answer structure between tables');
    console.log('2. Missing or malformed answer_choices arrays');
    console.log('3. Incorrect correct_answer matching');
    console.log('4. Missing answers array with isCorrect flags');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check if triviaService properly handles both answer formats');
    console.log('2. Verify answer shuffling and selection logic');
    console.log('3. Test with actual app to see console errors');

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    console.error('Full error:', error);
  }
}

// Run the analysis
examineAnswerStructures(); 