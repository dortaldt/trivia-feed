/**
 * Hybrid Duplicate Remover for Trivia Questions
 * 
 * This script implements a hybrid approach to detect and automatically remove duplicate trivia questions:
 * 1. Question text similarity
 * 2. Answer matching
 * 3. Enhanced fingerprinting to identify truly different questions even when answers match
 * 
 * Unlike the detector version, this script automatically removes duplicates without requiring
 * user confirmation, keeping the best version of each question based on quality metrics.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials 
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vdrmtsifivvpioonpqqc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcm10c2lmaXZ2cGlvb25wcXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNDQyMzIsImV4cCI6MjA2MTkyMDIzMn0.OtAUoIz1ZCCE5IncVvpHnDGrTXEQy_JoyvNE0QQf6wA";

console.log("Using Supabase URL:", SUPABASE_URL);

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration parameters
const CONFIG = {
  // Question text similarity thresholds
  QUESTION_SIMILARITY_HIGH: 0.85,  // Questions are almost certainly duplicates
  QUESTION_SIMILARITY_MEDIUM: 0.27, // Questions might be duplicates (was 0.60)
  
  // Answer similarity thresholds  
  ANSWER_MATCH_REQUIRED: 0.90,     // Answers must be very similar
  
  // Fingerprint similarity thresholds
  FINGERPRINT_DIFFERENCE_THRESHOLD: 0.4, // Below this, questions likely asking different things (was 0.6)
  
  // Skip certain generic answers that would create false positives
  SKIP_GENERIC_ANSWERS: [
    "true", "false", "yes", "no", 
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", 
    "unknown", "none"
  ],
  
  // Filter to show only specific duplicate groups
  FILTER_KEYWORD: process.env.FILTER_KEYWORD || '',  // Set via environment variable
};

/**
 * Main function to detect and remove duplicate questions
 */
async function removeDuplicateQuestions() {
  try {
    console.log('Fetching trivia questions from the database...');
    
    // Check if filter is applied
    if (CONFIG.FILTER_KEYWORD) {
      console.log(`FILTER APPLIED: Only showing groups containing '${CONFIG.FILTER_KEYWORD}'`);
    }
    
    // Get all questions with their answers and metadata
    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('id, question_text, answer_choices, correct_answer, topic, subtopic, tags, difficulty, language, created_at')
      .order('created_at', { ascending: true }); // Order by creation date
    
    if (error) {
      console.error('Error fetching questions:', error);
      process.exit(1);
    }
    
    if (!questions || questions.length === 0) {
      console.log('No questions found in the database.');
      return;
    }
    
    console.log(`Found ${questions.length} questions to analyze...`);
    
    // If filter is "amazon", show a count of how many amazon questions exist
    if (CONFIG.FILTER_KEYWORD.toLowerCase() === 'amazon') {
      const amazonQuestions = questions.filter(q => 
        (q.question_text && q.question_text.toLowerCase().includes('amazon')) ||
        (q.correct_answer && q.correct_answer.toLowerCase().includes('amazon'))
      );
      
      console.log(`\nFound ${amazonQuestions.length} questions containing 'amazon' in question or answer`);
    }
    
    // Preprocess questions with enhanced metadata
    const processedQuestions = questions.map(q => ({
      ...q,
      fingerprint: generateEnhancedFingerprint(q.question_text),
      normalizedAnswer: q.correct_answer ? q.correct_answer.toLowerCase().trim() : '',
      entities: extractNamedEntities(q.question_text),
      propertyContext: extractPropertyContext(q.question_text)
    }));

    // Group duplicate questions using the hybrid approach
    const duplicateGroups = findDuplicatesWithHybridApproach(processedQuestions);
    
    // Apply filter if specified
    let filteredGroups = duplicateGroups;
    if (CONFIG.FILTER_KEYWORD) {
      filteredGroups = duplicateGroups.filter(group => {
        // Check if any question in the group contains the filter keyword
        return group.questions.some(q => 
          (q.question_text && q.question_text.toLowerCase().includes(CONFIG.FILTER_KEYWORD.toLowerCase())) ||
          (q.correct_answer && q.correct_answer.toLowerCase().includes(CONFIG.FILTER_KEYWORD.toLowerCase()))
        );
      });
      
      console.log(`\nFilter applied: ${filteredGroups.length} out of ${duplicateGroups.length} groups contain '${CONFIG.FILTER_KEYWORD}'`);
    }
    
    // Display results
    if (filteredGroups.length === 0) {
      console.log('\nNo duplicate questions found matching the filter!');
      return;
    }
    
    console.log(`\nFound ${filteredGroups.length} duplicate groups.`);
    await processDuplicatesAutomatically(filteredGroups);
    
  } catch (error) {
    console.error('Error detecting duplicates:', error);
  }
}

