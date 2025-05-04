const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
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

// Path to CSV file
const csvPath = path.join(__dirname, '..', 'docs', 'Combined_Trivia_Question_Dataset.csv');

// Check if CSV file exists
if (!fs.existsSync(csvPath)) {
  console.error(`Error: CSV file not found at ${csvPath}`);
  process.exit(1);
}

// Function to parse array fields from CSV
function parseArrayField(field) {
  // If the field is null, undefined or empty, return a default array to avoid NOT NULL constraint violation
  if (!field || field.trim() === '') {
    return ['Unknown']; // Default value to avoid null
  }
  
  // Extract the array content from the string representation
  const match = field.match(/\[(.*)\]/);
  if (match && match[1]) {
    // Split by comma, but handle quoted values
    const items = match[1].split(',')
      .map(item => {
        // Remove quotes and trim
        return item.replace(/^['"]|['"]$/g, '').trim();
      })
      .filter(Boolean); // Remove empty strings
    
    // If we ended up with an empty array after filtering, return default
    return items.length > 0 ? items : ['Unknown'];
  }
  
  // If the string doesn't match the expected format, use it as a single item
  return [field.trim()];
}

// Function to process each row from CSV
async function processRows() {
  const rows = [];
  
  // Read and parse CSV
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      try {
        // Process the row data
        const processedRow = {
          ...row,
          // Parse array fields
          answer_choices: parseArrayField(row.answer_choices),
          tags: parseArrayField(row.tags)
        };
        
        // Validate required fields
        if (!processedRow.answer_choices || processedRow.answer_choices.length === 0) {
          console.warn(`Warning: Row with id ${row.id || 'unknown'} has no answer choices`);
        }
        
        rows.push(processedRow);
      } catch (err) {
        console.error(`Error processing row: ${JSON.stringify(row)}`);
        console.error(err);
      }
    })
    .on('end', async () => {
      try {
        console.log(`Parsed ${rows.length} rows from CSV`);
        
        // Insert data into Supabase one row at a time to identify problematic rows
        let successCount = 0;
        
        for (const row of rows) {
          const { data, error } = await supabase
            .from('trivia_questions')
            .insert([row]);
          
          if (error) {
            console.error(`Error inserting row with id ${row.id || 'unknown'}:`, error);
            console.error(`Problematic row:`, JSON.stringify(row));
          } else {
            successCount++;
          }
        }
        
        console.log(`Successfully inserted ${successCount} out of ${rows.length} rows.`);
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    });
}

// Run the import
console.log('Starting import to Supabase...');
processRows(); 