/**
 * Find and show duplicate questions in the database without removing them
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
 * Find and display similar questions without removing them
 */
async function findDuplicateQuestions() {
  try {
    console.log('Checking for similar questions in the database...');
    
    // Get all questions with their answers
    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('id, question_text, fingerprint, correct_answer, topic, difficulty')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching questions:', error);
      process.exit(1);
    }
    
    if (!questions || questions.length === 0) {
      console.log('No questions found in the database.');
      return;
    }
    
    console.log(`Found ${questions.length} questions to check...`);
    
    // Track duplicates
    const duplicates = new Map(); // Map of normalized text to array of question objects
    let duplicateCount = 0;
    
    // Check each question against all others
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.question_text) continue;
      
      // Normalize the question text
      const normalizedText = question.question_text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const questionWords = new Set(normalizedText.split(' '));
      
      // Check against all other questions
      for (let j = i + 1; j < questions.length; j++) {
        const otherQuestion = questions[j];
        if (!otherQuestion.question_text) continue;
        
        // Normalize the other question text
        const otherNormalized = otherQuestion.question_text
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        const otherWords = new Set(otherNormalized.split(' '));
        
        // Calculate word differences
        const uniqueToFirst = [...questionWords].filter(word => !otherWords.has(word));
        const uniqueToSecond = [...otherWords].filter(word => !questionWords.has(word));
        
        // If total word differences is 3 or less, consider it a potential duplicate
        if (uniqueToFirst.length + uniqueToSecond.length <= 3) {
          const key = `group_${duplicateCount++}`;
          if (!duplicates.has(key)) {
            duplicates.set(key, []);
          }
          
          // Only add if not already in the group
          const isDuplicate1 = duplicates.get(key).some(q => q.id === question.id);
          const isDuplicate2 = duplicates.get(key).some(q => q.id === otherQuestion.id);
          
          if (!isDuplicate1) {
            duplicates.get(key).push({
              id: question.id,
              text: question.question_text,
              correct_answer: question.correct_answer,
              topic: question.topic,
              difficulty: question.difficulty,
              diffWords: [...uniqueToFirst, ...uniqueToSecond].join(', ')
            });
          }
          
          if (!isDuplicate2) {
            duplicates.get(key).push({
              id: otherQuestion.id,
              text: otherQuestion.question_text,
              correct_answer: otherQuestion.correct_answer,
              topic: otherQuestion.topic, 
              difficulty: otherQuestion.difficulty,
              diffWords: [...uniqueToFirst, ...uniqueToSecond].join(', ')
            });
          }
        }
      }
    }
    
    // Display results
    if (duplicates.size > 0) {
      console.log('\nFound potential duplicate questions:');
      
      let totalDuplicateGroups = 0;
      let totalDuplicateQuestions = 0;
      
      for (const [groupKey, similarQuestions] of duplicates) {
        // Group questions by their correct answer
        const questionsByAnswer = new Map();
        
        similarQuestions.forEach(q => {
          const answerKey = q.correct_answer?.toLowerCase()?.trim() || 'unknown';
          if (!questionsByAnswer.has(answerKey)) {
            questionsByAnswer.set(answerKey, []);
          }
          questionsByAnswer.get(answerKey).push(q);
        });
        
        // Display each group
        for (const [answer, questions] of questionsByAnswer) {
          if (questions.length > 1) {
            totalDuplicateGroups++;
            totalDuplicateQuestions += questions.length;
            
            console.log(`\n----- Duplicate Group #${totalDuplicateGroups} (${questions.length} questions) -----`);
            console.log(`Answer: "${answer}"`);
            
            questions.forEach((q, index) => {
              console.log(`\n  [${index + 1}] ID: ${q.id}`);
              console.log(`      Text: ${q.text}`);
              console.log(`      Topic: ${q.topic || 'Unknown'}`);
              console.log(`      Difficulty: ${q.difficulty || 'Unknown'}`);
              console.log(`      Different words: ${q.diffWords}`);
            });
          }
        }
      }
      
      console.log(`\n=== Summary ===`);
      console.log(`Found ${totalDuplicateGroups} duplicate groups with a total of ${totalDuplicateQuestions} questions.`);
      console.log(`No questions were removed. This script only identifies potential duplicates.`);
      console.log(`To remove duplicates, use the 'check_duplicates.js' script instead.`);
      
    } else {
      console.log('\nNo similar questions found!');
    }
    
  } catch (error) {
    console.error('Error processing duplicates:', error);
    process.exit(1);
  }
}

// Run the duplicate finder
findDuplicateQuestions().then(() => {
  process.exit(0);
}); 