/**
 * Find duplicates using a hybrid approach that combines:
 * 1. Answer matching with question context validation
 * 2. Question similarity with answer verification
 * 3. Enhanced fingerprinting for distinguishing similar questions
 */
function findDuplicatesWithHybridApproach(questions) {
  console.log('\nAnalyzing questions using hybrid approach...');
  
  const duplicateGroups = [];
  const processedIds = new Set();
  
  // PHASE 1: Answer-based grouping with question validation
  console.log('Phase 1: Answer-based grouping with question validation...');
  
  // Group questions by normalized answers (but skip generic answers)
  const questionsByAnswer = {};
  questions.forEach(q => {
    if (!q.normalizedAnswer || CONFIG.SKIP_GENERIC_ANSWERS.includes(q.normalizedAnswer)) {
      return;
    }
    
    if (!questionsByAnswer[q.normalizedAnswer]) {
      questionsByAnswer[q.normalizedAnswer] = [];
    }
    questionsByAnswer[q.normalizedAnswer].push(q);
  });
  
  // For each answer group, find valid duplicates
  Object.entries(questionsByAnswer).forEach(([answer, answerQuestions]) => {
    if (answerQuestions.length > 1) {
      // For each question in this answer group
      for (let i = 0; i < answerQuestions.length; i++) {
        // Skip if this question was already processed
        if (processedIds.has(answerQuestions[i].id)) {
          continue;
        }
        
        const currentQuestion = answerQuestions[i];
        const similarQuestions = [currentQuestion];
        processedIds.add(currentQuestion.id);
        
        for (let j = i + 1; j < answerQuestions.length; j++) {
          // Skip if this question was already processed
          if (processedIds.has(answerQuestions[j].id)) {
            continue;
          }
          
          const otherQuestion = answerQuestions[j];
          
          // Skip if they have very different fingerprints
          const fingerprintSimilarity = calculateFingerprintSimilarity(
            currentQuestion.fingerprint,
            otherQuestion.fingerprint
          );
          
          if (fingerprintSimilarity < CONFIG.FINGERPRINT_DIFFERENCE_THRESHOLD) {
            continue; // Skip - they're asking about different things
          }
          
          // Skip if they have different property contexts
          if (hasDistinctPropertyContexts(
            currentQuestion.propertyContext, 
            otherQuestion.propertyContext
          )) {
            continue; // Skip - they're asking about different properties
          }
          
          // Calculate text similarity
          const stringSimilarity = calculateStringSimilarity(
            currentQuestion.question_text,
            otherQuestion.question_text
          );
          
          // For same answers, require moderate question similarity
          if (stringSimilarity > CONFIG.QUESTION_SIMILARITY_MEDIUM) {
            similarQuestions.push(otherQuestion);
            processedIds.add(otherQuestion.id);
          }
        }
        
        if (similarQuestions.length > 1) {
          duplicateGroups.push({
            type: 'answer',
            answer,
            questions: similarQuestions,
            confidence: 'high'
          });
        }
      }
    }
  });
  
  // PHASE 2: Question similarity with answer verification
  console.log('Phase 2: Question similarity with answer verification...');
  
  // For remaining unprocessed questions
  for (let i = 0; i < questions.length; i++) {
    // Skip if this question was already processed
    if (processedIds.has(questions[i].id)) continue;
    
    const currentQuestion = questions[i];
    const similarQuestions = [currentQuestion];
    processedIds.add(currentQuestion.id);
    
    for (let j = i + 1; j < questions.length; j++) {
      // Skip if this question was already processed
      if (processedIds.has(questions[j].id)) continue;
      
      const otherQuestion = questions[j];
      
      // Calculate text similarity first
      const stringSimilarity = calculateStringSimilarity(
        currentQuestion.question_text,
        otherQuestion.question_text
      );
      
      // If questions have high text similarity
      if (stringSimilarity > CONFIG.QUESTION_SIMILARITY_HIGH) {
        // Check if they have similar answers
        const answerSimilarity = currentQuestion.normalizedAnswer && otherQuestion.normalizedAnswer ?
          calculateStringSimilarity(
            currentQuestion.normalizedAnswer,
            otherQuestion.normalizedAnswer
          ) : 0;
        
        // Only group if answers are similar enough
        if (answerSimilarity > CONFIG.ANSWER_MATCH_REQUIRED) {
          similarQuestions.push(otherQuestion);
          processedIds.add(otherQuestion.id);
        }
      }
    }
    
    if (similarQuestions.length > 1) {
      duplicateGroups.push({
        type: 'text',
        questions: similarQuestions,
        confidence: 'high'
      });
    }
  }
  
  // PHASE 3: Merge groups with identical answers
  console.log('Phase 3: Merging groups with identical answers...');
  
  const mergedGroups = mergeGroupsWithSameAnswer(duplicateGroups);
  console.log(`Merged ${duplicateGroups.length} initial groups into ${mergedGroups.length} final groups`);
  
  return mergedGroups;
}

