/**
 * Update existing questions in the database with fingerprints
 * Run this script after adding the fingerprint column to populate it for existing questions
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
 * Generate a fingerprint for a question to detect duplicates
 */
function generateQuestionFingerprint(question, tags = []) {
  // Normalize the question text: lowercase, remove punctuation, extra spaces
  const normalizedQuestion = question
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Sort and join tags
  const normalizedTags = [...tags].sort().join('|').toLowerCase();
  
  // Create a simple hash
  return `${normalizedQuestion}|${normalizedTags}`;
}

/**
 * Update fingerprints for all questions in the database
 */
async function updateFingerprints() {
  try {
    console.log('Starting fingerprint update process...');
    
    // Get all questions
    const { data: questions, error: fetchError } = await supabase
      .from('trivia_questions')
      .select('id, question_text, tags');
    
    if (fetchError) {
      console.error('Error fetching questions:', fetchError);
      process.exit(1);
    }
    
    if (!questions || questions.length === 0) {
      console.log('No questions found in the database.');
      return;
    }
    
    console.log(`Found ${questions.length} questions to process.`);
    
    // Process questions in batches to avoid overwhelming the database
    const batchSize = 50;
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      for (const question of batch) {
        try {
          if (!question.question_text) {
            console.warn(`Question ${question.id} has no text, skipping`);
            continue;
          }
          
          // Generate fingerprint
          const fingerprint = generateQuestionFingerprint(question.question_text, question.tags || []);
          
          // Update only the fingerprint column
          const { error: updateError } = await supabase
            .from('trivia_questions')
            .update({ fingerprint })
            .eq('id', question.id);
          
          if (updateError) {
            console.error(`Error updating question ${question.id}:`, updateError);
            errorCount++;
          } else {
            updatedCount++;
          }
          
          processedCount++;
          
        } catch (questionError) {
          console.error(`Error processing question ${question.id}:`, questionError);
          errorCount++;
        }
      }
      
      console.log(`Processed ${processedCount}/${questions.length} questions...`);
    }
    
    console.log(`\nFingerprint update complete!`);
    console.log(`- Total questions processed: ${processedCount}`);
    console.log(`- Questions updated: ${updatedCount}`);
    console.log(`- Errors encountered: ${errorCount}`);
    
  } catch (error) {
    console.error('Unexpected error during fingerprint update:', error);
    process.exit(1);
  }
}

// Run the update
updateFingerprints().then(() => {
  console.log('\nProcess complete!');
  process.exit(0);
}); 