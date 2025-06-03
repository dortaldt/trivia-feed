export interface TopicRingProgress {
  topic: string;
  level: number;
  currentProgress: number; // Current answers in this level
  targetAnswers: number; // Answers needed to complete this level
  totalCorrectAnswers: number; // All-time correct answers for this topic
  color: string; // Topic color
  icon: string; // Feather icon name
  // Add sub-topic support
  isSubTopic?: boolean;
  parentTopic?: string;
}

export interface TopicRingsState {
  rings: { [topic: string]: TopicRingProgress };
  lastUpdated: number;
}

export interface RingConfig {
  baseTargetAnswers: number; // Base number of answers needed for level 1
  scalingFactor: number; // How much to increase target for each level
  maxDisplayLevel: number; // Maximum level to show in UI
  // Add sub-topic mode configuration
  useSubTopics?: boolean;
}

// Default configuration - easy to adjust
export const DEFAULT_RING_CONFIG: RingConfig = {
  baseTargetAnswers: 5, // 5 correct answers for level 1
  scalingFactor: 1.2, // Each level requires 20% more answers
  maxDisplayLevel: 50, // Show up to level 50
};

// Topic to icon mapping (using Feather icon names)
// Comprehensive mapping for all topics in ALL_TOPICS
export const TOPIC_ICONS: { [key: string]: string } = {
  // Core academic topics
  'Science': 'zap',
  'History': 'book',
  'Geography': 'globe',
  'Mathematics': 'hash',
  'Math': 'hash', // Alias for Mathematics
  'Literature': 'feather',
  'Art': 'image',
  'Arts': 'image', // Alias for Art
  'Music': 'music',
  'Technology': 'cpu',
  'Physics': 'zap',
  'Chemistry': 'droplet',
  'Biology': 'heart',
  
  // Extended academic topics
  'Ancient History': 'book-open',
  'Modern History': 'clock',
  'Astronomy': 'star',
  'Engineering': 'tool',
  'Computers': 'monitor',
  'Language': 'message-circle',
  'Environment': 'wind',
  
  // Culture and entertainment
  'Entertainment': 'play-circle',
  'Pop Culture': 'trending-up',
  'Culture': 'users',
  'Movies': 'film',
  'Television': 'tv',
  'Video Games': 'play',
  
  // Geography and places
  'Countries': 'flag',
  'Nature': 'wind',
  'Animals': 'heart', // Since Feather doesn't have animal icons
  
  // General categories
  'Sports': 'activity',
  'Politics': 'users',
  'Economics': 'trending-up',
  'Philosophy': 'eye',
  'Medicine': 'heart',
  'Food': 'coffee',
  'Food and Drink': 'coffee',
  'General Knowledge': 'help-circle',
  'Miscellaneous': 'package',
  
  // Business and current affairs
  'Business': 'briefcase',
  'Current Events': 'calendar',
  'Celebrities': 'star',
  'Religion': 'book',
  'Mythology': 'shield',
  
  // Fallback
  'default': 'circle',
};

