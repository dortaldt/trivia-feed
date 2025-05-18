/**
 * Find and display duplicate questions from the database based on fingerprints
 * This script will identify questions with the same fingerprint but won't remove them
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_KEY) are required in .env file');
  process.exit(1);
}

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Find and display duplicates in the database based on fingerprints
 */
async function showFingerPrintDuplicates() {
  try {
    console.log('Checking for duplicate questions in the database based on fingerprints...');
    
    // First, get all fingerprints from the database
    const { data: allFingerprints, error: fingerprintError } = await supabase
      .from('trivia_questions')
      .select('fingerprint')
      .not('fingerprint', 'is', null);
    
    if (fingerprintError) {
      console.error('Error checking for duplicates:', fingerprintError);
      process.exit(1);
    }
    
    if (!allFingerprints || allFingerprints.length === 0) {
      console.log('No questions with fingerprints found in the database.');
      return;
    }
    
    // Count occurrences of each fingerprint
    const fingerprintCounts = {};
    allFingerprints.forEach(item => {
      const fingerprint = item.fingerprint;
      fingerprintCounts[fingerprint] = (fingerprintCounts[fingerprint] || 0) + 1;
    });
    
    // Find fingerprints that appear more than once
    const duplicateFingerprints = Object.entries(fingerprintCounts)
      .filter(([_, count]) => count > 1)
      .map(([fingerprint, count]) => ({ fingerprint, count }));
    
    if (duplicateFingerprints.length === 0) {
      console.log('No duplicates found! All questions have unique fingerprints.');
      return;
    }
    
    console.log(`Found ${duplicateFingerprints.length} fingerprints with duplicates.`);
    
    let totalDuplicateQuestions = 0;
    
    // For each duplicate fingerprint, display the questions
    for (const [index, item] of duplicateFingerprints.entries()) {
      const fingerprint = item.fingerprint;
      const count = item.count;
      
      // Get all questions with this fingerprint
      const { data: questions, error: questionError } = await supabase
        .from('trivia_questions')
        .select('id, question_text, correct_answer, topic, difficulty, created_at')
        .eq('fingerprint', fingerprint)
        .order('created_at', { ascending: true });
      
      if (questionError) {
        console.error(`Error fetching questions for fingerprint ${fingerprint}:`, questionError);
        continue;
      }
      
      if (questions.length <= 1) {
        continue;  // No duplicates for this fingerprint
      }
      
      console.log(`\n----- Duplicate Group #${index + 1} (${questions.length} questions) -----`);
      console.log(`Fingerprint: ${fingerprint}`);
      
      for (const [qIndex, q] of questions.entries()) {
        console.log(`\n  [${qIndex + 1}] ID: ${q.id}`);
        console.log(`      Text: ${q.question_text}`);
        console.log(`      Answer: ${q.correct_answer || 'Unknown'}`);
        console.log(`      Topic: ${q.topic || 'Unknown'}`);
        console.log(`      Difficulty: ${q.difficulty || 'Unknown'}`);
        console.log(`      Created: ${new Date(q.created_at).toLocaleString()}`);
      }
      
      totalDuplicateQuestions += questions.length;
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Found ${duplicateFingerprints.length} duplicate fingerprints with a total of ${totalDuplicateQuestions} questions.`);
    console.log(`No questions were removed. This script only identifies duplicates.`);
    console.log(`To remove duplicates, use the 'remove_duplicates.js' script instead.`);
    
  } catch (error) {
    console.error('Unexpected error while finding duplicates:', error);
    process.exit(1);
  }
}

// Run the duplicate finder
showFingerPrintDuplicates().then(() => {
  console.log('Duplicate finding complete!');
  process.exit(0);
}); 