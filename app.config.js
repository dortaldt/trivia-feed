// app.config.js
module.exports = {
  name: "Trivia Feed",
  version: "1.0.0",
  extra: {
    // Direct test credentials (this is a test-only project, safe to include)
    supabaseUrl: "https://jqkwpohrrsudzwxjuucx.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa3dwb2hycnN1ZHp3eGp1dWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc0OTU4MDksImV4cCI6MjAzMzA3MTgwOX0.4jqAKHKxWxuQlrYrRDcj3xtqPsJNx5cDGvh1FtEwkF8",
    
    // Fallback to environment variables if available
    fallbackSupabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    fallbackSupabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true
  },
  web: {
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router"
  ]
}; 