// Add sub-topic icon mapping with all 309 sub-topics from database
export const SUB_TOPIC_ICONS: { [key: string]: string } = {
  'Academy Awards': 'award',
  'Action-Comedy Films': 'film',
  'Adaptations': 'book-open',
  'Album Releases': 'disc',
  'Ancient Architecture': 'home',
  'Ancient Civilizations': 'book',
  'Animal Behavior': 'eye',
  'Animals': 'heart',
  'Animated Classics': 'play-circle',
  'Animated Films': 'film',
  'Animated Films & Series': 'film',
  'Animated Movies': 'film',
  'Animated Series': 'tv',
  'Animation': 'play-circle',
  'Animation & Cartoons': 'play-circle',
  'Animation History': 'clock',
  'Animation Series': 'tv',
  'Animation Techniques': 'edit',
  'Animation Technology': 'cpu',
  'Architectural Innovations': 'home',
  'Architecture': 'home',
  'Art Exhibitions': 'image',
  'Art History': 'book',
  'Art Movements': 'trending-up',
  'Art Principles': 'compass',
  'Art Techniques': 'edit',
  'Art and Performance': 'music',
  'Artificial Intelligence': 'cpu',
  'Artistic Collaborations': 'users',
  'Arts': 'image',
  'Asia': 'globe',
  'Audience Engagement': 'users',
  'Awards History': 'award',
  'Beauty Industry': 'star',
  'Biochemical Processes': 'droplet',
  'Biochemistry': 'droplet',
  'Biographical Films': 'film',
  'Biology': 'heart',
  'Botany': 'flower',
  'Box Office Hits': 'trending-up',
  'Box Office Records': 'bar-chart',
  'Building Engineering': 'tool',
  'Business Strategies': 'briefcase',
  'Cancer Biology': 'heart',
  'Capital Cities': 'map-pin',
  'Celebrities': 'star',
  'Celestial Observation': 'eye',
  'Cell Biology': 'heart',
  'Character Adaptations': 'user',
  'Chemical Bonds': 'link',
  'Chemical Compounds': 'layers',
  'Chemical Elements': 'hexagon',
  'Chemical Reactions': 'zap',
  'Cinematic Showdowns': 'video',
  'Civil Engineering': 'tool',
  'Civilizations': 'home',
  'Classic Art Movements': 'image',
  'Classic Films': 'film',
  'Classic Hollywood': 'star',
  'Classic Rock': 'headphones',
  'Classical Composers': 'music',
  'Classical Music': 'music',
  'Climate Change in Film': 'thermometer',
  'Cloud Computing': 'cloud',
  'Color Field Painting': 'droplet',
  'Comedy Films': 'smile',
  'Cometary Science': 'star',
  'Complex Systems': 'cpu',
  'Computer Science': 'cpu',
  'Computers': 'monitor',
  'Conductivity': 'zap',
  'Construction Techniques': 'tool',
  'Contemporary Art': 'image',
  'Contemporary Arts': 'image',
  'Contemporary Film': 'film',
  'Contemporary Practices': 'clock',
  'Contemporary Social Trends': 'trending-up',
  'Content Delivery': 'send',
  'Content Trends': 'trending-up',
  'Continental Nicknames': 'globe',
  'Cosmic Observations': 'eye',
  'Crossover Films': 'shuffle',
  'Culinary Arts': 'coffee',
  'Culinary Traditions': 'coffee',
  'Cult Classics': 'star',
  'Cultural Concepts': 'users',
  'Cultural Events': 'calendar',
  'Cultural Festivals': 'music',
  'Cultural Heritage': 'book',
  'Cultural Movements': 'trending-up',
  'Cultural Practices': 'users',
  'Cultural Representation': 'users',
  'Cultural Studies': 'book',
  'Cultural Traditions': 'users',
  'Current Trends': 'trending-up',
  'Curriculum Development': 'book-open',
  'Dada and Surrealism': 'image',
  'Dance': 'music',
  'Data Science': 'bar-chart',
  'Data Storage': 'database',
  'Decline of Empires': 'trending-down',
  'Developmental Biology': 'heart',
  'Digital Art': 'monitor',
  'Digital Media': 'smartphone',
  'Digital Media Trends': 'smartphone',
  'Disney Films': 'film',
  'Documentaries': 'film',
  'Documentary Film': 'film',
  'Documentary Films': 'film',
  'Documentary Series': 'tv',
  'Dystopian Fiction': 'alert-triangle',
  'Eclipses': 'sun',
  'Egyptian Civilization': 'triangle',
  'Egyptian History': 'book',
  'Electrical Engineering': 'zap',
  'Elements': 'hexagon',
  'Emerging Genres': 'shuffle',
  'Emerging Technologies': 'cpu',
  'Emerging Trends': 'trending-up',
  'Energy Efficiency': 'battery',
  'Energy Systems': 'zap',
  'Environmental Art': 'wind',
  'Environmental Biology': 'wind',
  'Environmental Documentaries': 'wind',
  'Environmental Engineering': 'wind',
  'Environmental Initiatives': 'wind',
  'Environmental Policies': 'wind',
  'Exhibitions': 'image',
  'Expressionism': 'image',
  'Family Animation': 'users',
  'Famous Artists': 'star',
  'Famous Artworks': 'image',
  'Fan Engagement': 'heart',
  'Fantasy Adaptations': 'book-open',
  'Fashion': 'trending-up',
  'Fashion Icons': 'trending-up',
  'Fashion Trends': 'trending-up',
  'Festivals': 'music',
  'Film': 'film',
  'Film Adaptations': 'film',
  'Film Awards': 'award',
  'Film Biopics': 'user',
  'Film Characters': 'user',
  'Film Crossover Events': 'shuffle',
  'Film Distribution': 'send',
  'Film Festivals': 'film',
  'Film Franchises': 'layers',
  'Film Genres': 'shuffle',
  'Film History': 'clock',
  'Film Industry': 'briefcase',
  'Film Innovation': 'lightbulb',
  'Film Production': 'settings',
  'Film Reboots': 'refresh-cw',
  'Film Releases': 'calendar',
  'Film Scores': 'music',
  'Film Studies': 'book',
  'Film Techniques': 'edit',
  'Film Technology': 'cpu',
  'Film Terminology': 'book-open',
  'Film Trends': 'trending-up',
  'Film Types': 'layers',
  'Film Universes': 'globe',
  'Film and Music': 'music',
  'Film and Social Media': 'smartphone',
  'Filmmaking Technology': 'video',
  'Films': 'film',
  'Folk Traditions': 'music',
  'Folklore': 'book',
  'Food & Cuisine': 'coffee',
  'Franchises': 'layers',
  'Fundamental Sciences': 'atom',
  'Gaming Trends': 'gamepad-2',
  'General Knowledge': 'help-circle',
  'Genre Theory': 'book-open',
  'Genres': 'shuffle',
  'Geographical Features': 'map',
  'Geographical Nicknames': 'map-pin',
  'Geographical Trivia': 'map',
  'Geography': 'globe',
  'Geopolitical Regions': 'globe',
  'Governance Systems': 'users',
  'Health': 'heart',
  'Heritage Conservation': 'shield',
  'Historical Art Movements': 'clock',
  'Historical Films': 'clock',
  'Historical Periods': 'clock',
  'History': 'book',
  'Horror Films': 'alert-triangle',
  'Human Anatomy': 'user',
  'Human Origins': 'users',
  'Hydroelectric Systems': 'droplet',
  'Iconic Characters': 'star',
  'Immersive Experiences': 'eye',
  'Immigration Policies': 'users',
  'Impressionism': 'image',
  'Improvisational Shows': 'mic',
  'Indian Festivals': 'calendar',
  'Industry Activism': 'megaphone',
  'Innovations in Cinema': 'lightbulb',
  'Innovations in Film': 'lightbulb',
  'Innovative Artists': 'lightbulb',
  'Innovative Policies': 'lightbulb',
  'Innovative Technologies': 'cpu',
  'Installation Art': 'package',
  'Interactive Art': 'mouse-pointer',
  'Interactive Films': 'mouse-pointer',
  'Interactive Media': 'smartphone',
  'Interdisciplinary Practices': 'shuffle',
  'International Agreements': 'handshake',
  'International Cinema': 'globe',
  'International Events': 'globe',
  'Language Acquisition': 'message-circle',
  'Life Sciences': 'heart',
  'Literary Arts': 'feather',
  'Literature': 'book-open',
  'Live Action Series': 'tv',
  'Live Concerts': 'music',
  'Logic & Riddles': 'help-circle',
  'Mammalogy': 'heart',
  'Manufacturing Processes': 'settings',
  'Marine Biology': 'droplet',
  'Material Science': 'layers',
  'Mathematics': 'hash',
  'Mechanical Systems': 'settings',
  'Media Innovation': 'lightbulb',
  'Media Trends': 'trending-up',
  'Memes & Internet Culture': 'smile',
  'Microbiology': 'eye',
  'Mixed Media Art': 'layers',
  'Modern Art': 'image',
  'Modern Art Movements': 'trending-up',
  'Modern Cinema': 'video',
  'Modern Trends': 'trending-up',
  'Modernist Poetry': 'feather',
  'Movies': 'film',
  'Murals': 'image',
  'Music': 'music',
  'Music Albums': 'disc',
  'Music Fusion': 'shuffle',
  'Music Technology': 'cpu',
  'Music and Gaming': 'gamepad-2',
  'Mythology': 'shield',
  'Natural Disasters': 'alert-triangle',
  'Neuroscience': 'brain',
  'New Media Art': 'smartphone',
  'North America': 'globe',
  'Operating Systems': 'monitor',
  'Organic Chemistry': 'droplet',
  'Organism Studies': 'eye',
  'Painting': 'image',
  'Painting Techniques': 'edit',
  'Paintings': 'image',
  'Performance Art': 'music',
  'Performing Arts': 'music',
  'Periodic Table': 'grid',
  'Philosophy': 'eye',
  'Planetary Science': 'globe',
  'Poetry': 'feather',
  'Pop Art': 'image',
  'Pop Music Trends': 'radio',
  'Post-Impressionism': 'image',
  'Programming': 'code',
  'Programming Paradigms': 'code',
  'Public Art': 'image',
  'Public Installations': 'package',
  'Quality of Life': 'heart',
  'Reactions': 'zap',
  'Recent Discoveries': 'search',
  'Regenerative Biology': 'refresh-cw',
  'Renaissance': 'clock',
  'Renaissance Art': 'image',
  'Renewable Energy': 'sun',
  'Riddles & Brain Teasers': 'help-circle',
  'Roman Architecture': 'home',
  'Roman Civilization': 'home',
  'Sculpture': 'package',
  'Shakespearean Plays': 'feather',
  'Smart Technology': 'cpu',
  'Smartphone Technology': 'smartphone',
  'Societal Structures': 'users',
  'Software Development': 'code',
  'Solar System': 'sun',
  'Space Exploration': 'rocket',
  'Stellar Formation': 'star',
  'Stellar Observation': 'eye',
  'Stellar Phenomena': 'star',
  'Street Art': 'image',
  'Structural Engineering': 'home',
  'Surrealism': 'image',
  'Sustainability': 'leaf',
  'Sustainable Art': 'leaf',
  'Sustainable Art Practices': 'leaf',
  'Sustainable Construction': 'leaf',
  'Sustainable Design': 'leaf',
  'Sustainable Engineering': 'leaf',
  'Sustainable Materials': 'leaf',
  'Sustainable Practices': 'leaf',
  'Tech Entrepreneurs': 'briefcase',
  'Technology': 'cpu',
  'Technology in Art': 'cpu',
  'Technology in Arts': 'cpu',
  'Thermochemistry': 'thermometer',
  'Urban Engineering': 'home',
  'Urban Geography': 'map',
  'Urban Planning': 'map',
  'Visual Arts': 'image',
  'Web Development': 'code',
  'Web Technologies': 'globe',
  'Women\'s Rights': 'users',
  
  // Additional Music-specific sub-topics that weren't in database but might exist
  'Vocal Music': 'mic',
  'Music Production': 'settings',
  'Genre Blending': 'shuffle',
  'Music History': 'clock',
  'Musical Instruments': 'music',
  'Song Writing': 'edit',
  'Audio Engineering': 'volume-2',
  'Electronic Music': 'cpu',
  'Folk Music': 'music',
  'World Music': 'globe',
  'Jazz & Blues': 'volume-2',
  'Theater & Musicals': 'play',
  'Music Theory': 'book-open',
  'Rock & Roll History': 'headphones',
  
  // Fallback
  'default': 'circle',
};

