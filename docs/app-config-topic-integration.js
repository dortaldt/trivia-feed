/**
 * Sample app.config.js with Topic Integration
 * 
 * This file shows how to integrate the topic-based configuration
 * into the Expo app config.
 * 
 * *** This is a reference implementation, not for direct use ***
 */

// app.config.js
import 'dotenv/config';
const path = require('path');
const dotenv = require('dotenv');

// Import topic configuration
const topicConfig = require('./app-topic-config');

// Load from .env and .env.development if available
try {
  const envPath = path.resolve(__dirname, '.env');
  dotenv.config({ path: envPath });
  
  const devEnvPath = path.resolve(__dirname, '.env.development');
  dotenv.config({ path: devEnvPath });
  
  console.log('Loaded environment variables for app.config.js');
} catch (e) {
  console.log('Error loading .env files:', e.message);
}

// Get active topic configuration
const { activeTopic, filterContentByTopic, topics } = topicConfig;
const currentTopic = topics[activeTopic] || topics.default;

// Log topic configuration
console.log(`Building app with topic: ${activeTopic}`);
console.log(`Content filtering: ${filterContentByTopic ? 'Enabled' : 'Disabled'}`);
if (filterContentByTopic && activeTopic !== 'default') {
  console.log(`Filtering by topic: ${currentTopic.dbTopicName}`);
}

// Function to get asset path based on topic
function getTopicAsset(assetName) {
  if (activeTopic === 'default') {
    return `./assets/images/${assetName}.png`;
  }
  return `./assets/images/${assetName}-${activeTopic}.png`;
}

// Get URLs and API keys from environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";

export default {
  expo: {
    name: activeTopic === 'default' 
      ? "Trivia Feed" 
      : `${currentTopic.displayName}`,
    slug: "trivia-feed",
    scheme: "trivia-feed",
    version: "1.0.0",
    icon: getTopicAsset('app-icon'),
    extra: {
      supabaseUrl,
      supabaseAnonKey: supabaseKey,
      activeTopic,
      filterContentByTopic,
      topicDbName: currentTopic.dbTopicName,
      eas: {
        projectId: process.env.EAS_PROJECT_ID
      }
    },
    updates: {
      url: "https://u.expo.dev/dab32358-550f-4ac2-861e-ccda6a8cef14",
      enabled: true,
      checkAutomatically: "ON_LOAD"
    },
    runtimeVersion: "1.0.0",
    splash: {
      image: getTopicAsset('splash-icon'),
      resizeMode: "contain",
      backgroundColor: "#151718"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.triviafeed",
      icon: getTopicAsset('app-icon'),
      infoPlist: {
        UIAppFonts: [
          "AntDesign.ttf",
          "Feather.ttf",
          "FontAwesome.ttf",
          "MaterialIcons.ttf"
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: getTopicAsset('adaptive-icon'),
        backgroundColor: "#151718"
      },
      package: "com.triviafeed"
    },
    web: {
      favicon: activeTopic === 'default' 
        ? "./assets/images/app-icon.png" 
        : `./assets/images/app-icon-${activeTopic}.png`,
      meta: {
        title: activeTopic === 'default' 
          ? "Trivia Feed" 
          : `${currentTopic.displayName}`,
        description: currentTopic.description,
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          imageResizeMode: "contain",
          backgroundColor: "#151718"
        }
      ]
    ]
  }
}; 