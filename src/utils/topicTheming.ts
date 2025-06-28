import { Platform } from 'react-native';

// Import topic configuration
const topicConfig = require('../../app-topic-config.js');

export interface TopicTheme {
  displayName: string;
  description: string;
  authTitle: string;
  authSubtitle: string;
  signupPrompt: string;
  loginPrompt: string;
  signupButtonText: string;
  loginButtonText: string;
  welcomeMessage: string;
}

/**
 * Gets the current active topic configuration
 */
export const getActiveTopicConfig = () => {
  const activeTopic = topicConfig.activeTopic || 'default';
  return {
    activeTopic,
    topicData: topicConfig.topics[activeTopic] || topicConfig.topics.default,
    isNicheTopic: topicConfig.topics[activeTopic]?.isNiche || false,
    filterByTopic: topicConfig.filterContentByTopic || false
  };
};

/**
 * Generates topic-specific messaging for auth pages
 */
export const getTopicTheme = (): TopicTheme => {
  const activeConfig = getActiveTopicConfig();
  const { activeTopic, topicData } = activeConfig;

  // Create topic-specific messaging based on the active topic
  switch (activeTopic) {
    case 'friends-tv':
      return {
        displayName: topicData.displayName,
        description: topicData.description,
        authTitle: 'Join the Friends Community',
        authSubtitle: 'Test your knowledge of the iconic sitcom',
        signupPrompt: '', // Removed Friends-specific signup prompt
        loginPrompt: 'Welcome back, Friend!',
        signupButtonText: 'Join the Gang',
        loginButtonText: 'Sign In', // Changed from "I'll Be There For You" to "Sign In"
        welcomeMessage: 'Could this BE any more exciting? Join thousands of Friends fans!'
      };

    case 'music':
      return {
        displayName: topicData.displayName,
        description: topicData.description,
        authTitle: 'Join the Music Community',
        authSubtitle: 'Test your knowledge of music, artists, and songs',
        signupPrompt: 'Ready to rock your music knowledge?',
        loginPrompt: 'Welcome back, music lover!',
        signupButtonText: 'Start Jamming',
        loginButtonText: 'Turn Up The Volume',
        welcomeMessage: 'Join thousands of music enthusiasts and test your musical knowledge!'
      };

    case 'nineties':
      return {
        displayName: topicData.displayName,
        description: topicData.description,
        authTitle: 'Welcome to the 90s',
        authSubtitle: 'Relive the most radical decade',
        signupPrompt: 'Ready to get nostalgic with 90s trivia?',
        loginPrompt: 'Welcome back to the 90s!',
        signupButtonText: 'Take Me Back',
        loginButtonText: 'That\'s So 90s',
        welcomeMessage: 'As if! Join the ultimate 90s nostalgia experience!'
      };

    case 'movies-and-tv':
      return {
        displayName: topicData.displayName,
        description: topicData.description,
        authTitle: 'Lights, Camera, Action!',
        authSubtitle: 'Dive deep into movies and television',
        signupPrompt: 'Ready for your close-up in entertainment trivia?',
        loginPrompt: 'Welcome back to the show!',
        signupButtonText: 'Roll Credits',
        loginButtonText: 'That\'s a Wrap',
        welcomeMessage: 'Join fellow movie buffs and TV enthusiasts!'
      };

    case 'science':
      return {
        displayName: topicData.displayName,
        description: topicData.description,
        authTitle: 'Discover Science',
        authSubtitle: 'Explore the wonders of scientific knowledge',
        signupPrompt: 'Ready to experiment with science trivia?',
        loginPrompt: 'Welcome back, scientist!',
        signupButtonText: 'Start Exploring',
        loginButtonText: 'Continue Research',
        welcomeMessage: 'Join the scientific community and test your knowledge!'
      };

    case 'history':
      return {
        displayName: topicData.displayName,
        description: topicData.description,
        authTitle: 'Journey Through Time',
        authSubtitle: 'Explore the depths of human history',
        signupPrompt: 'Ready to make history with your trivia knowledge?',
        loginPrompt: 'Welcome back, historian!',
        signupButtonText: 'Make History',
        loginButtonText: 'Continue Journey',
        welcomeMessage: 'Join fellow history enthusiasts and explore the past!'
      };

    case 'default':
    default:
      return {
        displayName: 'Trivia Universe',
        description: 'Test your knowledge across all topics',
        authTitle: 'Welcome to Trivia Universe',
        authSubtitle: 'Challenge yourself with questions from every topic',
        signupPrompt: 'Ready to explore the universe of knowledge?',
        loginPrompt: 'Welcome back, trivia master!',
        signupButtonText: 'Start Exploring',
        loginButtonText: 'Continue Adventure',
        welcomeMessage: 'Join thousands of trivia enthusiasts from around the world!'
      };
  }
};

/**
 * Gets the appropriate app icon based on current topic
 * Returns the require() statement for the correct app icon
 */
export const getTopicAppIcon = () => {
  const activeConfig = getActiveTopicConfig();
  
  // Return actual require() statements for the app icons
  switch (activeConfig.activeTopic) {
    case 'friends-tv':
      return require('../../assets/images/app-icon-friends.png');
    case 'music':
      return require('../../assets/images/app-icon-music.png');
    case 'nineties':
      return require('../../assets/images/app-icon-nineties.png');
    default:
      return require('../../assets/images/app-icon.png');
  }
};

/**
 * Gets topic-specific colors for theming
 * This can be used to customize colors beyond just neon theme
 */
export const getTopicColors = () => {
  const activeConfig = getActiveTopicConfig();
  
  // Return topic-specific color palettes
  switch (activeConfig.activeTopic) {
    case 'friends-tv':
      return {
        primary: '#FFB6C1', // Light pink/peach like Friends logo
        secondary: '#87CEEB', // Sky blue
        accent: '#DDA0DD' // Plum
      };
    case 'music':
      return {
        primary: '#FF6B6B', // Music red
        secondary: '#4ECDC4', // Teal
        accent: '#45B7D1' // Blue
      };
    case 'nineties':
      return {
        primary: '#FF69B4', // Hot pink
        secondary: '#00CED1', // Dark turquoise
        accent: '#FFD700' // Gold
      };
    default:
      return {
        primary: '#3498db', // Default blue
        secondary: '#2ecc71', // Green
        accent: '#e74c3c' // Red
      };
  }
};

/**
 * Utility to check if current platform should show topic-specific content
 */
export const shouldShowTopicTheming = (): boolean => {
  const activeConfig = getActiveTopicConfig();
  
  // Always show topic theming if not default topic
  if (activeConfig.activeTopic !== 'default') {
    return true;
  }
  
  // For default topic, could have additional logic
  return false;
}; 