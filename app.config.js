// app.config.js
// Note: dotenv works here because app.config.js runs in Node.js environment during build
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

// Always use this known working URL as a fallback
const WORKING_SUPABASE_URL = "https://vdrmtsifivvpioonpqqc.supabase.co";
const WORKING_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcm10c2lmaXZ2cGlvb25wcXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzNDQyMzIsImV4cCI6MjA2MTkyMDIzMn0.OtAUoIz1ZCCE5IncVvpHnDGrTXEQy_JoyvNE0QQf6wA";

// Old URLs that don't work - DO NOT USE 
const INVALID_URLS = [
  "https://fabwoobfrrudzvzjuwcx.supabase.co",
  "https://jqkwpohrrsudzwxjuucx.supabase.co",
];

// Get URL from env vars or default
let finalUrl = process.env.SUPABASE_URL || 
              process.env.EXPO_PUBLIC_SUPABASE_URL || 
              WORKING_SUPABASE_URL;

// Check if we're using an invalid URL
if (INVALID_URLS.includes(finalUrl)) {
  console.warn(`WARNING: Detected invalid Supabase URL: ${finalUrl}`);
  console.warn(`WARNING: Overriding with working URL: ${WORKING_SUPABASE_URL}`);
  finalUrl = WORKING_SUPABASE_URL;
}

// Log which URL we're going to use
console.log("Building app with Supabase URL:", finalUrl);

// Check for OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
if (!openaiApiKey) {
  console.warn("WARNING: No OpenAI API key found. Question generation will not work.");
  console.warn("Add OPENAI_API_KEY to your .env file to enable this feature.");
} else {
  console.log("OpenAI API key configured. Question generation feature enabled.");
}

// Function to get asset path based on topic
function getTopicAsset(assetName) {
  if (activeTopic === 'default') {
    return `./assets/images/${assetName}.png`;
  }
  return `./assets/images/${assetName}-${activeTopic}.png`;
}

// Configure app-specific values based on topic
function getAppSpecificConfig(topic) {
  const appConfigs = {
    default: {
      bundleId: "com.triviafeed",
      scheme: "trivia-feed",
      slug: "trivia-feed",
    },
    music: {
      bundleId: "com.triviafeed.music",
      scheme: "trivia-feed-music",
      slug: "trivia-feed-music",
    }
    // Add more topic-specific configurations as needed
  };
  
  // Return configuration for the specified topic or use default
  return appConfigs[topic] || appConfigs.default;
}

// Get configuration for current topic
const appSpecificConfig = getAppSpecificConfig(activeTopic);

export default {
  expo: {
    name: activeTopic === 'default' 
      ? "Trivia Feed" 
      : `${currentTopic.displayName}`,
    slug: appSpecificConfig.slug,
    scheme: appSpecificConfig.scheme,
    version: "1.0.0",
    icon: getTopicAsset('app-icon'),
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
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
    runtimeVersion: {
      policy: "sdkVersion"
    },
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
      bundleIdentifier: appSpecificConfig.bundleId,
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
      package: appSpecificConfig.bundleId
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