// Function to get sub-topic icon with parent topic fallback
export const getSubTopicIcon = (subTopic: string, parentTopic?: string): string => {
  // First, try to get the sub-topic specific icon
  if (SUB_TOPIC_ICONS[subTopic]) {
    return SUB_TOPIC_ICONS[subTopic];
  }
  
  // If no sub-topic icon found, fall back to parent topic icon
  if (parentTopic) {
    // Map the app config topic names to the database topic names for fallback
    const topicMapping: { [key: string]: string } = {
      'music': 'Music',
      'science': 'Science', 
      'history': 'History',
      'entertainment': 'Entertainment',
      'default': 'General Knowledge'
    };
    
    // Get the database topic name
    const dbTopicName = topicMapping[parentTopic.toLowerCase()] || parentTopic;
    
    // Try the database topic name first
    if (TOPIC_ICONS[dbTopicName]) {
      return TOPIC_ICONS[dbTopicName];
    }
    
    // Try the original parent topic name
    if (TOPIC_ICONS[parentTopic]) {
      return TOPIC_ICONS[parentTopic];
    }
    
    // Try common variations
    const variations = [
      parentTopic.charAt(0).toUpperCase() + parentTopic.slice(1), // Capitalize first letter
      parentTopic.toLowerCase(),
      parentTopic.toUpperCase()
    ];
    
    for (const variation of variations) {
      if (TOPIC_ICONS[variation]) {
        return TOPIC_ICONS[variation];
      }
    }
  }
  
  // Final fallback to default icon
  return SUB_TOPIC_ICONS.default;
};

 