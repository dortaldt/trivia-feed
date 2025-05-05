// app.config.js
// Note: dotenv works here because app.config.js runs in Node.js environment during build
const path = require('path');
const dotenv = require('dotenv');

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

module.exports = {
  name: "Trivia Feed",
  version: "1.0.0",
  extra: {
    // Use the validated URL
    supabaseUrl: finalUrl, 
    
    supabaseAnonKey: process.env.SUPABASE_KEY ||
                    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
                    WORKING_SUPABASE_KEY,
    
    eas: {
      projectId: "e0a61e01-78f0-4cb9-ada3-4867936fb44f"
    }
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#151718"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.triviauniversefeed"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#151718"
    }
  },
  web: {
    favicon: "./assets/images/favicon.png"
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
}; 