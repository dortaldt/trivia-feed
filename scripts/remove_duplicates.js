/**
 * Remove duplicate questions from the database based on fingerprints
 * This script will identify questions with the same fingerprint and keep only the first one
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
 * Find and remove duplicates in the database based on fingerprints
 */
async function removeDuplicates() {
  try {
    console.log('Checking for duplicate questions in the database...');
    
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
    
    console.log(`Found ${duplicateFingerprints.length} fingerprints with duplicates. Processing...`);
    
    let totalQuestionsRemoved = 0;
    
    // For each duplicate fingerprint, process the questions
    for (const item of duplicateFingerprints) {
      const fingerprint = item.fingerprint;
      const count = item.count;
      
      // Get all questions with this fingerprint
      const { data: questions, error: questionError } = await supabase
        .from('trivia_questions')
        .select('id, question_text, created_at')
        .eq('fingerprint', fingerprint)
        .order('created_at', { ascending: true });  // Keep the oldest question
      
      if (questionError) {
        console.error(`Error fetching questions for fingerprint ${fingerprint}:`, questionError);
        continue;
      }
      
      if (questions.length <= 1) {
        continue;  // No duplicates for this fingerprint
      }
      
      // Keep the first question, remove the rest
      const keepQuestion = questions[0];
      const removeQuestions = questions.slice(1);
      const removeIds = removeQuestions.map(q => q.id);
      
      console.log(`\nKeeping: "${keepQuestion.question_text.substring(0, 50)}..." (ID: ${keepQuestion.id})`);
      console.log(`Removing ${removeQuestions.length} duplicate(s):`);
      
      for (const q of removeQuestions) {
        console.log(`  - ID: ${q.id}, Text: "${q.question_text.substring(0, 50)}..."`);
      }
      
      // Delete the duplicate questions
      const { error: deleteError } = await supabase
        .from('trivia_questions')
        .delete()
        .in('id', removeIds);
      
      if (deleteError) {
        console.error(`Error deleting duplicate questions:`, deleteError);
        continue;
      }
      
      totalQuestionsRemoved += removeQuestions.length;
      console.log(`Successfully removed ${removeQuestions.length} duplicate(s) for this fingerprint.`);
    }
    
    console.log(`\nDuplicate removal complete. Removed ${totalQuestionsRemoved} duplicate questions.`);
    
  } catch (error) {
    console.error('Unexpected error while removing duplicates:', error);
    process.exit(1);
  }
}

// Run the duplicate removal
removeDuplicates().then(() => {
  console.log('Duplicate removal complete!');
  process.exit(0);
}); 