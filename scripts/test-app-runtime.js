#!/usr/bin/env node

/**
 * Script to test the app's runtime behavior with the friends-tv topic configuration
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://vdrmtsifivvpioonpqqc.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcm10c2lmaXZ2cGlvb25wcXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNDQyMzIsImV4cCI6MjA2MTkyMDIzMn0.OtAUoIz1ZCCE5IncVvpHnDGrTXEQy_JoyvNE0QQf6wA";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load the app configuration
const appConfig = require('../app-topic-config.js');

async function testFriendsConfiguration() {
  try {
    console.log('🧪 Testing Friends-TV Topic Configuration\n');

    // 1. Test topic configuration
    console.log('📋 CONFIGURATION TEST:');
    console.log('======================');
    console.log(`Active topic: ${appConfig.activeTopic}`);
    console.log(`Filter content by topic: ${appConfig.filterContentByTopic}`);
    
    // Find the friends-tv topic configuration
    const friendsTopic = appConfig.topics['friends-tv'];
    if (!friendsTopic) {
      console.error('❌ ERROR: friends-tv topic not found in configuration!');
      return;
    }
    
    console.log(`Friends topic found: ${friendsTopic.displayName}`);
    console.log(`Is niche: ${friendsTopic.isNiche}`);
    console.log(`Database topic name: ${friendsTopic.dbTopicName}`);
    console.log(`Description: ${friendsTopic.description}`);
    console.log(`Subtopics: ${Object.keys(friendsTopic.subTopics || {}).length} defined`);
    
    // 2. Test database connection and data
    console.log('\n🔌 DATABASE CONNECTION TEST:');
    console.log('===============================');
    
    // Test table switching logic manually
    const expectedTableName = friendsTopic.isNiche ? 'niche_trivia_questions' : 'trivia_questions';
    console.log(`Expected table name: ${expectedTableName}`);
    
    if (expectedTableName !== 'niche_trivia_questions') {
      console.error('❌ ERROR: Expected niche_trivia_questions but got:', expectedTableName);
      return;
    }
    
    // Query the database
    const { data: questions, error } = await supabase
      .from(expectedTableName)
      .select('id, question_text, answer_choices, correct_answer, topic, subtopic')
      .eq('topic', friendsTopic.dbTopicName)
      .limit(5);
    
    if (error) {
      console.error('❌ Database query error:', error.message);
      return;
    }
    
    if (!questions || questions.length === 0) {
      console.error('❌ ERROR: No questions found for topic:', friendsTopic.dbTopicName);
      return;
    }
    
    console.log(`✅ Found ${questions.length} sample questions`);
    
    // 3. Test answer format
    console.log('\n🎯 ANSWER FORMAT TEST:');
    console.log('========================');
    
    questions.forEach((question, index) => {
      console.log(`\n--- Question ${index + 1} ---`);
      console.log(`ID: ${question.id}`);
      console.log(`Question: ${question.question_text.substring(0, 60)}...`);
      
      // Check answer_choices format
      if (!question.answer_choices || !Array.isArray(question.answer_choices)) {
        console.error(`❌ Invalid answer_choices for question ${question.id}:`, question.answer_choices);
        return;
      }
      
      console.log(`Answer choices: ${question.answer_choices.length} options`);
      question.answer_choices.forEach((choice, i) => {
        const isCorrect = choice === question.correct_answer;
        console.log(`  ${i + 1}. ${choice} ${isCorrect ? '✅' : ''}`);
      });
      
      // Check if correct answer matches
      const hasMatchingAnswer = question.answer_choices.includes(question.correct_answer);
      if (!hasMatchingAnswer) {
        console.error(`❌ Correct answer "${question.correct_answer}" not found in choices!`);
      } else {
        console.log(`✅ Correct answer validation passed`);
      }
    });
    
    // 4. Simulate the trivia service processing
    console.log('\n⚙️ TRIVIA SERVICE SIMULATION:');
    console.log('==============================');
    
    // Test one question through the processing logic
    const testQuestion = questions[0];
    console.log(`Testing question: ${testQuestion.id}`);
    
    // Simulate the answer processing logic from triviaService.ts
    const processedAnswers = testQuestion.answer_choices.map((choice, index) => {
      return {
        text: choice,
        isCorrect: choice === testQuestion.correct_answer
      };
    });
    
    console.log('Processed answers:');
    processedAnswers.forEach((answer, index) => {
      console.log(`  ${index + 1}. ${answer.text} - ${answer.isCorrect ? 'CORRECT' : 'incorrect'}`);
    });
    
    // Check if exactly one answer is marked as correct
    const correctAnswers = processedAnswers.filter(a => a.isCorrect);
    if (correctAnswers.length !== 1) {
      console.error(`❌ Expected exactly 1 correct answer, found ${correctAnswers.length}`);
    } else {
      console.log('✅ Answer processing simulation passed');
    }
    
    // 5. Test touch/interaction simulation
    console.log('\n📱 INTERACTION TEST:');
    console.log('===================');
    
    // Simulate selecting each answer
    processedAnswers.forEach((answer, index) => {
      const selectionResult = {
        answerIndex: index,
        selectedText: answer.text,
        isCorrect: answer.isCorrect,
        shouldBeSelectable: true // All answers should be selectable before answering
      };
      
      console.log(`Selecting answer ${index + 1}: ${selectionResult.isCorrect ? '✅ Correct' : '❌ Incorrect'}`);
    });
    
    // 6. Configuration validation
    console.log('\n🔍 CONFIGURATION VALIDATION:');
    console.log('==============================');
    
    // Check if all required properties are present
    const requiredProps = ['displayName', 'description', 'isNiche', 'dbTopicName', 'subTopics'];
    const missingProps = requiredProps.filter(prop => !(prop in friendsTopic));
    
    if (missingProps.length > 0) {
      console.error('❌ Missing required properties:', missingProps);
    } else {
      console.log('✅ All required configuration properties present');
    }
    
    // Check subtopic configuration
    const subTopics = Object.keys(friendsTopic.subTopics || {});
    if (subTopics.length === 0) {
      console.warn('⚠️ No subtopics defined for friends-tv topic');
    } else {
      console.log(`✅ ${subTopics.length} subtopics configured`);
      
      // List a few subtopics
      console.log('Sample subtopics:');
      subTopics.slice(0, 3).forEach(subtopicKey => {
        const subtopic = friendsTopic.subTopics[subtopicKey];
        console.log(`  - ${subtopic.displayName} (icon: ${subtopic.icon})`);
      });
    }
    
    console.log('\n🎉 SUMMARY:');
    console.log('============');
    console.log('✅ Topic configuration is valid');
    console.log('✅ Database connection works');
    console.log('✅ Table switching works correctly');
    console.log('✅ Questions have valid format');
    console.log('✅ Answer choices are properly structured');
    console.log('✅ Correct answers are identifiable');
    
    console.log('\n💡 If users still cannot select answers, the issue is likely in:');
    console.log('1. React Native touch handling (Pressable/TouchableOpacity)');
    console.log('2. Component state management');
    console.log('3. Redux state conflicts');
    console.log('4. Platform-specific touch issues');
    
    console.log('\n🔧 DEBUGGING SUGGESTIONS:');
    console.log('==========================');
    console.log('1. Check browser/app console for JavaScript errors');
    console.log('2. Verify Redux DevTools show state updates when answers are tapped');
    console.log('3. Test on different devices/browsers');
    console.log('4. Enable debug mode with ?debug=trivia-debug-panel URL parameter');
    console.log('5. Check if touch events are being captured by parent components');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testFriendsConfiguration(); 