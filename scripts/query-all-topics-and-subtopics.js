// Script to list all unique topics and subtopics from both trivia tables
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env.development' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key not found in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function queryTopicsAndSubtopics() {
  try {
    console.log('🔍 Querying topics and subtopics from both tables...\n');
    
    // Query trivia_questions table
    console.log('📊 Fetching from trivia_questions table...');
    const { data: triviaData, error: triviaError } = await supabase
      .from('trivia_questions')
      .select('topic, subtopic')
      .not('topic', 'is', null);
    
    if (triviaError) {
      console.error('Error fetching from trivia_questions:', triviaError);
      process.exit(1);
    }
    
    // Query niche_trivia_questions table
    console.log('📊 Fetching from niche_trivia_questions table...');
    const { data: nicheData, error: nicheError } = await supabase
      .from('niche_trivia_questions')
      .select('topic, subtopic')
      .not('topic', 'is', null);
    
    if (nicheError) {
      console.error('Error fetching from niche_trivia_questions:', nicheError);
      process.exit(1);
    }
    
    // Process trivia_questions data
    const triviaTopics = new Set();
    const triviaSubtopics = new Set();
    const triviaTopicSubtopicMap = new Map();
    
    triviaData?.forEach(item => {
      if (item.topic) {
        triviaTopics.add(item.topic);
        if (!triviaTopicSubtopicMap.has(item.topic)) {
          triviaTopicSubtopicMap.set(item.topic, new Set());
        }
        if (item.subtopic) {
          triviaSubtopics.add(item.subtopic);
          triviaTopicSubtopicMap.get(item.topic).add(item.subtopic);
        }
      }
    });
    
    // Process niche_trivia_questions data
    const nicheTopics = new Set();
    const nicheSubtopics = new Set();
    const nicheTopicSubtopicMap = new Map();
    
    nicheData?.forEach(item => {
      if (item.topic) {
        nicheTopics.add(item.topic);
        if (!nicheTopicSubtopicMap.has(item.topic)) {
          nicheTopicSubtopicMap.set(item.topic, new Set());
        }
        if (item.subtopic) {
          nicheSubtopics.add(item.subtopic);
          nicheTopicSubtopicMap.get(item.topic).add(item.subtopic);
        }
      }
    });
    
    // Combine all topics and subtopics
    const allTopics = new Set([...triviaTopics, ...nicheTopics]);
    const allSubtopics = new Set([...triviaSubtopics, ...nicheSubtopics]);
    
    // Print results
    console.log('\n=== TRIVIA_QUESTIONS TABLE ===');
    console.log(`🔖 Topics: ${triviaTopics.size}`);
    console.log(`📝 Subtopics: ${triviaSubtopics.size}`);
    console.log(`📊 Records: ${triviaData?.length || 0}`);
    
    console.log('\n🔖 TRIVIA TOPICS:');
    [...triviaTopics].sort().forEach((topic, index) => {
      const subtopics = triviaTopicSubtopicMap.get(topic);
      console.log(`${index + 1}. ${topic} (${subtopics?.size || 0} subtopics)`);
      if (subtopics && subtopics.size > 0) {
        [...subtopics].sort().forEach(subtopic => {
          console.log(`   - ${subtopic}`);
        });
      }
    });
    
    console.log('\n=== NICHE_TRIVIA_QUESTIONS TABLE ===');
    console.log(`🔖 Topics: ${nicheTopics.size}`);
    console.log(`📝 Subtopics: ${nicheSubtopics.size}`);
    console.log(`📊 Records: ${nicheData?.length || 0}`);
    
    console.log('\n🔖 NICHE TOPICS:');
    [...nicheTopics].sort().forEach((topic, index) => {
      const subtopics = nicheTopicSubtopicMap.get(topic);
      console.log(`${index + 1}. ${topic} (${subtopics?.size || 0} subtopics)`);
      if (subtopics && subtopics.size > 0) {
        [...subtopics].sort().forEach(subtopic => {
          console.log(`   - ${subtopic}`);
        });
      }
    });
    
    console.log('\n=== COMBINED SUMMARY ===');
    console.log(`🔖 Total unique topics: ${allTopics.size}`);
    console.log(`📝 Total unique subtopics: ${allSubtopics.size}`);
    
    console.log('\n🌍 ALL TOPICS (BOTH TABLES):');
    [...allTopics].sort().forEach((topic, index) => {
      const triviaSubtopics = triviaTopicSubtopicMap.get(topic) || new Set();
      const nicheSubtopics = nicheTopicSubtopicMap.get(topic) || new Set();
      const allTopicSubtopics = new Set([...triviaSubtopics, ...nicheSubtopics]);
      
      const tableInfo = [];
      if (triviaTopics.has(topic)) tableInfo.push('trivia');
      if (nicheTopics.has(topic)) tableInfo.push('niche');
      
      console.log(`${index + 1}. ${topic} (${allTopicSubtopics.size} subtopics) [${tableInfo.join(', ')}]`);
    });
    
    console.log('\n📋 ALL SUBTOPICS (BOTH TABLES):');
    [...allSubtopics].sort().forEach((subtopic, index) => {
      const tableInfo = [];
      if (triviaSubtopics.has(subtopic)) tableInfo.push('trivia');
      if (nicheSubtopics.has(subtopic)) tableInfo.push('niche');
      console.log(`${index + 1}. ${subtopic} [${tableInfo.join(', ')}]`);
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Execute the function
queryTopicsAndSubtopics(); 