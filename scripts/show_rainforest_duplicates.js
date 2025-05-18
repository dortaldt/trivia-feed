/**
 * Find and show semantic duplicate questions specifically about rainforests
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
 * Find and display rainforest-related duplicates
 */
async function findRainforestDuplicates() {
  try {
    console.log('Checking for rainforest-related duplicate questions...');
    
    // Get all questions with rainforest-related content
    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('id, question_text, answer_choices, correct_answer, topic, subtopic, tags, difficulty, language')
      .or('question_text.ilike.%rainforest%,topic.ilike.%rainforest%,subtopic.ilike.%rainforest%,tags.cs.{rainforest}')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching questions:', error);
      process.exit(1);
    }
    
    if (!questions || questions.length === 0) {
      console.log('No rainforest-related questions found in the database.');
      return;
    }
    
    console.log(`Found ${questions.length} rainforest-related questions to check...`);
    
    // Get additional Amazon-related questions
    const { data: amazonQuestions, error: amazonError } = await supabase
      .from('trivia_questions')
      .select('id, question_text, answer_choices, correct_answer, topic, subtopic, tags, difficulty, language')
      .or('question_text.ilike.%amazon%,tags.cs.{amazon}')
      .not('id', 'in', `(${questions.map(q => `'${q.id}'`).join(',')})`);
    
    if (!amazonError && amazonQuestions && amazonQuestions.length > 0) {
      console.log(`Found additional ${amazonQuestions.length} Amazon-related questions...`);
      questions.push(...amazonQuestions);
    }
    
    // Also get biodiversity questions
    const { data: bioQuestions, error: bioError } = await supabase
      .from('trivia_questions')
      .select('id, question_text, answer_choices, correct_answer, topic, subtopic, tags, difficulty, language')
      .or('question_text.ilike.%biodiversity%,tags.cs.{biodiversity}')
      .not('id', 'in', `(${questions.map(q => `'${q.id}'`).join(',')})`);
    
    if (!bioError && bioQuestions && bioQuestions.length > 0) {
      console.log(`Found additional ${bioQuestions.length} biodiversity-related questions...`);
      questions.push(...bioQuestions);
    }
    
    console.log(`Total of ${questions.length} questions to check for duplicates.`);
    
    // Group the questions by similar topics for easier analysis
    const duplicateGroups = [];
    
    // Group 1: Questions about "largest rainforest" or "Amazon size/extent"
    const largestRainforestGroup = [];
    const sizeKeywords = ['largest', 'biggest', 'most extensive', 'vast'];
    questions.forEach(q => {
      const qText = q.question_text.toLowerCase();
      if ((qText.includes('amazon') || qText.includes('rainforest')) && 
          sizeKeywords.some(kw => qText.includes(kw))) {
        largestRainforestGroup.push(q);
      }
    });
    if (largestRainforestGroup.length > 1) {
      duplicateGroups.push({
        type: 'concept',
        name: 'Largest Rainforest',
        questions: largestRainforestGroup
      });
    }
    
    // Group 2: Questions about "biodiversity in rainforests" or "species diversity"
    const biodiversityGroup = [];
    const bioKeywords = ['biodiversity', 'diverse', 'species', 'variety', 'flora', 'fauna'];
    questions.forEach(q => {
      const qText = q.question_text.toLowerCase();
      if ((qText.includes('rainforest') || qText.includes('amazon')) && 
          bioKeywords.some(kw => qText.includes(kw))) {
        biodiversityGroup.push(q);
      }
    });
    if (biodiversityGroup.length > 1) {
      duplicateGroups.push({
        type: 'concept',
        name: 'Rainforest Biodiversity',
        questions: biodiversityGroup
      });
    }
    
    // Group 3: Questions about "which continent" has Amazon
    const continentGroup = [];
    questions.forEach(q => {
      const qText = q.question_text.toLowerCase();
      if (qText.includes('amazon') && 
          (qText.includes('continent') || qText.includes('where'))) {
        continentGroup.push(q);
      }
    });
    if (continentGroup.length > 1) {
      duplicateGroups.push({
        type: 'concept',
        name: 'Amazon Location/Continent',
        questions: continentGroup
      });
    }
    
    // Group 4: Questions about "lungs of the planet"
    const lungsGroup = [];
    questions.forEach(q => {
      const qText = q.question_text.toLowerCase();
      if (qText.includes('lungs of the planet') || 
          qText.includes('oxygen') || 
          (q.correct_answer && q.correct_answer.toLowerCase().includes('tropical') && 
           qText.includes('rainforest'))) {
        lungsGroup.push(q);
      }
    });
    if (lungsGroup.length > 1) {
      duplicateGroups.push({
        type: 'concept',
        name: 'Rainforests as "Lungs of the Planet"',
        questions: lungsGroup
      });
    }
    
    // Display results
    if (duplicateGroups.length > 0) {
      console.log('\nFound potential rainforest-related duplicate questions:');
      
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
      console.log(`Found ${duplicateGroups.length} duplicate groups with a total of ${totalDuplicateQuestions} questions.`);
      console.log(`No questions were removed. This script only identifies potential duplicates.`);
      
    } else {
      console.log('\nNo rainforest-related duplicates found!');
    }
    
  } catch (error) {
    console.error('Error processing duplicates:', error);
    process.exit(1);
  }
}

// Run the duplicate finder
findRainforestDuplicates().then(() => {
  process.exit(0);
}); 