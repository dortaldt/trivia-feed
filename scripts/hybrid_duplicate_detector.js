/**
 * Hybrid Duplicate Detector for Trivia Questions
 * 
 * This script implements a hybrid approach to detect duplicate trivia questions:
 * 1. Question text similarity
 * 2. Answer matching
 * 3. Enhanced fingerprinting to identify truly different questions even when answers match
 * 
 * It shows potential duplicates in an interactive format, allowing users to selectively
 * remove or keep questions based on context.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Supabase credentials 
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vdrmtsifivvpioonpqqc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcm10c2lmaXZ2cGlvb25wcXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNDQyMzIsImV4cCI6MjA2MTkyMDIzMn0.OtAUoIz1ZCCE5IncVvpHnDGrTXEQy_JoyvNE0QQf6wA";

console.log("Using Supabase URL:", SUPABASE_URL);

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
 * Main function to detect duplicate questions
 */
async function detectDuplicateQuestions() {
  try {
    console.log('Fetching trivia questions from the database...');
    
    // Check if filter is applied
    if (CONFIG.FILTER_KEYWORD) {
      console.log(`FILTER APPLIED: Only showing groups containing '${CONFIG.FILTER_KEYWORD}'`);
    }
    
    // First, get the total count of questions
    const { count: totalCount, error: countError } = await supabase
      .from('trivia_questions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting question count:', countError);
      process.exit(1);
    }
    
    console.log(`Total questions in database: ${totalCount}`);
    
    // Fetch all questions in batches to overcome Supabase limits
    const batchSize = 1000; // Supabase's default limit
    const allQuestions = [];
    let offset = 0;
    
    while (offset < totalCount) {
      console.log(`Fetching batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(totalCount / batchSize)} (${offset + 1}-${Math.min(offset + batchSize, totalCount)} of ${totalCount})...`);
      
      const { data: batchQuestions, error: batchError } = await supabase
        .from('trivia_questions')
        .select('id, question_text, answer_choices, correct_answer, topic, subtopic, tags, difficulty, language, created_at')
        .order('created_at', { ascending: true })
        .range(offset, offset + batchSize - 1);
      
      if (batchError) {
        console.error(`Error fetching batch at offset ${offset}:`, batchError);
        process.exit(1);
      }
      
      if (!batchQuestions || batchQuestions.length === 0) {
        console.log(`No more questions found at offset ${offset}`);
        break;
      }
      
      allQuestions.push(...batchQuestions);
      offset += batchSize;
      
      // Add a small delay between batches to be nice to the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Successfully fetched ${allQuestions.length} questions total.`);
    
    if (allQuestions.length === 0) {
      console.log('No questions found in the database.');
      return;
    }
    
    // If filter is "amazon", show a count of how many amazon questions exist
    if (CONFIG.FILTER_KEYWORD.toLowerCase() === 'amazon') {
      const amazonQuestions = allQuestions.filter(q => 
        (q.question_text && q.question_text.toLowerCase().includes('amazon')) ||
        (q.correct_answer && q.correct_answer.toLowerCase().includes('amazon'))
      );
      
      console.log(`\nFound ${amazonQuestions.length} questions containing 'amazon' in question or answer`);
    }
    
    // Preprocess questions with enhanced metadata
    console.log('Preprocessing questions with enhanced metadata...');
    const processedQuestions = allQuestions.map(q => ({
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
      rl.close();
      return;
    }
    
    console.log(`\nFound ${filteredGroups.length} potential duplicate groups.`);
    await displayAndProcessDuplicates(filteredGroups);
    
  } catch (error) {
    console.error('Error detecting duplicates:', error);
  } finally {
    rl.close();
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
 * Display duplicate groups and ask user what to do with each
 */
async function displayAndProcessDuplicates(duplicateGroups) {
  console.log('\nDisplaying all potential duplicate groups:');
  
  let totalDuplicatesToRemove = 0;
  
  // Display all groups at once
  for (let i = 0; i < duplicateGroups.length; i++) {
    const group = duplicateGroups[i];
    
    console.log(`\n----- Group #${i + 1} (${group.questions.length} questions) -----`);
    console.log(`Type: ${group.type === 'answer' ? 'Same Answer' : 'Similar Text'}`);
    console.log(`Confidence: ${group.confidence}`);
    
    if (group.merged) {
      console.log(`⚡ Merged from ${group.originalGroupCount} initial groups`);
    }
    
    if (group.type === 'answer') {
      console.log(`Answer: "${group.answer}"`);
      
      // Highlight if this group matches the filter
      if (CONFIG.FILTER_KEYWORD && group.answer.toLowerCase().includes(CONFIG.FILTER_KEYWORD.toLowerCase())) {
        console.log(`🔍 FILTER MATCH: Answer contains '${CONFIG.FILTER_KEYWORD}'`);
      }
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
    
    // Mark the first question in each group as the one to keep
    group.questions[0].keep = true;
    totalDuplicatesToRemove += group.questions.length - 1;
    
    // Display questions
    group.questions.forEach((q, index) => {
      console.log(`\n  [${index + 1}] ID: ${q.id} ${q.keep ? '(KEEPING)' : '(REMOVING)'}`);
      console.log(`      Text: ${q.question_text}`);
      console.log(`      Answer: ${q.correct_answer || 'Unknown'}`);
      console.log(`      Topic: ${q.topic || 'Unknown'} / ${q.subtopic || 'Unknown'}`);
      console.log(`      Difficulty: ${q.difficulty || 'Unknown'}`);
      console.log(`      Created: ${q.created_at ? new Date(q.created_at).toLocaleString() : 'Unknown'}`);
      
      // Highlight key differences
      if (index > 0) {
        // Show different entities
        const mainEntities = new Set(group.questions[0].entities);
        const thisEntities = new Set(q.entities);
        const uniqueEntities = [...thisEntities].filter(e => !mainEntities.has(e));
        
        if (uniqueEntities.length > 0) {
          console.log(`      Different entities: ${uniqueEntities.join(', ')}`);
        }
        
        // Show property context differences
        if (hasDistinctPropertyContexts(group.questions[0].propertyContext, q.propertyContext)) {
          console.log(`      Different properties mentioned`);
        }
        
        // Show different question words
        const questionDiff = getDifferingWords(
          group.questions[0].question_text,
          q.question_text
        );
        
        if (questionDiff.length > 0) {
          console.log(`      Unique words: ${questionDiff.join(', ')}`);
        }
        
        if (q.correct_answer !== group.questions[0].correct_answer) {
          console.log(`      ⚠️ DIFFERENT ANSWER from question to keep`);
        }
      }
    });
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Found ${duplicateGroups.length} duplicate groups with a total of ${duplicateGroups.reduce((sum, g) => sum + g.questions.length, 0)} questions.`);
  console.log(`Will keep ${duplicateGroups.length} questions (1 per group) and remove ${totalDuplicatesToRemove} duplicates.`);
  
  // Ask if user wants to proceed with removing duplicates
  const confirmRemove = await new Promise(resolve => {
    rl.question(`\nDo you want to proceed with removing the duplicates? (yes/no): `, answer => {
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
  
  if (confirmRemove) {
    const questionsToRemove = [];
    
    // Collect all questions marked for removal
    duplicateGroups.forEach(group => {
      for (let i = 1; i < group.questions.length; i++) {
        questionsToRemove.push(group.questions[i].id);
      }
    });
    
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
        console.error(`Error removing batch ${i/batchSize + 1}:`, error);
      } else {
        console.log(`Removed batch ${i/batchSize + 1} (${batch.length} questions).`);
      }
    }
    
    console.log(`Successfully removed ${questionsToRemove.length} duplicate questions.`);
  } else {
    console.log('Operation cancelled. No questions were removed.');
  }
}

/**
 * Generate an enhanced fingerprint for a question that captures multiple dimensions
 */
function generateEnhancedFingerprint(questionText) {
  if (!questionText) return { empty: true };
  
  const text = questionText.toLowerCase();
  
  // Extract "known for", "famous for" patterns 
  const knownForPattern = /(known|famous|recognized|remembered|celebrated)\s+(for|as)/i;
  const knownForMatch = text.match(knownForPattern);
  
  // Extract quoted entities (like 'Starry Night')
  const quotedEntities = [];
  const quoteRegex = /'([^']+)'|"([^"]+)"|'([^']+)'|"([^"]+)"/g;
  let match;
  
  while ((match = quoteRegex.exec(text)) !== null) {
    const entity = match[1] || match[2] || match[3] || match[4];
    if (entity && entity.length > 2) {
      quotedEntities.push(entity.toLowerCase());
    }
  }
  
  // Identify question structure
  const questionWords = text.match(/\b(what|which|who|whose|whom|where|when|why|how)\b/gi) || [];
  
  // Extract property words (paint, write, direct, compose, etc.)
  const propertyWords = [
    'paint', 'write', 'direct', 'compose', 'discover', 'invent', 'create',
    'design', 'develop', 'found', 'establish', 'sign', 'build', 'construct',
    'publish', 'produce', 'act', 'star', 'appear', 'perform', 'play', 'sing',
    'cutting', 'cut', 'ear', 'self-portrait', 'portrait', 'scene', 'role',
    'character', 'directed', 'wrote', 'invented', 'created', 'designed', 
    'founded', 'built', 'discovered', 'explored', 'journey', 'achievement'
  ];
  
  const foundPropertyWords = propertyWords.filter(word => text.includes(word));
  
  // Detect subjective vs objective question patterns
  const isSubjective = /\b(best|greatest|most important|worst|famous|popular|significant)\b/i.test(text);
  
  // Detect temporal indicators
  const hasTemporal = /\b(year|date|when|century|decade|period|era|age|time)\b/i.test(text);
  
  // Detect spatial indicators
  const hasSpatial = /\b(where|location|place|country|city|region|area|territory)\b/i.test(text);
  
  // Detect numerical indicators
  const hasNumerical = /\b(how many|how much|number|amount|count|total|percentage)\b/i.test(text);
  
  // Extract specific art/creation types
  const creationTypes = [
    'novel', 'book', 'poem', 'play', 'movie', 'film', 'song', 'album',
    'painting', 'sculpture', 'building', 'structure', 'invention', 'theory',
    'discovery', 'symphony', 'composition', 'artwork', 'masterpiece'
  ];
  
  const mentionedCreations = creationTypes.filter(word => text.includes(word));
  
  return {
    questionWords: questionWords.map(w => w.toLowerCase()),
    hasKnownFor: !!knownForMatch,
    knownForPosition: knownForMatch ? knownForMatch.index : -1,
    quotedEntities,
    propertyWords: foundPropertyWords,
    isSubjective,
    hasTemporal,
    hasSpatial,
    hasNumerical,
    mentionedCreations
  };
}

/**
 * Calculate similarity between question fingerprints
 */
function calculateFingerprintSimilarity(fp1, fp2) {
  if (!fp1 || !fp2 || fp1.empty || fp2.empty) return 0;
  
  let score = 0;
  let totalFactors = 0;
  
  // Compare question words
  if (fp1.questionWords && fp2.questionWords) {
    const allWords = [...new Set([...fp1.questionWords, ...fp2.questionWords])];
    const commonWords = fp1.questionWords.filter(w => fp2.questionWords.includes(w));
    
    if (allWords.length > 0) {
      const similarity = commonWords.length / allWords.length;
      score += similarity;
      totalFactors++;
    }
  }
  
  // Compare "known for" patterns
  if (fp1.hasKnownFor || fp2.hasKnownFor) {
    if (fp1.hasKnownFor && fp2.hasKnownFor) {
      // If both have "known for" but at different positions, likely different properties
      const positionDiff = Math.abs(fp1.knownForPosition - fp2.knownForPosition);
      if (positionDiff < 15) {
        score += 1; // Same position, likely similar questions
      } else {
        score += 0.3; // Different positions, might be asking about different things
      }
    } else {
      score += 0.2; // One has "known for" but the other doesn't - quite different
    }
    totalFactors++;
  }
  
  // Compare quoted entities
  if (fp1.quotedEntities.length > 0 || fp2.quotedEntities.length > 0) {
    const allEntities = [...new Set([...fp1.quotedEntities, ...fp2.quotedEntities])];
    const commonEntities = fp1.quotedEntities.filter(e => fp2.quotedEntities.includes(e));
    
    if (allEntities.length > 0) {
      const entitySimilarity = commonEntities.length / allEntities.length;
      score += entitySimilarity;
      totalFactors++;
    }
  }
  
  // Compare property words
  if (fp1.propertyWords.length > 0 || fp2.propertyWords.length > 0) {
    const allProperties = [...new Set([...fp1.propertyWords, ...fp2.propertyWords])];
    const commonProperties = fp1.propertyWords.filter(p => fp2.propertyWords.includes(p));
    
    if (allProperties.length > 0) {
      const propertySimilarity = commonProperties.length / allProperties.length;
      score += propertySimilarity;
      totalFactors++;
    }
  }
  
  // Compare creation types
  if (fp1.mentionedCreations && fp2.mentionedCreations && 
      (fp1.mentionedCreations.length > 0 || fp2.mentionedCreations.length > 0)) {
    const allCreations = [...new Set([...fp1.mentionedCreations, ...fp2.mentionedCreations])];
    const commonCreations = fp1.mentionedCreations.filter(c => fp2.mentionedCreations.includes(c));
    
    if (allCreations.length > 0) {
      const creationSimilarity = commonCreations.length / allCreations.length;
      score += creationSimilarity;
      totalFactors++;
    }
  }
  
  // Compare subjective/objective patterns
  if (fp1.isSubjective !== undefined && fp2.isSubjective !== undefined) {
    score += (fp1.isSubjective === fp2.isSubjective) ? 1 : 0.3;
    totalFactors++;
  }
  
  // Compare temporal indicators
  if (fp1.hasTemporal !== undefined && fp2.hasTemporal !== undefined) {
    score += (fp1.hasTemporal === fp2.hasTemporal) ? 1 : 0.3;
    totalFactors++;
  }
  
  // Compare spatial indicators
  if (fp1.hasSpatial !== undefined && fp2.hasSpatial !== undefined) {
    score += (fp1.hasSpatial === fp2.hasSpatial) ? 1 : 0.3;
    totalFactors++;
  }
  
  // Compare numerical indicators
  if (fp1.hasNumerical !== undefined && fp2.hasNumerical !== undefined) {
    score += (fp1.hasNumerical === fp2.hasNumerical) ? 1 : 0.3;
    totalFactors++;
  }
  
  return totalFactors > 0 ? score / totalFactors : 0.5;
}

/**
 * Extract named entities from question text
 */
function extractNamedEntities(text) {
  if (!text) return [];
  
  const entities = [];
  const normalized = text.toLowerCase();
  
  // Simple named entity extraction using capitalization
  const words = text.split(/\s+/);
  let currentEntity = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Skip first word of sentence and common words even if capitalized
    const isFirstWord = i === 0 || words[i-1].match(/[.!?]$/);
    const isCommonWord = /^(The|A|An|In|On|Of|For|And|But|Or|Not|Is|Are|Was|Were|Be|Been|Being)$/i.test(word);
    
    if (word.match(/^[A-Z][a-z]+/) && !isFirstWord && !isCommonWord) {
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

// Run the duplicate detector
detectDuplicateQuestions(); 