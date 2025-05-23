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
export const TOPIC_ICONS: { [key: string]: string } = {
  'Science': 'zap',
  'History': 'book',
  'Sports': 'activity',
  'Geography': 'globe',
  'Mathematics': 'hash',
  'Literature': 'feather',
  'Art': 'image',
  'Music': 'music',
  'Technology': 'cpu',
  'Nature': 'leaf',
  'Politics': 'users',
  'Economics': 'trending-up',
  'Philosophy': 'eye',
  'Medicine': 'heart',
  'Physics': 'atom',
  'Chemistry': 'flask',
  'Biology': 'dna',
  'default': 'circle', // Fallback icon
};

// Topic colors - can be customized
export const TOPIC_COLORS: { [key: string]: string } = {
  'Science': '#00D4FF',
  'History': '#FF6B35',
  'Sports': '#32CD32',
  'Geography': '#4169E1',
  'Mathematics': '#9370DB',
  'Literature': '#FF69B4',
  'Art': '#FFD700',
  'Music': '#FF1493',
  'Technology': '#00CED1',
  'Nature': '#228B22',
  'Politics': '#DC143C',
  'Economics': '#DAA520',
  'Philosophy': '#8A2BE2',
  'Medicine': '#FF4500',
  'Physics': '#1E90FF',
  'Chemistry': '#32CD32',
  'Biology': '#FF6347',
  'default': '#999999', // Fallback color
}; 