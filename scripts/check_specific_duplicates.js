/**
 * Check specific question IDs for duplicates
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
 * Check specific questions for duplicates
 */
async function checkSpecificQuestions() {
  try {
    console.log('Checking specific questions for duplicates...');
    
    // The specific question IDs to check
    const questionIds = ['gen_7h7giils', 'gen_iwam9izx'];
    
    // Get the questions from the database
    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('id, question_text, fingerprint, tags, topic, subtopic, branch, created_at')
      .in('id', questionIds);
    
    if (error) {
      console.error('Error fetching questions:', error);
      process.exit(1);
    }
    
    if (!questions || questions.length === 0) {
      console.log('No questions found with the specified IDs.');
      return;
    }
    
    console.log(`Found ${questions.length} questions with the specified IDs:`);
    
    // Print details for each question
    questions.forEach((question, idx) => {
      console.log(`\n[${idx + 1}] ID: ${question.id}`);
      console.log(`    Question: ${question.question_text}`);
      console.log(`    Fingerprint: ${question.fingerprint}`);
      console.log(`    Topic: ${question.topic} > ${question.subtopic || 'N/A'} > ${question.branch || 'N/A'}`);
      console.log(`    Tags: ${question.tags ? question.tags.join(', ') : 'None'}`);
      console.log(`    Created: ${question.created_at}`);
    });
    
    // Check if these questions have the same fingerprint
    if (questions.length === 2) {
      const [q1, q2] = questions;
      
      if (q1.fingerprint === q2.fingerprint) {
        console.log('\nDUPLICATE DETECTED: These questions have the same fingerprint!');
      } else {
        console.log('\nNo duplicate detected: These questions have different fingerprints.');
        
        // Check for similar content even if fingerprints differ
        const normalizedQ1 = q1.question_text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        const normalizedQ2 = q2.question_text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        
        if (normalizedQ1 === normalizedQ2 || 
            normalizedQ1.includes(normalizedQ2) || 
            normalizedQ2.includes(normalizedQ1)) {
          console.log('SIMILAR CONTENT DETECTED: These questions have very similar text content despite different fingerprints.');
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error while checking specific questions:', error);
    process.exit(1);
  }
}

// Run the check
checkSpecificQuestions().then(() => {
  console.log('\nCheck complete!');
  process.exit(0);
}); 