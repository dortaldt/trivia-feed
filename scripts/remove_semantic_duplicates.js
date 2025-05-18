/**
 * Find semantic duplicate questions in the database and remove duplicates, keeping one from each group
 * This script uses multiple strategies to identify potential duplicates:
 * 1. Answer-based grouping with question context validation
 * 2. Question similarity detection with answer verification
 * 3. Content fingerprinting to distinguish between similar questions
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Supabase credentials (hardcoded for test/demo purposes)
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

/**
 * Find duplicates and remove all but one from each group
 */
async function removeSemanticDuplicates() {
  try {
    console.log('Checking for semantically similar questions in the database...');
    
    // Get all questions with their answers and metadata
    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('id, question_text, answer_choices, correct_answer, topic, subtopic, tags, difficulty, language, created_at')
      .order('created_at', { ascending: true }); // Order by creation date to keep the oldest question
    
    if (error) {
      console.error('Error fetching questions:', error);
      process.exit(1);
    }
    
    if (!questions || questions.length === 0) {
      console.log('No questions found in the database.');
      return;
    }
    
    console.log(`Found ${questions.length} questions to check...`);
    
    // Preprocess questions with fingerprints and keywords
    const processedQuestions = questions.map(q => ({
      ...q,
      fingerprint: generateQuestionFingerprint(q.question_text),
      keywords: extractKeywords(q.question_text),
      questionIntent: extractQuestionIntent(q.question_text),
      normalizedAnswer: q.correct_answer ? q.correct_answer.toLowerCase().trim() : ''
    }));
    
    // Track duplicates
    const duplicateGroups = [];
    const processedIds = new Set();
    
    // STRATEGY 1: Find answer-based duplicates that also have similar questions
    console.log('\nChecking for answer-based duplicates with question context validation...');
    
    // Group questions by normalized answers
    const questionsByAnswer = {};
    processedQuestions.forEach(q => {
      if (!q.normalizedAnswer) return;
      
      // Skip very generic answers that would create false positives
      if (["true", "false", "yes", "no", "0", "1", "2", "3", "4", "5", 
           "6", "7", "8", "9", "10", "unknown", "none"].includes(q.normalizedAnswer)) {
        return;
      }
      
      if (!questionsByAnswer[q.normalizedAnswer]) {
        questionsByAnswer[q.normalizedAnswer] = [];
      }
      questionsByAnswer[q.normalizedAnswer].push(q);
    });
    
    // Process each answer group
    Object.entries(questionsByAnswer).forEach(([answer, answerQuestions]) => {
      if (answerQuestions.length > 1) {
        // For each question in this answer group
        for (let i = 0; i < answerQuestions.length; i++) {
          // Skip if this question was already processed
          if (processedIds.has(answerQuestions[i].id)) continue;
          
          const currentQuestion = answerQuestions[i];
          const similarQuestions = [currentQuestion];
          processedIds.add(currentQuestion.id);
          
          for (let j = i + 1; j < answerQuestions.length; j++) {
            // Skip if this question was already processed
            if (processedIds.has(answerQuestions[j].id)) continue;
            
            const otherQuestion = answerQuestions[j];
            
            // First check if they have same intent - questions asking about
            // different aspects of the same entity are not duplicates
            if (currentQuestion.questionIntent !== otherQuestion.questionIntent) {
              // Different question intent - now check if they're asking about different properties
              if (askingDifferentProperties(currentQuestion.question_text, otherQuestion.question_text)) {
                continue; // Skip - they're asking about different things
              }
            }
            
            // Calculate text similarity
            const stringSimilarity = calculateStringSimilarity(
              currentQuestion.question_text,
              otherQuestion.question_text
            );
            
            // If fingerprints are too different, they're not duplicates
            // even with the same answer (e.g., "Who painted Starry Night" vs "Who cut off his ear")
            const fingerprintSimilarity = calculateFingerprintSimilarity(
              currentQuestion.fingerprint,
              otherQuestion.fingerprint
            );
            
            // For same answers, require moderate text similarity AND fingerprint similarity
            if (stringSimilarity > 0.65 && fingerprintSimilarity > 0.5) {
              similarQuestions.push(otherQuestion);
              processedIds.add(otherQuestion.id);
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
    
    // STRATEGY 2: Find question-similarity duplicates and verify answer consistency
    console.log('Checking for question-similarity duplicates with answer verification...');
    
    // For remaining unprocessed questions
    for (let i = 0; i < processedQuestions.length; i++) {
      // Skip if this question was already processed
      if (processedIds.has(processedQuestions[i].id)) continue;
      
      const currentQuestion = processedQuestions[i];
      const similarQuestions = [currentQuestion];
      processedIds.add(currentQuestion.id);
      
      for (let j = i + 1; j < processedQuestions.length; j++) {
        // Skip if this question was already processed
        if (processedIds.has(processedQuestions[j].id)) continue;
        
        const otherQuestion = processedQuestions[j];
        
        // Calculate text similarity first
        const stringSimilarity = calculateStringSimilarity(
          currentQuestion.question_text,
          otherQuestion.question_text
        );
        
        // If questions have high text similarity, check answers
        if (stringSimilarity > 0.8) {
          // Check answer similarity
          const answerSimilarity = calculateStringSimilarity(
            currentQuestion.normalizedAnswer,
            otherQuestion.normalizedAnswer
          );
          
          // Accept as duplicates if:
          // 1. Questions are very similar (>0.8)
          // 2. AND either answers are the same OR answers are very similar (>0.7)
          if (answerSimilarity > 0.7) {
            similarQuestions.push(otherQuestion);
            processedIds.add(otherQuestion.id);
          }
        }
      }
      
      if (similarQuestions.length > 1) {
        duplicateGroups.push({
          type: 'text',
          questions: similarQuestions
        });
      }
    }
    
    // Display results
    if (duplicateGroups.length === 0) {
      console.log('\nNo semantic duplicates found!');
      rl.close();
      return;
    }
    
    console.log('\nFound potential semantic duplicate questions:');
    
    let totalDuplicateGroups = 0;
    let totalDuplicateQuestions = 0;
    let totalQuestionsToRemove = 0;
    
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      totalDuplicateGroups++;
      totalDuplicateQuestions += group.questions.length;
      totalQuestionsToRemove += group.questions.length - 1; // All except the first one
      
      console.log(`\n----- Duplicate Group #${totalDuplicateGroups} (${group.questions.length} questions) -----`);
      console.log(`Type: ${group.type === 'answer' ? 'Same Answer' : 'Similar Text'}`);
      if (group.type === 'answer') {
        console.log(`Answer: "${group.answer}"`);
      }
      
      // Check for different answers in the group
      const hasDifferentAnswers = new Set(group.questions.map(q => q.correct_answer)).size > 1;
      if (hasDifferentAnswers) {
        console.log(`⚠️ WARNING: This group contains questions with different answers`);
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
      
      // Mark the question to keep
      group.questions[0].keep = true;
      
      group.questions.forEach((q, index) => {
        console.log(`\n  [${index + 1}] ID: ${q.id} ${q.keep ? '(KEEPING)' : '(REMOVING)'}`);
        console.log(`      Text: ${q.question_text}`);
        console.log(`      Answer: ${q.correct_answer || 'Unknown'}`);
        console.log(`      Topic: ${q.topic || 'Unknown'}`);
        console.log(`      Subtopic: ${q.subtopic || 'Unknown'}`);
        console.log(`      Difficulty: ${q.difficulty || 'Unknown'}`);
        console.log(`      Created: ${q.created_at ? new Date(q.created_at).toLocaleString() : 'Unknown'}`);
        
        // Display differing words for better comparison
        if (index > 0 && group.questions[0].question_text) {
          const mainQuestion = group.questions[0].question_text.toLowerCase();
          const thisQuestion = q.question_text.toLowerCase();
          // Simple word difference highlight
          const mainWords = new Set(mainQuestion.split(/\s+/).filter(w => w.length > 2));
          const thisWords = new Set(thisQuestion.split(/\s+/).filter(w => w.length > 2));
          const uniqueWords = [...thisWords].filter(w => !mainWords.has(w));
          if (uniqueWords.length > 0) {
            console.log(`      Unique words: ${uniqueWords.join(', ')}`);
          }
          
          if (q.correct_answer !== group.questions[0].correct_answer) {
            console.log(`      ⚠️ DIFFERENT ANSWER from question to keep`);
          }
        }
      });
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Found ${totalDuplicateGroups} duplicate groups with a total of ${totalDuplicateQuestions} questions.`);
    console.log(`Will keep ${totalDuplicateGroups} questions (1 per group) and remove ${totalQuestionsToRemove} duplicates.`);
    
    // Identify groups with different answers
    const groupsWithDifferentAnswers = duplicateGroups.filter(group => 
      new Set(group.questions.map(q => q.correct_answer)).size > 1
    );
    
    if (groupsWithDifferentAnswers.length > 0) {
      console.log(`\n⚠️ IMPORTANT: ${groupsWithDifferentAnswers.length} groups have questions with different answers.`);
      console.log(`These might be false positives that shouldn't be merged.`);
    }
    
    // Ask for confirmation before deletion
    console.log('\nOptions:');
    console.log('1. Remove all duplicates');
    console.log('2. Remove only duplicates with identical answers (safer option)');
    console.log('3. Review each group individually');
    console.log('4. Cancel and exit');
    
    rl.question('\nChoose an option (1-4): ', async (answer) => {
      if (answer === '4') {
        console.log('Operation cancelled. No questions were removed.');
        rl.close();
        return;
      }
      
      let idsToRemove = [];
      
      if (answer === '1') {
        // Remove all duplicates
        duplicateGroups.forEach(group => {
          // Skip the first question in each group (the one to keep)
          for (let i = 1; i < group.questions.length; i++) {
            idsToRemove.push(group.questions[i].id);
          }
        });
        
        console.log(`\nWill remove all ${idsToRemove.length} duplicate questions.`);
      } 
      else if (answer === '2') {
        // Remove only duplicates with identical answers
        duplicateGroups.forEach(group => {
          const answers = new Set(group.questions.map(q => q.correct_answer));
          if (answers.size === 1) {
            // Only one unique answer in this group, safe to merge
            for (let i = 1; i < group.questions.length; i++) {
              idsToRemove.push(group.questions[i].id);
            }
          }
        });
        
        const safeGroupCount = duplicateGroups.length - groupsWithDifferentAnswers.length;
        console.log(`\nWill remove ${idsToRemove.length} duplicate questions from ${safeGroupCount} safe groups.`);
        console.log(`Skipping ${groupsWithDifferentAnswers.length} groups with different answers.`);
      }
      else if (answer === '3') {
        // Review each group individually
        console.log('\nStarting individual review of each duplicate group:');
        
        for (let i = 0; i < duplicateGroups.length; i++) {
          const group = duplicateGroups[i];
          console.log(`\n----- Group ${i+1}/${duplicateGroups.length} -----`);
          console.log(`Type: ${group.type === 'answer' ? 'Same Answer' : 'Similar Text'}`);
          if (group.type === 'answer') {
            console.log(`Answer: "${group.answer}"`);
          }
          
          // Check for different answers
          const hasDifferentAnswers = new Set(group.questions.map(q => q.correct_answer)).size > 1;
          if (hasDifferentAnswers) {
            console.log(`⚠️ WARNING: This group has questions with different answers`);
          }
          
          // Display the questions in the group
          for (let j = 0; j < group.questions.length; j++) {
            const q = group.questions[j];
            console.log(`\n  [${j + 1}] ${j === 0 ? '(KEEPING)' : '(TO REMOVE)'}`);
            console.log(`      ${q.question_text}`);
            console.log(`      Answer: ${q.correct_answer || 'Unknown'}`);
          }
          
          const confirmPromise = new Promise(resolve => {
            rl.question('\nRemove duplicates from this group? (yes/no/all/skip): ', response => {
              resolve(response.toLowerCase());
            });
          });
          
          const response = await confirmPromise;
          
          if (response === 'all') {
            // Add all remaining groups
            for (let k = i; k < duplicateGroups.length; k++) {
              const remainingGroup = duplicateGroups[k];
              for (let j = 1; j < remainingGroup.questions.length; j++) {
                idsToRemove.push(remainingGroup.questions[j].id);
              }
            }
            break;
          } 
          else if (response === 'skip') {
            // Skip this group but continue with others
            continue;
          }
          else if (response === 'yes' || response === 'y') {
            // Add this group's duplicates
            for (let j = 1; j < group.questions.length; j++) {
              idsToRemove.push(group.questions[j].id);
            }
          }
          // For 'no', we don't add anything to idsToRemove
        }
        
        console.log(`\nWill remove ${idsToRemove.length} questions after individual review.`);
      }
      else {
        console.log('Invalid option. Operation cancelled.');
        rl.close();
        return;
      }
      
      if (idsToRemove.length === 0) {
        console.log('No questions selected for removal. Exiting.');
        rl.close();
        return;
      }
      
      // Final confirmation
      rl.question(`\nConfirm removal of ${idsToRemove.length} questions? (yes/no): `, async (finalConfirm) => {
        if (finalConfirm.toLowerCase() === 'yes' || finalConfirm.toLowerCase() === 'y') {
          console.log('\nRemoving duplicates...');
          
          // Remove questions in batches to avoid hitting API limits
          const batchSize = 10;
          let removedCount = 0;
          
          for (let i = 0; i < idsToRemove.length; i += batchSize) {
            const batch = idsToRemove.slice(i, i + batchSize);
            
            try {
              const { error } = await supabase
                .from('trivia_questions')
                .delete()
                .in('id', batch);
              
              if (error) {
                console.error(`Error removing batch ${i/batchSize + 1}:`, error);
              } else {
                removedCount += batch.length;
                console.log(`Progress: ${removedCount}/${idsToRemove.length} questions removed`);
              }
            } catch (error) {
              console.error(`Unexpected error in batch ${i/batchSize + 1}:`, error);
            }
            
            // Small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          console.log(`\nDuplicate removal complete. Removed ${removedCount} duplicate questions.`);
        } else {
          console.log('Operation cancelled. No questions were removed.');
        }
        
        rl.close();
      });
    });
    
  } catch (error) {
    console.error('Error processing duplicates:', error);
    rl.close();
    process.exit(1);
  }
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
 * Generate a fingerprint of a question that captures its essence
 * This helps identify when two questions are asking about different properties
 */
function generateQuestionFingerprint(questionText) {
  if (!questionText) return [];
  
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
  
  // Extract property words (paint, write, direct, compose, etc.)
  const propertyWords = [
    'paint', 'write', 'direct', 'compose', 'discover', 'invent', 'create',
    'design', 'develop', 'found', 'establish', 'sign', 'build', 'construct',
    'cutting', 'ear', 'self-portrait', 'portrait', 'actor', 'actress', 'scientist', 
    'author', 'musician', 'artist', 'director', 'producer', 'inventor'
  ];
  
  const foundPropertyWords = propertyWords.filter(word => text.includes(word));
  
  // Create fingerprint as a combination of all these elements
  return {
    hasKnownFor: !!knownForMatch,
    knownForPosition: knownForMatch ? knownForMatch.index : -1,
    quotedEntities,
    propertyWords: foundPropertyWords
  };
}

/**
 * Calculate similarity between two question fingerprints
 */
function calculateFingerprintSimilarity(fp1, fp2) {
  if (!fp1 || !fp2) return 0;
  
  let score = 0;
  let totalFactors = 0;
  
  // Compare "known for" patterns
  if (fp1.hasKnownFor && fp2.hasKnownFor) {
    // If both have "known for" but at different positions, likely different properties
    const positionDiff = Math.abs(fp1.knownForPosition - fp2.knownForPosition);
    if (positionDiff < 10) {
      score += 1; // Same position, likely similar questions
    } else {
      score += 0.3; // Different positions, might be asking about different things
    }
    totalFactors++;
  } else if (fp1.hasKnownFor !== fp2.hasKnownFor) {
    // One has "known for" but the other doesn't
    score += 0.2; // Quite different
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
  
  return totalFactors > 0 ? score / totalFactors : 0.5;
}

/**
 * Extract the primary intent of a question - what type of information it's asking for
 */
function extractQuestionIntent(question) {
  if (!question) return 'unknown';
  
  const text = question.toLowerCase();
  
  // Check for specific question types based on question words and patterns
  
  // Questions asking for dates/years
  if ((text.includes('year') || text.includes('date') || text.includes('when')) && 
       /\b(occur|happened|established|founded|created|built|launched|released|started)\b/.test(text)) {
    return 'year_or_date';
  }
  
  // Questions asking for places/locations
  if ((text.includes('where') || text.includes('location') || text.includes('place')) ||
      (text.includes('which') && 
       (text.includes('country') || text.includes('city') || text.includes('continent') || 
        text.includes('region') || text.includes('located')))) {
    return 'location';
  }
  
  // Questions asking about people
  if (text.includes('who') || 
      (text.includes('which') && (text.includes('person') || text.includes('individual') || 
                                 text.includes('actor') || text.includes('actress') || 
                                 text.includes('scientist') || text.includes('artist')))) {
    return 'person';
  }
  
  // Questions asking for quantities or measurements
  if ((text.includes('how many') || text.includes('how much')) || 
      (text.includes('number of') || text.includes('amount of') || 
       text.includes('percentage') || text.includes('proportion'))) {
    return 'quantity';
  }
  
  // Questions asking about reasons
  if (text.includes('why') || text.includes('reason')) {
    return 'reason';
  }
  
  // Questions asking about processes
  if (text.includes('how does') || text.includes('how do') || 
      text.includes('process') || text.includes('mechanism')) {
    return 'process';
  }
  
  // Questions asking for definitions or characteristics
  if ((text.includes('what is') || text.includes('what are')) && 
      (text.includes('defined') || text.includes('definition') || 
       text.includes('characterized') || text.includes('term'))) {
    return 'definition';
  }
  
  // Questions asking about characteristics or features
  if (text.includes('characteristic') || text.includes('feature') || 
      text.includes('property') || text.includes('attribute') ||
      text.includes('adaptation') || text.includes('trait')) {
    return 'characteristic';
  }
  
  // Questions asking for examples or instances
  if (text.includes('example') || text.includes('instance')) {
    return 'example';
  }
  
  // Questions asking for comparisons
  if (text.includes('compared') || text.includes('difference') || 
      text.includes('contrast') || text.includes('versus') || text.includes('vs')) {
    return 'comparison';
  }
  
  // Questions asking about categories
  if (text.includes('category') || text.includes('type') || 
      text.includes('classification') || text.includes('classified')) {
    return 'category';
  }
  
  // Questions asking about specific entities (which X)
  if (text.match(/\bwhich\s+([a-z]+)\b/)) {
    return `which_${text.match(/\bwhich\s+([a-z]+)\b/)[1]}`;
  }
  
  // Known-for pattern detection
  if (/\b(known|famous|recognized|remembered|celebrated)\s+(for|as)\b/.test(text)) {
    return 'known_for';
  }
  
  // Questions about works/creations
  if (/\b(paint|wrote|directed|composed|created|designed|built|constructed)\b/.test(text)) {
    return 'creation';
  }
  
  // Default to a generic intent based on the first question word
  if (text.includes('what')) return 'what_general';
  if (text.includes('which')) return 'which_general';
  if (text.includes('where')) return 'where_general';
  if (text.includes('when')) return 'when_general';
  if (text.includes('who')) return 'who_general';
  if (text.includes('why')) return 'why_general';
  if (text.includes('how')) return 'how_general';
  
  return 'unknown';
}

/**
 * Check if two questions are asking about different properties of the same entity
 */
function askingDifferentProperties(q1Text, q2Text) {
  const text1 = q1Text.toLowerCase();
  const text2 = q2Text.toLowerCase();
  
  // Generate fingerprints and check if they clearly indicate different properties
  const fp1 = generateQuestionFingerprint(text1);
  const fp2 = generateQuestionFingerprint(text2);
  
  // If one question has quoted entities and the other doesn't, they're likely different
  if ((fp1.quotedEntities.length > 0 && fp2.quotedEntities.length === 0) ||
      (fp1.quotedEntities.length === 0 && fp2.quotedEntities.length > 0)) {
    return true;
  }
  
  // If both have quoted entities but they're different, they're asking about different things
  if (fp1.quotedEntities.length > 0 && fp2.quotedEntities.length > 0) {
    const commonEntities = fp1.quotedEntities.filter(e => fp2.quotedEntities.includes(e));
    if (commonEntities.length === 0) {
      return true; // No common entities, asking about different things
    }
  }
  
  // Check for property words like "painted" vs "cut off" to detect different properties
  if (fp1.propertyWords.length > 0 && fp2.propertyWords.length > 0) {
    const commonProperties = fp1.propertyWords.filter(p => fp2.propertyWords.includes(p));
    if (commonProperties.length === 0) {
      return true; // No common properties, asking about different things
    }
  }
  
  // Check property patterns
  const propertyPatterns = [
    /known for ([^.?!]+)/i,
    /famous for ([^.?!]+)/i,
    /recognized for ([^.?!]+)/i,
    /remembered for ([^.?!]+)/i,
    /celebrated for ([^.?!]+)/i
  ];
  
  // Extract properties mentioned in each question
  let properties1 = [];
  let properties2 = [];
  
  propertyPatterns.forEach(pattern => {
    const match1 = text1.match(pattern);
    if (match1) properties1.push(match1[1].trim());
    
    const match2 = text2.match(pattern);
    if (match2) properties2.push(match2[1].trim());
  });
  
  // If both questions mention specific properties but they're different, they're different questions
  if (properties1.length > 0 && properties2.length > 0) {
    let anyPropertyMatches = false;
    
    for (const p1 of properties1) {
      for (const p2 of properties2) {
        const propertySimilarity = calculateStringSimilarity(p1, p2);
        if (propertySimilarity > 0.5) {
          anyPropertyMatches = true;
          break;
        }
      }
      if (anyPropertyMatches) break;
    }
    
    if (!anyPropertyMatches) {
      return true; // Different properties, asking about different things
    }
  }
  
  // Analysis suggests they might be asking about the same thing
  return false;
}

// Run the duplicate finder and remover
removeSemanticDuplicates(); 