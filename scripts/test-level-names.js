// Test script for contextual level names
const { getLevelName, getAllLevelNames, hasCustomLevelNames } = require('../src/utils/levelNames');

console.log('🧪 Testing Contextual Level Names System\n');

// Test cases from the user's examples
const testCases = [
  // Sports example from user
  { topic: 'Sports', subtopic: null, level: 1, expected: 'Rookie' },
  { topic: 'Sports', subtopic: null, level: 2, expected: 'B League' },
  { topic: 'Sports', subtopic: null, level: 3, expected: 'A League' },
  { topic: 'Sports', subtopic: null, level: 4, expected: 'Superstar' },
  { topic: 'Sports', subtopic: null, level: 5, expected: 'All-Star' },
  
  // Music examples
  { topic: 'Music', subtopic: 'Jazz & Blues', level: 1, expected: 'Listener' },
  { topic: 'Music', subtopic: 'Jazz & Blues', level: 3, expected: 'Aficionado' },
  { topic: 'Music', subtopic: 'Jazz & Blues', level: 5, expected: 'Soul Master' },
  
  // Friends TV show examples
  { topic: 'Friends', subtopic: 'Famous Quotes', level: 1, expected: 'Viewer' },
  { topic: 'Friends', subtopic: 'Famous Quotes', level: 5, expected: 'Could I BE More Quotable?' },
  
  // Science examples
  { topic: 'Science', subtopic: 'Physics', level: 1, expected: 'Observer' },
  { topic: 'Science', subtopic: 'Physics', level: 5, expected: 'Einstein' },
  
  // History examples
  { topic: 'History', subtopic: 'World War II', level: 1, expected: 'Student' },
  { topic: 'History', subtopic: 'World War II', level: 5, expected: 'War Historian' },
  
  // Movies and TV examples
  { topic: 'Movies and TV', subtopic: 'Action Films', level: 1, expected: 'Fan' },
  { topic: 'Movies and TV', subtopic: 'Action Films', level: 5, expected: 'Action Legend' },
  
  // 90s Culture examples
  { topic: '90s', subtopic: '90s Music', level: 1, expected: 'Listener' },
  { topic: '90s', subtopic: '90s Music', level: 3, expected: 'Grunge Fan' },
  
  // Test fallback for unknown topic
  { topic: 'Unknown Topic', subtopic: null, level: 1, expected: 'Novice' },
  { topic: 'Unknown Topic', subtopic: null, level: 5, expected: 'Master' },
  
  // Test edge cases
  { topic: 'Sports', subtopic: null, level: 0, expected: 'Rookie' }, // Should clamp to 1
  { topic: 'Sports', subtopic: null, level: 10, expected: 'All-Star' }, // Should clamp to 5
];

console.log('🔍 Running test cases...\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  try {
    const result = getLevelName(testCase.topic, testCase.subtopic, testCase.level);
    const passed = result === testCase.expected;
    
    if (passed) {
      console.log(`✅ Test ${index + 1}: PASS`);
      console.log(`   Topic: "${testCase.topic}", Subtopic: "${testCase.subtopic}", Level: ${testCase.level}`);
      console.log(`   Expected: "${testCase.expected}", Got: "${result}"\n`);
      passCount++;
    } else {
      console.log(`❌ Test ${index + 1}: FAIL`);
      console.log(`   Topic: "${testCase.topic}", Subtopic: "${testCase.subtopic}", Level: ${testCase.level}`);
      console.log(`   Expected: "${testCase.expected}", Got: "${result}"\n`);
      failCount++;
    }
  } catch (error) {
    console.log(`💥 Test ${index + 1}: ERROR`);
    console.log(`   Topic: "${testCase.topic}", Subtopic: "${testCase.subtopic}", Level: ${testCase.level}`);
    console.log(`   Error: ${error.message}\n`);
    failCount++;
  }
});

console.log('📊 Test Results:');
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📈 Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%\n`);

// Test additional functionality
console.log('🔧 Testing additional functionality...\n');

// Test getAllLevelNames
console.log('📋 Testing getAllLevelNames:');
const sportsLevels = getAllLevelNames('Sports', null);
console.log(`Sports levels: [${sportsLevels.join(', ')}]`);

const jazzLevels = getAllLevelNames('Music', 'Jazz & Blues');
console.log(`Jazz & Blues levels: [${jazzLevels.join(', ')}]`);

// Test hasCustomLevelNames
console.log('\n🎯 Testing hasCustomLevelNames:');
console.log(`Sports has custom levels: ${hasCustomLevelNames('Sports', null)}`);
console.log(`Jazz & Blues has custom levels: ${hasCustomLevelNames('Music', 'Jazz & Blues')}`);
console.log(`Unknown topic has custom levels: ${hasCustomLevelNames('Unknown Topic', null)}`);

// Demo examples
console.log('\n🎮 Demo Examples:');
console.log('================');

const demoExamples = [
  { topic: 'Sports', subtopic: null },
  { topic: 'Music', subtopic: 'Classical Composers' },
  { topic: 'Science', subtopic: 'Quantum Physics' },
  { topic: 'Friends', subtopic: 'Relationships & Dating' },
  { topic: '90s', subtopic: 'Fashion Trends' },
  { topic: 'Movies and TV', subtopic: 'Horror Films' },
];

demoExamples.forEach(example => {
  console.log(`\n🔖 ${example.topic}${example.subtopic ? ` → ${example.subtopic}` : ''}:`);
  for (let level = 1; level <= 5; level++) {
    const levelName = getLevelName(example.topic, example.subtopic, level);
    console.log(`   Level ${level}: ${levelName}`);
  }
});

console.log('\n🎯 Integration Examples:');
console.log('======================');
console.log('Instead of "Level 1", "Level 2", etc., users will now see:');
console.log('• Sports: Rookie → B League → A League → Superstar → All-Star');
console.log('• Jazz & Blues: Listener → Appreciator → Aficionado → Scholar → Soul Master');
console.log('• Friends Quotes: Viewer → Quote Fan → Quotable → Quote Master → Could I BE More Quotable?');
console.log('• Action Films: Fan → Adrenaline Junkie → Action Hero → Stunt Master → Action Legend');

console.log('\n✅ Level names system test completed!'); 