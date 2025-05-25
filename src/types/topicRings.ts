export interface TopicRingProgress {
  topic: string;
  level: number;
  currentProgress: number; // Current answers in this level
  targetAnswers: number; // Answers needed to complete this level
  totalCorrectAnswers: number; // All-time correct answers for this topic
  color: string; // Topic color
  icon: string; // Feather icon name
}

export interface TopicRingsState {
  rings: { [topic: string]: TopicRingProgress };
  lastUpdated: number;
}

export interface RingConfig {
  baseTargetAnswers: number; // Base number of answers needed for level 1
  scalingFactor: number; // How much to increase target for each level
  maxDisplayLevel: number; // Maximum level to show in UI
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

 