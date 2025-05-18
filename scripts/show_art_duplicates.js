/**
 * Find and show semantic duplicate questions specifically about art movements
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
 * Find and display art movement-related duplicates
 */
async function findArtDuplicates() {
  try {
    console.log('Checking for art movement-related duplicate questions...');
    
    // Art movement keywords
    const artMovements = [
      'impressionism', 'romanticism', 'cubism', 'surrealism', 'expressionism',
      'abstract', 'renaissance', 'baroque', 'neoclassicism', 'realism',
      'art movement', 'artistic movement', 'art style', 'painting style'
    ];
    
    // Create a query filter for art movement keywords
    const likeFilters = artMovements.map(term => `question_text.ilike.%${term}%`).join(',');
    const tagFilters = artMovements.map(term => `tags.cs.{${term}}`).join(',');
    
    // Get all questions related to art movements
    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('id, question_text, answer_choices, correct_answer, topic, subtopic, tags, difficulty, language')
      .or(`${likeFilters},topic.ilike.%art%,subtopic.ilike.%art movement%,${tagFilters}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching questions:', error);
      process.exit(1);
    }
    
    if (!questions || questions.length === 0) {
      console.log('No art movement-related questions found in the database.');
      return;
    }
    
    console.log(`Found ${questions.length} art movement-related questions to check...`);
    
    // Group by answer to find potential duplicates
    const questionsByAnswer = {};
    questions.forEach(q => {
      const answer = q.correct_answer ? q.correct_answer.toLowerCase().trim() : 'unknown';
      if (!questionsByAnswer[answer]) {
        questionsByAnswer[answer] = [];
      }
      questionsByAnswer[answer].push(q);
    });
    
    // Group duplicates by art movement
    const duplicateGroups = [];
    
    // Add specific art movement groups
    artMovements.forEach(movement => {
      // Skip generic terms
      if (['art movement', 'artistic movement', 'art style', 'painting style'].includes(movement)) {
        return;
      }
      
      const movementGroup = [];
      questions.forEach(q => {
        const qText = q.question_text.toLowerCase();
        const qAnswer = q.correct_answer ? q.correct_answer.toLowerCase() : '';
        
        // Find questions that mention this art movement or have it as an answer
        if (qText.includes(movement) || qAnswer === movement) {
          movementGroup.push(q);
        }
      });
      
      if (movementGroup.length > 1) {
        duplicateGroups.push({
          type: 'art_movement',
          name: movement.charAt(0).toUpperCase() + movement.slice(1),
          questions: movementGroup
        });
      }
    });
    
    // Also find answer-based groups
    Object.entries(questionsByAnswer).forEach(([answer, answerQuestions]) => {
      // Only look at answers with multiple questions, skip unknown
      if (answerQuestions.length > 1 && answer !== 'unknown') {
        // Skip if this answer is already part of an art movement group
        const isArtMovement = artMovements.some(movement => 
          movement === answer || answer.includes(movement));
        
        if (isArtMovement) {
          // Check if we need to create a new group
          const existingGroup = duplicateGroups.find(group => 
            group.name.toLowerCase() === answer || 
            answer.includes(group.name.toLowerCase()));
          
          if (!existingGroup) {
            duplicateGroups.push({
              type: 'answer',
              name: answer,
              questions: answerQuestions
            });
          }
        }
      }
    });
    
    // Display results
    if (duplicateGroups.length > 0) {
      console.log('\nFound potential art movement-related duplicate questions:');
      
      let totalDuplicateQuestions = 0;
      
      for (let i = 0; i < duplicateGroups.length; i++) {
        const group = duplicateGroups[i];
        totalDuplicateQuestions += group.questions.length;
        
        console.log(`\n----- Duplicate Group #${i + 1}: ${group.name} (${group.questions.length} questions) -----`);
        
        group.questions.forEach((q, index) => {
          console.log(`\n  [${index + 1}] ID: ${q.id}`);
          console.log(`      Text: ${q.question_text}`);
          console.log(`      Answer: ${q.correct_answer || 'Unknown'}`);
          console.log(`      Topic: ${q.topic || 'Unknown'}`);
          console.log(`      Subtopic: ${q.subtopic || 'Unknown'}`);
          console.log(`      Tags: ${q.tags ? JSON.stringify(q.tags) : 'None'}`);
        });
      }
      
      console.log(`\n=== Summary ===`);
      console.log(`Found ${duplicateGroups.length} art movement duplicate groups with a total of ${totalDuplicateQuestions} questions.`);
      console.log(`No questions were removed. This script only identifies potential duplicates.`);
      
    } else {
      console.log('\nNo art movement-related duplicates found!');
    }
    
  } catch (error) {
    console.error('Error processing duplicates:', error);
    process.exit(1);
  }
}

// Run the duplicate finder
findArtDuplicates().then(() => {
  process.exit(0);
}); 