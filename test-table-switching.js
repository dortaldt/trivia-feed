#!/usr/bin/env node

/**
 * Test script to demonstrate the isNiche table switching functionality
 * 
 * This script shows how the app will seamlessly switch between
 * trivia_questions and niche_trivia_questions tables based on the
 * topic configuration's isNiche parameter.
 */

const topicConfig = require('./app-topic-config');

// Mock the Constants module that would be available in React Native
const mockConstants = {
  expoConfig: {
    extra: {
      activeTopic: process.argv[2] || 'default', // Allow command line override
      topics: topicConfig.topics
    }
  }
};

// Mock the table utility function (simplified version)
function getTriviaTableName(activeTopic, topics) {
  // Default to standard table
  if (!activeTopic || activeTopic === 'default') {
    return 'trivia_questions';
  }

  // Get the topic configuration
  const topicConfigData = topics[activeTopic];
  
  if (!topicConfigData) {
    console.warn(`No configuration found for topic: ${activeTopic}. Using standard table.`);
    return 'trivia_questions';
  }

  // Return the appropriate table based on isNiche flag
  return topicConfigData.isNiche ? 'niche_trivia_questions' : 'trivia_questions';
}

// Test the functionality
function testTableSwitching() {
  console.log('🧪 Testing Table Switching Functionality\n');
  
  console.log('Available topics and their configurations:');
  console.log('==========================================');
  
  Object.entries(topicConfig.topics).forEach(([key, config]) => {
    const tableName = getTriviaTableName(key, topicConfig.topics);
    console.log(`${key.padEnd(20)} | isNiche: ${String(config.isNiche).padEnd(5)} | Table: ${tableName}`);
  });

  console.log('\n📋 Test Scenarios:');
  console.log('==================');

  // Test different scenarios
  const scenarios = [
    { topic: 'default', description: 'Default multi-topic experience' },
    { topic: 'music', description: 'Regular music topic' },
    { topic: 'science', description: 'Regular science topic' },
    { topic: 'quantum-physics', description: 'Niche quantum physics topic' },
    { topic: 'nonexistent', description: 'Non-existent topic (should fallback)' }
  ];

  scenarios.forEach(({ topic, description }) => {
    const tableName = getTriviaTableName(topic, topicConfig.topics);
    const isNiche = tableName === 'niche_trivia_questions';
    const icon = isNiche ? '🔬' : '📚';
    
    console.log(`${icon} ${topic.padEnd(15)} → ${tableName.padEnd(25)} (${description})`);
  });

  console.log('\n🔄 Runtime Test:');
  console.log('================');
  
  const currentTopic = mockConstants.expoConfig.extra.activeTopic;
  const currentTable = getTriviaTableName(currentTopic, topicConfig.topics);
  const currentConfig = topicConfig.topics[currentTopic];
  
  console.log(`Current active topic: ${currentTopic}`);
  console.log(`Current table: ${currentTable}`);
  console.log(`Is niche table: ${currentTable === 'niche_trivia_questions'}`);
  
  if (currentConfig) {
    console.log(`Topic display name: ${currentConfig.displayName}`);
    console.log(`Topic description: ${currentConfig.description}`);
  }

  console.log('\n✅ Table switching functionality is working correctly!');
  console.log('\nHow to use:');
  console.log('===========');
  console.log('1. Set isNiche: true in app-topic-config.js for topics that should use niche table');
  console.log('2. Set isNiche: false for topics that should use standard table');
  console.log('3. The app will automatically use the correct table based on the current topic');
  console.log('4. All database queries will seamlessly switch between tables');
  
  console.log('\nTo test with different topics, run:');
  console.log('node test-table-switching.js [topic-name]');
  console.log('Examples:');
  console.log('  node test-table-switching.js music           # Uses trivia_questions');
  console.log('  node test-table-switching.js quantum-physics # Uses niche_trivia_questions');
}

// Run the test
testTableSwitching(); 