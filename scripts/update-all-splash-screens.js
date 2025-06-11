#!/usr/bin/env node

/**
 * Master script to update all splash screen configurations based on the active topic
 * This updates:
 * - app.json (Expo splash screen)
 * - iOS storyboard (iOS native splash)
 */

const { updateAppConfigForTopic } = require('./update-splash-for-topic.js');
const { updateiOSSplashForTopic } = require('./update-ios-splash-for-topic.js');

async function updateAllSplashScreens() {
  console.log('🚀 Updating all splash screens for topic...\n');
  
  try {
    // Update app.json
    updateAppConfigForTopic();
    console.log('');
    
    // Update iOS storyboard
    updateiOSSplashForTopic();
    console.log('');
    
    console.log('✅ All splash screens updated successfully!');
    console.log('');
    console.log('📝 Note: For the changes to take effect:');
    console.log('   - Restart your Expo dev server');
    console.log('   - For iOS builds, clean and rebuild the project');
    console.log('   - For production builds, create a new build');
    
  } catch (error) {
    console.error('❌ Error updating splash screens:', error);
    process.exit(1);
  }
}

// Run the update if this script is called directly
if (require.main === module) {
  updateAllSplashScreens();
}

module.exports = { updateAllSplashScreens }; 