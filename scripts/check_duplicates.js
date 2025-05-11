/**
 * Check for duplicate questions in the database and remove them if they have the same answer
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
 * Check for similar questions and remove duplicates with same answers
 */
async function checkAndRemoveDuplicates() {
  try {
    console.log('Checking for similar questions in the database...');
    
    // Get all questions with their answers
    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('id, question_text, fingerprint, correct_answer')
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
          const key = normalizedText;
          if (!duplicates.has(key)) {
            duplicates.set(key, []);
          }
          duplicates.get(key).push({
            id: question.id,
            text: question.question_text,
            correct_answer: question.correct_answer,
            diffWords: [...uniqueToFirst, ...uniqueToSecond].join(', ')
          });
          duplicates.get(key).push({
            id: otherQuestion.id,
            text: otherQuestion.question_text,
            correct_answer: otherQuestion.correct_answer,
            diffWords: [...uniqueToFirst, ...uniqueToSecond].join(', ')
          });
        }
      }
    }
    
    // Process duplicates and remove those with same answers
    let totalRemoved = 0;
    
    if (duplicates.size > 0) {
      console.log('\nProcessing similar questions...');
      
      for (const [normalizedText, similarQuestions] of duplicates) {
        // Group questions by their correct answer
        const questionsByAnswer = new Map();
        
        similarQuestions.forEach(q => {
          const answerKey = q.correct_answer.toLowerCase().trim();
          if (!questionsByAnswer.has(answerKey)) {
            questionsByAnswer.set(answerKey, []);
          }
          questionsByAnswer.get(answerKey).push(q);
        });
        
        // For each group with the same answer, keep the first one and remove the rest
        for (const [answer, questions] of questionsByAnswer) {
          if (questions.length > 1) {
            console.log('\nFound duplicate questions with same answer:');
            questions.forEach(q => {
              console.log(`  ID: ${q.id}`);
              console.log(`  Text: ${q.text}`);
              console.log(`  Answer: ${q.correct_answer}`);
              console.log(`  Different words: ${q.diffWords}`);
            });
            
            // Keep the first question, remove the rest
            const [keepQuestion, ...removeQuestions] = questions;
            console.log(`\nKeeping question ${keepQuestion.id}, removing ${removeQuestions.length} duplicates...`);
            
            // Remove the duplicate questions
            for (const question of removeQuestions) {
              const { error: deleteError } = await supabase
                .from('trivia_questions')
                .delete()
                .eq('id', question.id);
              
              if (deleteError) {
                console.error(`Error removing question ${question.id}:`, deleteError);
              } else {
                totalRemoved++;
              }
            }
          }
        }
      }
    } else {
      console.log('\nNo similar questions found!');
    }
    
    console.log(`\nDuplicate removal complete! Removed ${totalRemoved} duplicate questions.`);
    
  } catch (error) {
    console.error('Error processing duplicates:', error);
    process.exit(1);
  }
}

// Run the check and removal
checkAndRemoveDuplicates().then(() => {
  process.exit(0);
}); 