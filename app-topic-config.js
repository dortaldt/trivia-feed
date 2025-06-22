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
  activeTopic: envTopic || 'friends-tv', // Set to 'default' for the standard multi-topic experience
  
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
      isNiche: false, // Use standard trivia_questions table
    },
    music: {
      displayName: 'Music Trivia',
      description: 'Test your knowledge about music, artists, and songs',
      dbTopicName: 'Music', // Exact name as it appears in the database
      isNiche: false, // Use standard trivia_questions table
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
      isNiche: false, // Use standard trivia_questions table
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
      isNiche: false, // Use standard trivia_questions table
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
    // Niche topics discovered from the database
    'movies-and-tv': {
      displayName: 'Movies & TV',
      description: 'Deep dive into cinema and television culture',
      dbTopicName: 'Movies and TV',
      isNiche: true, // Use niche_trivia_questions table
      subTopics: {
        'Oscar-Winning Performances': {
          displayName: 'Oscar Winners',
          description: 'Academy Award winning performances',
          icon: 'award'
        },
        'Action Films': {
          displayName: 'Action Films',
          description: 'High-octane cinema adventures',
          icon: 'zap'
        },
        'Sitcoms': {
          displayName: '90s Sitcoms',
          description: 'Classic television comedies',
          icon: 'smile'
        },
        'Cult Classics': {
          displayName: 'Cult Classics',
          description: 'Films with devoted followings',
          icon: 'star'
        },
        'Streaming Originals': {
          displayName: 'Streaming Shows',
          description: 'Original content from streaming platforms',
          icon: 'monitor'
        },
        'Classic Hollywood': {
          displayName: 'Classic Hollywood',
          description: 'Golden age of cinema',
          icon: 'film'
        },
        'Animated Films': {
          displayName: 'Animation',
          description: 'Animated movies and cartoons',
          icon: 'image'
        },
        'International Cinema': {
          displayName: 'World Cinema',
          description: 'Films from around the globe',
          icon: 'globe'
        },
        'Sci-Fi & Fantasy': {
          displayName: 'Sci-Fi & Fantasy',
          description: 'Science fiction and fantasy films',
          icon: 'moon'
        },
        'Horror Films': {
          displayName: 'Horror',
          description: 'Spine-chilling cinema',
          icon: 'eye'
        }
      }
    },
    nineties: {
      displayName: '90s Culture',
      description: 'Nostalgia from the 1990s decade',
      dbTopicName: '90s',
      isNiche: true, // Use niche_trivia_questions table
      subTopics: {
        'Fashion Trends': {
          displayName: '90s Fashion',
          description: 'Style and trends of the decade',
          icon: 'shopping-bag'
        },
        'Music': {
          displayName: '90s Music',
          description: 'Grunge, pop, and alternative hits',
          icon: 'music'
        },
        'Television': {
          displayName: '90s TV',
          description: 'Must-see television shows',
          icon: 'tv'
        },
        'Famous Scandals of the 1990s': {
          displayName: '90s Scandals',
          description: 'Notable controversies and scandals',
          icon: 'alert-triangle'
        },
        'Films': {
          displayName: '90s Movies',
          description: 'Cinema of the 1990s',
          icon: 'film'
        },
        'Books & Literature of the 1990s': {
          displayName: '90s Books & Literature',
          description: 'Literature and bestsellers',
          icon: 'book'
        },
        'Kids\' TV': {
          displayName: '90s Kids TV',
          description: 'Children\'s television programming',
          icon: 'star'
        },
        'Pop Culture Trends': {
          displayName: '90s Pop Culture',
          description: 'Cultural phenomena and trends',
          icon: 'trending-up'
        },
        'Advanced Topics': {
          displayName: '90s Advanced Topics',
          description: 'Deep 90s knowledge and trivia',
          icon: 'brain'
        },
        'Slogan': {
          displayName: '90s Slogans',
          description: 'Memorable advertising slogans',
          icon: 'megaphone'
        },
        'Records & Milestones of the 1990s': {
          displayName: '90s Records & Milestones',
          description: 'Historic achievements and records',
          icon: 'award'
        },
        'Politics': {
          displayName: '90s Politics',
          description: 'Political events and figures',
          icon: 'flag'
        },
        'World Events of the 1990s': {
          displayName: '90s World Events',
          description: 'Global events and developments',
          icon: 'globe'
        },
        'Commercials and Ads': {
          displayName: '90s Commercials',
          description: 'Memorable advertisements and commercials',
          icon: 'megaphone'
        },
        'Sports': {
          displayName: '90s Sports',
          description: 'Athletic achievements and legends',
          icon: 'target'
        },
        'Pop Culture': {
          displayName: '90s Pop Culture',
          description: 'Cultural phenomena and trends',
          icon: 'trending-up'
        },
        'Slang & Buzzwords': {
          displayName: '90s Slang',
          description: 'Popular slang and expressions',
          icon: 'message-circle'
        },
        'Internet & Tech Trends': {
          displayName: '90s Technology',
          description: 'Early internet and tech evolution',
          icon: 'wifi'
        },
        'Video Games': {
          displayName: '90s Video Games',
          description: 'Gaming culture and classics',
          icon: 'gamepad'
        }
      }
    },
    'friends-tv': {
      displayName: 'Friends',
      description: 'The beloved sitcom about six friends in NYC',
      dbTopicName: 'Friends',
      isNiche: true, // Use niche_trivia_questions table
      subTopics: {
        'Iconic Episodes': {
          displayName: 'Iconic Episodes',
          description: 'Most memorable Friends episodes',
          icon: 'tv'
        },
        'Character Arcs': {
          displayName: 'Character Arcs',
          description: 'Character development and growth',
          icon: 'user'
        },
        'Famous Quotes': {
          displayName: 'Famous Quotes',
          description: 'Classic Friends one-liners',
          icon: 'message-circle'
        },
        'Relationships & Dating': {
          displayName: 'Relationships & Dating',
          description: 'Love stories and relationships',
          icon: 'heart'
        },
        'Jobs & Careers': {
          displayName: 'Jobs & Careers',
          description: 'The gang\'s professional lives',
          icon: 'briefcase'
        },
        'Apartments & Locations': {
          displayName: 'Apartments & Locations',
          description: 'Iconic NYC spots and apartments',
          icon: 'home'
        },
        'Guest Stars': {
          displayName: 'Guest Stars',
          description: 'Celebrity appearances on the show',
          icon: 'star'
        },
        'Family & Backstories': {
          displayName: 'Family & Backstories',
          description: 'Character histories and families',
          icon: 'book-open'
        },
        'Pop Culture References': {
          displayName: 'Pop Culture References',
          description: 'Cultural references and parodies',
          icon: 'trending-up'
        },
        'Trivia & Goofs': {
          displayName: 'Trivia & Goofs',
          description: 'Fun facts and behind-the-scenes trivia',
          icon: 'eye'
        }
      }
    },
    // Add more topics as needed
  }
}; 