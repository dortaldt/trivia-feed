const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase client setup
// You can set these directly here if you don't want to use .env
// const supabaseUrl = 'your_supabase_url';
// const supabaseKey = 'your_supabase_anon_key';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Check if env variables are defined
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be defined');
  console.error('You can either:');
  console.error('1. Create a .env file with SUPABASE_URL and SUPABASE_KEY');
  console.error('2. Edit this script to set the values directly');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get the file paths from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Please provide paths to JSON files as arguments');
  console.error('Example: node import-json-to-supabase.js path/to/file1.json path/to/file2.json');
  process.exit(1);
}

const jsonFiles = args.map(arg => path.resolve(arg));

// Process each JSON file
async function processJSONFile(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`Error: JSON file not found at ${filePath}`);
      return { success: 0, total: 0 };
    }

    // Read and parse JSON
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const questions = JSON.parse(fileContent);
    
    if (!Array.isArray(questions)) {
      console.error(`Error: Expected an array of questions in ${filePath}`);
      return { success: 0, total: 0 };
    }

    console.log(`Processing ${questions.length} questions from ${filePath}`);
    
    // Insert data into Supabase
    let successCount = 0;
    
    for (const question of questions) {
      // Make sure arrays are properly formatted
      if (question.answer_choices && !Array.isArray(question.answer_choices)) {
        question.answer_choices = question.answer_choices.split(',').map(choice => choice.trim());
      }
      
      if (question.tags && !Array.isArray(question.tags)) {
        question.tags = question.tags.split(',').map(tag => tag.trim());
      }
      
      // Ensure we have the required fields
      if (!question.answer_choices || question.answer_choices.length === 0) {
        console.warn(`Warning: Question with id ${question.id || 'unknown'} has no answer choices`);
      }

      const { data, error } = await supabase
        .from('trivia_questions')
        .insert([question]);
      
      if (error) {
        console.error(`Error inserting question with id ${question.id || 'unknown'}:`, error);
        console.error(`Problematic question:`, JSON.stringify(question));
      } else {
        successCount++;
      }
    }
    
    return { success: successCount, total: questions.length };
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
    return { success: 0, total: 0 };
  }
}

// Process all files
async function processAllFiles() {
  let totalSuccess = 0;
  let totalQuestions = 0;

  console.log('Starting import to Supabase...');
  
  for (const file of jsonFiles) {
    console.log(`Processing file: ${file}`);
    const result = await processJSONFile(file);
    totalSuccess += result.success;
    totalQuestions += result.total;
  }
  
  console.log(`Import completed. Successfully inserted ${totalSuccess} out of ${totalQuestions} questions.`);
}

// Run the import
processAllFiles().catch(err => {
  console.error('Unexpected error:', err);
}); 