/**
 * Merge duplicate groups that have the same answer
 */
function mergeGroupsWithSameAnswer(groups) {
  // Group by normalized answer
  const groupsByAnswer = {};
  
  // First pass: organize groups by their answers
  groups.forEach(group => {
    // For answer-based groups, use the answer directly
    if (group.type === 'answer' && group.answer) {
      const normalizedAnswer = group.answer.toLowerCase().trim();
      
      if (!groupsByAnswer[normalizedAnswer]) {
        groupsByAnswer[normalizedAnswer] = [];
      }
      groupsByAnswer[normalizedAnswer].push(group);
    } 
    // For text-based groups, use the first question's answer
    else if (group.questions && group.questions.length > 0 && group.questions[0].normalizedAnswer) {
      const normalizedAnswer = group.questions[0].normalizedAnswer;
      
      if (!groupsByAnswer[normalizedAnswer]) {
        groupsByAnswer[normalizedAnswer] = [];
      }
      groupsByAnswer[normalizedAnswer].push(group);
    }
    // If no clear answer, keep the group as is (this shouldn't happen)
    else {
      if (!groupsByAnswer['__unknown__']) {
        groupsByAnswer['__unknown__'] = [];
      }
      groupsByAnswer['__unknown__'].push(group);
    }
  });
  
  // Second pass: merge groups with the same answer
  const mergedGroups = [];
  
  Object.entries(groupsByAnswer).forEach(([answer, answerGroups]) => {
    // If only one group for this answer, just add it
    if (answerGroups.length === 1) {
      mergedGroups.push(answerGroups[0]);
      return;
    }
    
    // Merge all groups with this answer
    const allQuestions = [];
    const questionIds = new Set();
    
    // Collect all questions from all groups, avoiding duplicates
    answerGroups.forEach(group => {
      group.questions.forEach(question => {
        if (!questionIds.has(question.id)) {
          allQuestions.push(question);
          questionIds.add(question.id);
        }
      });
    });
    
    // Create a new merged group
    mergedGroups.push({
      type: 'answer',
      answer: answer === '__unknown__' ? null : answer,
      questions: allQuestions,
      confidence: 'high',
      merged: true,
      originalGroupCount: answerGroups.length
    });
  });
  
  return mergedGroups;
}

