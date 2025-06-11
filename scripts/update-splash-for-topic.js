#!/usr/bin/env node

/**
 * Updates app.json splash screen configuration based on the active topic
 * This ensures the native splash screen also uses topic-specific icons
 */

const fs = require('fs');
const path = require('path');

// Import the topic configuration
const topicConfig = require('../app-topic-config.js');

// Get the app.json path
const appJsonPath = path.join(__dirname, '../app.json');

// Function to get splash icon path for a topic
function getSplashIconPath(topic) {
  if (!topic || topic === 'default') {
    return './assets/images/splash-icon.png';
  }
  
  // Check if topic-specific splash icon exists
  const topicSplashPath = `./assets/images/splash-icon-${topic}.png`;
  const fullPath = path.join(__dirname, '../assets/images', `splash-icon-${topic}.png`);
  
  if (fs.existsSync(fullPath)) {
    return topicSplashPath;
  }
  
  // Fall back to default
  return './assets/images/splash-icon.png';
}

// Function to get app icon path for a topic
function getAppIconPath(topic) {
  if (!topic || topic === 'default') {
    return './assets/images/icon.png';
  }
  
  // Check if topic-specific app icon exists
  const topicIconPath = `./assets/images/app-icon-${topic}.png`;
  const fullPath = path.join(__dirname, '../assets/images', `app-icon-${topic}.png`);
  
  if (fs.existsSync(fullPath)) {
    return topicIconPath;
  }
  
  // Fall back to default
  return './assets/images/icon.png';
}

// Main function to update app.json
function updateAppConfigForTopic() {
  try {
    // Read current app.json
    const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
    const appConfig = JSON.parse(appJsonContent);
    
    const { activeTopic } = topicConfig;
    
    console.log(`🔄 Updating app.json for topic: ${activeTopic || 'default'}`);
    
    // Update splash screen configuration
    const splashIconPath = getSplashIconPath(activeTopic);
    appConfig.expo.splash.image = splashIconPath;
    
    // Update app icon
    const appIconPath = getAppIconPath(activeTopic);
    appConfig.expo.icon = appIconPath;
    
    // For web favicon, use app icon
    if (appConfig.expo.web) {
      appConfig.expo.web.favicon = appIconPath;
    }
    
    // Write updated app.json
    fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));
    
    console.log(`✅ Updated app.json:`);
    console.log(`   - Splash icon: ${splashIconPath}`);
    console.log(`   - App icon: ${appIconPath}`);
    console.log(`   - Favicon: ${appIconPath}`);
    
  } catch (error) {
    console.error('❌ Error updating app.json:', error);
    process.exit(1);
  }
}

// Run the update if this script is called directly
if (require.main === module) {
  updateAppConfigForTopic();
}

module.exports = { updateAppConfigForTopic, getSplashIconPath, getAppIconPath }; 