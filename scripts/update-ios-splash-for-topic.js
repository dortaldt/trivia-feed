#!/usr/bin/env node

/**
 * Updates iOS splash screen storyboard configuration based on the active topic
 * This ensures the iOS native splash screen also uses topic-specific icons
 */

const fs = require('fs');
const path = require('path');

// Import the topic configuration
const topicConfig = require('../app-topic-config.js');

// Get the iOS storyboard path
const storyboardPath = path.join(__dirname, '../ios/MusicTrivia/SplashScreen.storyboard');

// Function to get splash screen logo name for a topic
function getSplashScreenLogoName(topic) {
  if (!topic || topic === 'default') {
    return 'SplashScreenLogo';
  }
  
  // Check if topic-specific splash icon exists in iOS project
  const topicLogoName = `SplashScreenLogo-${topic}`;
  // For now, we'll assume the icon is available if the topic is configured
  // In a real scenario, you'd check the iOS project's asset catalog
  
  // For known topics with assets, return topic-specific name
  const topicsWithAssets = ['music', 'nineties', 'friends', 'friends-tv'];
  if (topicsWithAssets.includes(topic)) {
    return topicLogoName;
  }
  
  // Fall back to default
  return 'SplashScreenLogo';
}

// Main function to update iOS storyboard
function updateiOSSplashForTopic() {
  try {
    // Check if storyboard exists
    if (!fs.existsSync(storyboardPath)) {
      console.log('ℹ️ iOS storyboard not found, skipping iOS splash update');
      return;
    }
    
    // Read current storyboard
    const storyboardContent = fs.readFileSync(storyboardPath, 'utf8');
    
    const { activeTopic } = topicConfig;
    
    console.log(`🔄 Updating iOS splash storyboard for topic: ${activeTopic || 'default'}`);
    
    // Get the appropriate logo name
    const logoName = getSplashScreenLogoName(activeTopic);
    
    // Replace the image name in the storyboard
    // Look for the pattern: <image name="SplashScreenLogo" ...
    const updatedContent = storyboardContent.replace(
      /(<image name=")[^"]+(" width="[^"]*" height="[^"]*")/g,
      `$1${logoName}$2`
    );
    
    // Write updated storyboard
    fs.writeFileSync(storyboardPath, updatedContent);
    
    console.log(`✅ Updated iOS storyboard:`);
    console.log(`   - Logo name: ${logoName}`);
    
  } catch (error) {
    console.error('❌ Error updating iOS storyboard:', error);
    process.exit(1);
  }
}

// Run the update if this script is called directly
if (require.main === module) {
  updateiOSSplashForTopic();
}

module.exports = { updateiOSSplashForTopic, getSplashScreenLogoName }; 