/**
 * Automatically process duplicate groups and remove duplicates without user input
 */
async function processDuplicatesAutomatically(duplicateGroups) {
  console.log('\nProcessing all duplicate groups automatically:');
  
  let totalDuplicatesToRemove = 0;
  let questionsToRemove = [];
  
  // Process all groups
  for (let i = 0; i < duplicateGroups.length; i++) {
    const group = duplicateGroups[i];
    
    console.log(`\n----- Group #${i + 1} (${group.questions.length} questions) -----`);
    console.log(`Type: ${group.type === 'answer' ? 'Same Answer' : 'Similar Text'}`);
    
    if (group.merged) {
      console.log(`Combined from ${group.originalGroupCount} initial groups`);
    }
    
    if (group.type === 'answer') {
      console.log(`Answer: "${group.answer}"`);
    }
    
    // Sort by quality metrics - difficulty first, then created_at (prefer older)
    group.questions.sort((a, b) => {
      // Sort by difficulty (prefer medium, then hard, then easy)
      const difficultyOrder = { 'medium': 0, 'hard': 1, 'easy': 2, undefined: 3 };
      const diffA = difficultyOrder[a.difficulty] || 3;
      const diffB = difficultyOrder[b.difficulty] || 3;
      if (diffA !== diffB) return diffA - diffB;
      
      // If difficulty is the same, prefer older questions
      return new Date(a.created_at) - new Date(b.created_at);
    });
    
    // Log the chosen question to keep
    console.log(`\nKEEPING: ${group.questions[0].question_text}`);
    console.log(`ID: ${group.questions[0].id}`);
    console.log(`Topic: ${group.questions[0].topic || 'Unknown'} / ${group.questions[0].subtopic || 'Unknown'}`);
    console.log(`Difficulty: ${group.questions[0].difficulty || 'Unknown'}`);
    
    // Log questions to remove
    if (group.questions.length > 1) {
      console.log(`\nRemoving ${group.questions.length - 1} duplicate questions:`);
      
      // Collect IDs of questions to remove
      for (let j = 1; j < group.questions.length; j++) {
        const q = group.questions[j];
        questionsToRemove.push(q.id);
        console.log(`- ${q.question_text} (ID: ${q.id})`);
        totalDuplicatesToRemove++;
      }
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Found ${duplicateGroups.length} duplicate groups with a total of ${duplicateGroups.reduce((sum, g) => sum + g.questions.length, 0)} questions.`);
  console.log(`Keeping ${duplicateGroups.length} questions (1 per group) and removing ${totalDuplicatesToRemove} duplicates.`);
  
  // Now automatically remove the duplicates
  if (questionsToRemove.length > 0) {
    console.log(`Removing ${questionsToRemove.length} duplicate questions...`);
    
    // Remove in batches of 20 for database efficiency
    const batchSize = 20;
    for (let i = 0; i < questionsToRemove.length; i += batchSize) {
      const batch = questionsToRemove.slice(i, i + batchSize);
      const { error } = await supabase
        .from('trivia_questions')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error(`Error removing batch ${Math.floor(i/batchSize) + 1}:`, error);
      } else {
        console.log(`Removed batch ${Math.floor(i/batchSize) + 1} (${batch.length} questions).`);
      }
    }
    
    console.log(`Successfully removed ${questionsToRemove.length} duplicate questions.`);
  } else {
    console.log('No duplicate questions to remove.');
  }
}

/**
 * Generate an enhanced fingerprint for a question that captures multiple dimensions
 */
function generateEnhancedFingerprint(questionText) {
  if (!questionText) return { empty: true };
  
  const normalizedText = questionText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract question intent (what/where/when/who/etc)
  const intent = extractQuestionIntent(normalizedText);
  
  // Extract entities mentioned in the question
  const entities = extractNamedEntities(normalizedText);
  
  // Extract the property being asked about
  const propertyContext = extractPropertyContext(normalizedText);
  
  // Create a combined fingerprint
  return {
    text: normalizedText,
    intent,
    entities,
    propertyContext,
    signature: `${intent}:${entities.join('|')}:${normalizedText}` 
  };
}

/**
 * Extract the primary intent of a question
 */
function extractQuestionIntent(text) {
  const normalized = text.toLowerCase();
  
  // Basic question type detection
  if (normalized.startsWith('what')) return 'what';
  if (normalized.startsWith('which')) return 'which';
  if (normalized.startsWith('who')) return 'who';
  if (normalized.startsWith('where')) return 'where';
  if (normalized.startsWith('when')) return 'when';
  if (normalized.startsWith('why')) return 'why';
  if (normalized.startsWith('how many') || normalized.startsWith('how much')) return 'quantity';
  if (normalized.startsWith('how')) return 'how';
  
  // More specific intent patterns
  if (normalized.includes('known for') || normalized.includes('famous for')) {
    return 'known_for';
  }
  
  if (normalized.includes('invented') || normalized.includes('discovered')) {
    return 'creation';
  }
  
  // If no specific pattern is found
  return 'other';
}

/**
 * Calculate similarity between two fingerprints
 */
function calculateFingerprintSimilarity(fp1, fp2) {
  // If either fingerprint is empty, they're not similar
  if (fp1.empty || fp2.empty) return 0;
  
  // Score for intent similarity
  const intentScore = fp1.intent === fp2.intent ? 0.3 : 0;
  
  // Score for entity overlap
  let entityScore = 0;
  if (fp1.entities.length > 0 && fp2.entities.length > 0) {
    const commonEntities = fp1.entities.filter(e => fp2.entities.includes(e));
    entityScore = commonEntities.length > 0 ? 0.3 * (commonEntities.length / Math.max(fp1.entities.length, fp2.entities.length)) : 0;
  }
  
  // Score for text similarity
  const textScore = 0.4 * calculateStringSimilarity(fp1.text, fp2.text);
  
  // Combined similarity score
  return intentScore + entityScore + textScore;
}

/**
 * Extract named entities from text
 */
function extractNamedEntities(text) {
  if (!text) return [];
  
  const entities = [];
  const words = text.split(/\s+/);
  let currentEntity = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Skip first word of sentence (likely a question word)
    const isFirstWord = i === 0 || words[i-1].match(/[.!?]$/);
    
    // Look for capitalized words that aren't first in sentence
    if (word.match(/^[A-Z][a-z]+/) && !isFirstWord && word.length > 2) {
      currentEntity.push(word);
    } else if (currentEntity.length > 0) {
      entities.push(currentEntity.join(' '));
      currentEntity = [];
    }
  }
  
  // Add any remaining entity
  if (currentEntity.length > 0) {
    entities.push(currentEntity.join(' '));
  }
  
  // Also extract quoted entities
  const quoteRegex = /'([^']+)'|"([^"]+)"|'([^']+)'|"([^"]+)"/g;
  let match;
  
  while ((match = quoteRegex.exec(text)) !== null) {
    const entity = match[1] || match[2] || match[3] || match[4];
    if (entity && entity.length > 2) {
      entities.push(entity);
    }
  }
  
  return [...new Set(entities)]; // Remove duplicates
}

/**
 * Extract property context - what aspect of an entity the question is about
 */
function extractPropertyContext(text) {
  if (!text) return { properties: [] };
  
  const normalized = text.toLowerCase();
  
  // Property patterns
  const propertyPatterns = [
    { pattern: /known for ([^.?!]+)/i, type: 'known_for' },
    { pattern: /famous for ([^.?!]+)/i, type: 'known_for' },
    { pattern: /painted ([^.?!]+)/i, type: 'creation' },
    { pattern: /wrote ([^.?!]+)/i, type: 'creation' },
    { pattern: /directed ([^.?!]+)/i, type: 'creation' },
    { pattern: /composed ([^.?!]+)/i, type: 'creation' },
    { pattern: /discovered ([^.?!]+)/i, type: 'discovery' },
    { pattern: /invented ([^.?!]+)/i, type: 'invention' },
    { pattern: /founded ([^.?!]+)/i, type: 'foundation' },
    { pattern: /built ([^.?!]+)/i, type: 'construction' },
    { pattern: /played ([^.?!]+)/i, type: 'role' },
    { pattern: /starred in ([^.?!]+)/i, type: 'appearance' },
    { pattern: /appeared in ([^.?!]+)/i, type: 'appearance' },
    { pattern: /published ([^.?!]+)/i, type: 'publication' },
    { pattern: /created ([^.?!]+)/i, type: 'creation' },
    { pattern: /located in ([^.?!]+)/i, type: 'location' },
    { pattern: /lived in ([^.?!]+)/i, type: 'residence' },
    { pattern: /born in ([^.?!]+)/i, type: 'birth' },
    { pattern: /died in ([^.?!]+)/i, type: 'death' }
  ];
  
  const properties = [];
  
  // Extract properties based on patterns
  propertyPatterns.forEach(({ pattern, type }) => {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      properties.push({
        type,
        value: match[1].trim(),
        position: match.index
      });
    }
  });
  
  // Look for cut-off ear specific to van Gogh example
  if (normalized.includes('ear') && 
      (normalized.includes('cut') || normalized.includes('cutting') || normalized.includes('severed'))) {
    properties.push({
      type: 'physical_act',
      value: 'cut ear',
      position: normalized.indexOf('ear')
    });
  }
  
  // Return the context with properties and surrounding text
  return {
    properties,
    hasProperties: properties.length > 0
  };
}

/**
 * Determine if two property contexts are distinctly different
 */
function hasDistinctPropertyContexts(context1, context2) {
  // If either context doesn't have properties, they're not distinctly different
  if (!context1?.hasProperties || !context2?.hasProperties) {
    return false;
  }
  
  // If they have different types of properties, they're different
  const types1 = new Set(context1.properties.map(p => p.type));
  const types2 = new Set(context2.properties.map(p => p.type));
  
  // Check if there's any overlap in property types
  const hasCommonType = [...types1].some(type => types2.has(type));
  
  if (!hasCommonType) {
    return true; // No common property types, they're different
  }
  
  // For each common type, check if values are similar
  for (const type of types1) {
    if (types2.has(type)) {
      const values1 = context1.properties.filter(p => p.type === type).map(p => p.value);
      const values2 = context2.properties.filter(p => p.type === type).map(p => p.value);
      
      // Check if there's any similarity between values of the same type
      let anySimilarValues = false;
      
      for (const v1 of values1) {
        for (const v2 of values2) {
          const similarity = calculateStringSimilarity(v1, v2);
          if (similarity > 0.5) {
            anySimilarValues = true;
            break;
          }
        }
        if (anySimilarValues) break;
      }
      
      if (!anySimilarValues) {
        return true; // Same property type but different values
      }
    }
  }
  
  return false; // Property contexts are similar
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Normalize strings
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();
  
  // Quick check for exact match
  if (a === b) return 1;
  
  // Calculate Levenshtein distance
  const matrix = [];
  
  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) === a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1, // substitution
          matrix[i][j-1] + 1,   // insertion
          matrix[i-1][j] + 1    // deletion
        );
      }
    }
  }
  
  // Convert distance to similarity score between 0 and 1
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1; // Both strings are empty
  
  return 1 - matrix[b.length][a.length] / maxLen;
}

/**
 * Get words that differ between two texts
 */
function getDifferingWords(text1, text2) {
  if (!text1 || !text2) return [];
  
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  // Find words in text2 that aren't in text1
  return [...words2].filter(word => !words1.has(word));
}

// Run the duplicate remover
removeDuplicateQuestions(); 