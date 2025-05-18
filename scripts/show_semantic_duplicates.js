/**
 * Find and show semantic duplicate questions in the database without removing them
 * This script uses multiple strategies to identify potential duplicates:
 * 1. Answer-based grouping
 * 2. Topic-based grouping
 * 3. Semantic similarity detection
 * 4. Keyword extraction and matching
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
 * Find and display semantic duplicates without removing them
 */
async function findSemanticDuplicates() {
  try {
    console.log('Checking for semantically similar questions in the database...');
    
    // Get all questions with their answers and metadata
    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('id, question_text, answer_choices, correct_answer, topic, subtopic, tags, difficulty, language')
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
    
    // Organize questions by topic for more efficient comparison
    const questionsByTopic = {};
    questions.forEach(q => {
      const topic = q.topic || 'unknown';
      if (!questionsByTopic[topic]) {
        questionsByTopic[topic] = [];
      }
      questionsByTopic[topic].push(q);
    });
    
    // Also organize by correct answer for answer-based duplicate detection
    const questionsByAnswer = {};
    questions.forEach(q => {
      const answer = q.correct_answer ? q.correct_answer.toLowerCase().trim() : 'unknown';
      if (!questionsByAnswer[answer]) {
        questionsByAnswer[answer] = [];
      }
      questionsByAnswer[answer].push(q);
    });
    
    // Track duplicates
    const duplicateGroups = [];
    
    // Find answer-based duplicates
    console.log('\nChecking for answer-based duplicates...');
    Object.entries(questionsByAnswer).forEach(([answer, answerQuestions]) => {
      if (answerQuestions.length > 1 && answer !== 'unknown') {
        // Skip very common answers like "true", "false", single digits, etc.
        if (["true", "false", "yes", "no", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].includes(answer)) {
          return;
        }
        
        // Extract keywords from each question
        const questionsWithKeywords = answerQuestions.map(q => {
          // Extract keywords by removing common words and keeping important terms
          const text = q.question_text.toLowerCase();
          const keywords = extractKeywords(text);
          return { ...q, keywords };
        });
        
        // Group similar questions within the same answer group
        for (let i = 0; i < questionsWithKeywords.length; i++) {
          const currentQuestion = questionsWithKeywords[i];
          const similarQuestions = [currentQuestion];
          
          for (let j = i + 1; j < questionsWithKeywords.length; j++) {
            const otherQuestion = questionsWithKeywords[j];
            
            // If questions share significant keywords or have similar meaning
            if (areSemanticallyRelated(currentQuestion, otherQuestion)) {
              similarQuestions.push(otherQuestion);
              // Remove this question so we don't process it again
              questionsWithKeywords.splice(j, 1);
              j--;
            }
          }
          
          if (similarQuestions.length > 1) {
            duplicateGroups.push({
              type: 'answer',
              answer,
              questions: similarQuestions
            });
          }
        }
      }
    });
    
    // Find topic-based duplicates that might have different answers
    console.log('Checking for topic-based duplicates...');
    Object.entries(questionsByTopic).forEach(([topic, topicQuestions]) => {
      if (topicQuestions.length > 1 && topic !== 'unknown') {
        // For each question in this topic
        for (let i = 0; i < topicQuestions.length; i++) {
          const currentQuestion = topicQuestions[i];
          const currentKeywords = extractKeywords(currentQuestion.question_text.toLowerCase());
          const similarQuestions = [currentQuestion];
          
          for (let j = i + 1; j < topicQuestions.length; j++) {
            const otherQuestion = topicQuestions[j];
            const otherKeywords = extractKeywords(otherQuestion.question_text.toLowerCase());
            
            // Check if questions are asking about the same concept
            if (haveSimilarIntent(currentQuestion.question_text, otherQuestion.question_text, 
                                currentKeywords, otherKeywords)) {
              similarQuestions.push(otherQuestion);
              // Remove this question so we don't process it again
              topicQuestions.splice(j, 1);
              j--;
            }
          }
          
          if (similarQuestions.length > 1) {
            duplicateGroups.push({
              type: 'topic',
              topic,
              questions: similarQuestions
            });
          }
        }
      }
    });
    
    // Display results
    if (duplicateGroups.length > 0) {
      console.log('\nFound potential semantic duplicate questions:');
      
      let totalDuplicateGroups = 0;
      let totalDuplicateQuestions = 0;
      
      for (let i = 0; i < duplicateGroups.length; i++) {
        const group = duplicateGroups[i];
        totalDuplicateGroups++;
        totalDuplicateQuestions += group.questions.length;
        
        console.log(`\n----- Duplicate Group #${totalDuplicateGroups} (${group.questions.length} questions) -----`);
        console.log(`Type: ${group.type === 'answer' ? 'Same Answer' : 'Same Topic'}`);
        if (group.type === 'answer') {
          console.log(`Answer: "${group.answer}"`);
        } else {
          console.log(`Topic: "${group.topic}"`);
        }
        
        group.questions.forEach((q, index) => {
          console.log(`\n  [${index + 1}] ID: ${q.id}`);
          console.log(`      Text: ${q.question_text}`);
          console.log(`      Answer: ${q.correct_answer || 'Unknown'}`);
          console.log(`      Topic: ${q.topic || 'Unknown'}`);
          console.log(`      Subtopic: ${q.subtopic || 'Unknown'}`);
          console.log(`      Tags: ${q.tags ? JSON.stringify(q.tags) : 'None'}`);
          console.log(`      Keywords: ${q.keywords ? q.keywords.join(', ') : 'None'}`);
        });
      }
      
      console.log(`\n=== Summary ===`);
      console.log(`Found ${totalDuplicateGroups} potential duplicate groups with a total of ${totalDuplicateQuestions} questions.`);
      console.log(`No questions were removed. This script only identifies potential duplicates.`);
      
    } else {
      console.log('\nNo semantic duplicates found!');
    }
    
  } catch (error) {
    console.error('Error processing duplicates:', error);
    process.exit(1);
  }
}

