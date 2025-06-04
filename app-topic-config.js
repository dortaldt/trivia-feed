/**
 * Topic-Based App Configuration
 * 
 * This file controls which topic the app is focused on and related settings.
 * To build a topic-specific app, change the activeTopic value and ensure
 * the corresponding assets are available.
 */

// Get the topic from environment variables if available (used by EAS builds)
const envTopic = process.env.APP_TOPIC || process.env.EXPO_PUBLIC_APP_TOPIC || null;

module.exports = {
  // The active topic for this build (default, music, science, etc.)
  // Set to 'default' for the standard multi-topic experience
  // Set to a specific topic name for a focused single-topic experience
  activeTopic: envTopic || 'music', // Set to 'default' for the standard multi-topic experience
  
  // Whether to filter content based on the active topic
  // When true, only questions matching the active topic will be shown
  // When false, all questions will be shown regardless of topic
  filterContentByTopic: true, // Set to false for default multi-topic experience
  
  // Available topics configuration
  // Add new topics here as they become available
  topics: {
    default: {
      displayName: 'All Topics',
      description: 'The full trivia experience across all topics',
      dbTopicName: null, // No filtering for default
    },
    music: {
      displayName: 'Music Trivia',
      description: 'Test your knowledge about music, artists, and songs',
      dbTopicName: 'Music', // Exact name as it appears in the database
      // Define sub-topics for the music topic
      subTopics: {
        'Classical Composers': {
          displayName: 'Classical',
          description: 'Classical music and composers',
          icon: 'music'
        },
        'Rock & Roll History': {
          displayName: 'Rock',
          description: 'Rock music history and legends',
          icon: 'headphones'
        },
        'Pop Music Trends': {
          displayName: 'Pop',
          description: 'Modern pop music and trends',
          icon: 'radio'
        },
        'Jazz & Blues': {
          displayName: 'Jazz & Blues',
          description: 'Jazz and blues traditions',
          icon: 'volume-2'
        },
        'Music Theory': {
          displayName: 'Theory',
          description: 'Music theory and notation',
          icon: 'book-open'
        },
        'Theater & Musicals': {
          displayName: 'Theater',
          description: 'Broadway and musical theater',
          icon: 'play'
        }
      }
    },
    science: {
      displayName: 'Science Trivia',
      description: 'Challenge yourself with science facts and discoveries',
      dbTopicName: 'Science',
      subTopics: {
        'Physics': {
          displayName: 'Physics',
          description: 'Laws of physics and mechanics',
          icon: 'zap'
        },
        'Chemistry': {
          displayName: 'Chemistry',
          description: 'Chemical elements and reactions',
          icon: 'droplet'
        },
        'Biology': {
          displayName: 'Biology',
          description: 'Life sciences and organisms',
          icon: 'heart'
        },
        'Astronomy': {
          displayName: 'Astronomy',
          description: 'Space and celestial bodies',
          icon: 'star'
        }
      }
    },
    history: {
      displayName: 'History Trivia',
      description: 'Journey through time with historical questions',
      dbTopicName: 'History',
      subTopics: {
        'Ancient History': {
          displayName: 'Ancient',
          description: 'Ancient civilizations and events',
          icon: 'book-open'
        },
        'Modern History': {
          displayName: 'Modern',
          description: 'Recent historical events',
          icon: 'clock'
        }
      }
    },
    // Add more topics as needed
  }
}; 