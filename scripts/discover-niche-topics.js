#!/usr/bin/env node

/**
 * Script to discover topics and subtopics in the niche_trivia_questions table
 * and generate topic configuration entries for app-topic-config.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://vdrmtsifivvpioonpqqc.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcm10c2lmaXZ2cGlvb25wcXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNDQyMzIsImV4cCI6MjA2MTkyMDIzMn0.OtAUoIz1ZCCE5IncVvpHnDGrTXEQy_JoyvNE0QQf6wA";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to generate a URL-friendly key from a topic name
function generateTopicKey(topicName) {
  return topicName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/-+/g, '-')         // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
}

// Function to generate appropriate icons for topics
function getTopicIcon(topicName) {
  const iconMap = {
    'physics': 'zap',
    'quantum': 'atom',
    'chemistry': 'droplet',
    'biology': 'heart',
    'mathematics': 'calculator',
    'math': 'calculator',
    'computer': 'cpu',
    'programming': 'code',
    'engineering': 'tool',
    'medicine': 'activity',
    'astronomy': 'star',
    'space': 'star',
    'advanced': 'book-open',
    'research': 'search',
    'theory': 'book',
    'molecular': 'git-branch',
    'cellular': 'grid',
    'genetics': 'shuffle',
    'neuroscience': 'brain',
    'artificial': 'cpu',
    'machine': 'cpu',
    'learning': 'trending-up',
    'data': 'database',
    'statistics': 'bar-chart',
    'philosophy': 'compass',
    'ethics': 'shield',
    'literature': 'book-open',
    'linguistics': 'message-circle',
    'history': 'clock',
    'archaeology': 'map',
    'anthropology': 'users',
    'psychology': 'brain',
    'sociology': 'users',
    'economics': 'trending-up',
    'finance': 'dollar-sign',
    'law': 'scale',
    'political': 'flag',
    'environmental': 'leaf',
    'climate': 'cloud-rain',
    'geology': 'mountain',
    'geography': 'map-pin'
  };

  const lowerTopic = topicName.toLowerCase();
  
  // Find the first matching keyword
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (lowerTopic.includes(keyword)) {
      return icon;
    }
  }
  
  // Default icon
  return 'book-open';
}

async function discoverNicheTopics() {
  try {
    console.log('🔍 Discovering topics and subtopics in niche_trivia_questions table...\n');
    
    // First, check if the table exists and get a count
    const { count, error: countError } = await supabase
      .from('niche_trivia_questions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error accessing niche_trivia_questions table:', countError.message);
      console.log('\n💡 Make sure the table exists. You can create it by running:');
      console.log('   psql -d your_database < scripts/create_niche_table.sql');
      return;
    }
    
    console.log(`📊 Found ${count} questions in niche_trivia_questions table\n`);
    
    if (count === 0) {
      console.log('⚠️  The niche_trivia_questions table is empty.');
      console.log('💡 Add some niche questions to the table first, then run this script again.');
      return;
    }
    
    // Query all unique topics and subtopics
    const { data, error } = await supabase
      .from('niche_trivia_questions')
      .select('topic, subtopic, branch, difficulty, tags');
    
    if (error) {
      console.error('❌ Error querying niche topics:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  No data found in niche_trivia_questions table');
      return;
    }
    
    // Organize data by topic
    const topicData = {};
    
    data.forEach(row => {
      const topic = row.topic;
      if (!topic) return;
      
      if (!topicData[topic]) {
        topicData[topic] = {
          subtopics: new Set(),
          branches: new Set(),
          difficulties: new Set(),
          tags: new Set(),
          count: 0
        };
      }
      
      topicData[topic].count++;
      
      if (row.subtopic) {
        topicData[topic].subtopics.add(row.subtopic);
      }
      
      if (row.branch) {
        topicData[topic].branches.add(row.branch);
      }
      
      if (row.difficulty) {
        topicData[topic].difficulties.add(row.difficulty);
      }
      
      if (row.tags && Array.isArray(row.tags)) {
        row.tags.forEach(tag => topicData[topic].tags.add(tag));
      }
    });
    
    // Display discovered topics
    console.log('📋 Discovered Topics and Subtopics:');
    console.log('===================================');
    
    const sortedTopics = Object.entries(topicData).sort((a, b) => b[1].count - a[1].count);
    
    sortedTopics.forEach(([topic, info]) => {
      console.log(`\n🔬 ${topic} (${info.count} questions)`);
      
      if (info.subtopics.size > 0) {
        console.log(`   Subtopics: ${Array.from(info.subtopics).join(', ')}`);
      }
      
      if (info.branches.size > 0) {
        console.log(`   Branches: ${Array.from(info.branches).slice(0, 5).join(', ')}${info.branches.size > 5 ? '...' : ''}`);
      }
      
      if (info.difficulties.size > 0) {
        console.log(`   Difficulties: ${Array.from(info.difficulties).join(', ')}`);
      }
      
      if (info.tags.size > 0) {
        console.log(`   Sample Tags: ${Array.from(info.tags).slice(0, 8).join(', ')}${info.tags.size > 8 ? '...' : ''}`);
      }
    });
    
    // Generate topic configuration
    console.log('\n\n🔧 Generated Topic Configuration:');
    console.log('==================================');
    
    const generatedConfig = {};
    
    sortedTopics.forEach(([topic, info]) => {
      const topicKey = generateTopicKey(topic);
      
      // Create subtopics object
      const subTopics = {};
      Array.from(info.subtopics).forEach(subtopic => {
        const subtopicKey = generateTopicKey(subtopic);
        subTopics[subtopic] = {
          displayName: subtopic,
          description: `${subtopic} concepts and principles`,
          icon: getTopicIcon(subtopic)
        };
      });
      
      generatedConfig[topicKey] = {
        displayName: topic,
        description: `Advanced ${topic.toLowerCase()} concepts and specialized knowledge`,
        dbTopicName: topic,
        isNiche: true,
        ...(Object.keys(subTopics).length > 0 && { subTopics })
      };
    });
    
    // Pretty print the configuration
    console.log('\n// Add these to your app-topic-config.js topics object:');
    console.log(JSON.stringify(generatedConfig, null, 2));
    
    // Save to file
    const configPath = path.join(__dirname, '..', 'discovered-niche-topics.json');
    fs.writeFileSync(configPath, JSON.stringify(generatedConfig, null, 2));
    console.log(`\n💾 Configuration saved to: ${configPath}`);
    
    // Generate integration instructions
    console.log('\n\n📝 Integration Instructions:');
    console.log('============================');
    console.log('1. Review the generated configuration above');
    console.log('2. Copy the topics you want to include');
    console.log('3. Add them to the topics object in app-topic-config.js');
    console.log('4. Adjust displayName, description, and icons as needed');
    console.log('5. Test with: node test-table-switching.js [topic-key]');
    
    console.log('\n✅ Discovery complete!');
    
  } catch (error) {
    console.error('❌ Error during discovery:', error.message);
    console.error('Full error:', error);
  }
}

// Run the discovery
discoverNicheTopics(); 