/**
 * Extract important keywords from a question text
 */
function extractKeywords(text) {
  // Skip common words and keep important ones
  const commonWords = [
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'to', 'of', 'and', 'in', 'that', 'have', 'for', 'on', 'with', 'as',
    'at', 'this', 'by', 'from', 'which', 'or', 'what', 'who', 'where', 'why',
    'how', 'when', 'there', 'here', 'do', 'does', 'did', 'has', 'had',
    'can', 'could', 'will', 'would', 'should', 'shall', 'must', 'may', 'might',
    'many', 'most', 'some', 'any', 'all', 'one', 'two', 'three', 'four', 'five',
    'its', 'it\'s', 'their', 'they', 'them', 'these', 'those', 'your', 'my', 'our',
    'his', 'her', 'hers', 'she', 'he'
  ];
  
  // Split by non-alphanumeric characters and filter out common words and short words
  const words = text.split(/[^\w]/)
    .filter(word => word.length > 2 && !commonWords.includes(word.toLowerCase()));
  
  return [...new Set(words)]; // Remove duplicates
}

/**
 * Check if two questions are semantically related
 */
function areSemanticallyRelated(q1, q2) {
  // Check if they share significant keywords
  const sharedKeywords = q1.keywords.filter(kw => q2.keywords.includes(kw));
  
  // Minimum threshold for keyword overlap (adjust as needed)
  const keywordThreshold = Math.min(3, Math.min(q1.keywords.length, q2.keywords.length) / 2);
  
  if (sharedKeywords.length >= keywordThreshold) {
    return true;
  }
  
  // Check specific patterns that indicate similarity
  // E.g., both asking about "largest", "biggest", etc.
  const sizePatterns = ['largest', 'biggest', 'most extensive', 'highest', 'greatest'];
  const locationPatterns = ['where', 'which continent', 'which region', 'which country'];
  const definitionPatterns = ['what is', 'what are', 'define', 'describe'];
  
  // Check if both questions match the same pattern type
  for (const patternSet of [sizePatterns, locationPatterns, definitionPatterns]) {
    const q1HasPattern = patternSet.some(pattern => q1.question_text.toLowerCase().includes(pattern));
    const q2HasPattern = patternSet.some(pattern => q2.question_text.toLowerCase().includes(pattern));
    
    if (q1HasPattern && q2HasPattern) {
      // If both match the same pattern, check for additional keyword similarity
      if (sharedKeywords.length >= 1) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if two questions have a similar intent
 */
function haveSimilarIntent(q1Text, q2Text, q1Keywords, q2Keywords) {
  // Check if both questions are asking the same type of question
  // First, look for question types
  const whatType = (q1Text.toLowerCase().includes('what') && q2Text.toLowerCase().includes('what'));
  const whereType = (q1Text.toLowerCase().includes('where') && q2Text.toLowerCase().includes('where'));
  const whichType = (q1Text.toLowerCase().includes('which') && q2Text.toLowerCase().includes('which'));
  const howType = (q1Text.toLowerCase().includes('how') && q2Text.toLowerCase().includes('how'));
  const whyType = (q1Text.toLowerCase().includes('why') && q2Text.toLowerCase().includes('why'));
  
  // If they're the same question type
  const sameQuestionType = whatType || whereType || whichType || howType || whyType;
  
  // Calculate Jaccard similarity of keywords
  const union = new Set([...q1Keywords, ...q2Keywords]);
  const intersection = q1Keywords.filter(kw => q2Keywords.includes(kw));
  const jaccardSimilarity = intersection.length / union.size;
  
  // If high keyword similarity and same question type, likely similar intent
  if (sameQuestionType && jaccardSimilarity > 0.3) {
    return true;
  }
  
  // Special case: Both questions about the Amazon rainforest
  const q1ContainsAmazon = q1Text.toLowerCase().includes('amazon');
  const q2ContainsAmazon = q2Text.toLowerCase().includes('amazon');
  
  if (q1ContainsAmazon && q2ContainsAmazon) {
    if (jaccardSimilarity > 0.2) {
      return true;
    }
  }
  
  // Special case: Both questions about biodiversity or ecological characteristics
  const bioDiversityTerms = ['biodiversity', 'diverse', 'species', 'variety', 'flora', 'fauna'];
  const q1Biodiversity = bioDiversityTerms.some(term => q1Text.toLowerCase().includes(term));
  const q2Biodiversity = bioDiversityTerms.some(term => q2Text.toLowerCase().includes(term));
  
  if (q1Biodiversity && q2Biodiversity) {
    if (jaccardSimilarity > 0.2) {
      return true;
    }
  }
  
  // Special case: Both questions containing 'lungs of the planet'
  if (q1Text.toLowerCase().includes('lungs of the planet') && 
      q2Text.toLowerCase().includes('lungs of the planet')) {
    return true;
  }
  
  return false;
}

// Run the duplicate finder
findSemanticDuplicates().then(() => {
  process.exit(0);
}); 