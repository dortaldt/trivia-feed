import Constants from 'expo-constants';

// Get topic configuration from app config
const expoExtra = Constants.expoConfig?.extra;
const activeTopic = expoExtra?.activeTopic;
const topics = expoExtra?.topics || {};

/**
 * Interface for topic configuration
 */
interface TopicConfig {
  displayName: string;
  description: string;
  dbTopicName: string | null;
  isNiche: boolean;
  subTopics?: any;
}

/**
 * Determines which trivia table to use based on the current topic configuration
 * @returns {string} The table name to use ('trivia_questions' or 'niche_trivia_questions')
 */
export function getTriviaTableName(): string {
  // Default to standard table
  if (!activeTopic || activeTopic === 'default') {
    return 'trivia_questions';
  }

  // Get the topic configuration
  const topicConfig = topics[activeTopic] as TopicConfig;
  
  if (!topicConfig) {
    console.warn(`No configuration found for topic: ${activeTopic}. Using standard table.`);
    return 'trivia_questions';
  }

  // Return the appropriate table based on isNiche flag
  return topicConfig.isNiche ? 'niche_trivia_questions' : 'trivia_questions';
}

/**
 * Determines which trivia table to use for a specific topic
 * @param {string} topicKey - The topic key to check
 * @returns {string} The table name to use ('trivia_questions' or 'niche_trivia_questions')
 */
export function getTriviaTableNameForTopic(topicKey: string): string {
  // Default to standard table for default topic
  if (!topicKey || topicKey === 'default') {
    return 'trivia_questions';
  }

  // Get the topic configuration
  const topicConfig = topics[topicKey] as TopicConfig;
  
  if (!topicConfig) {
    console.warn(`No configuration found for topic: ${topicKey}. Using standard table.`);
    return 'trivia_questions';
  }

  // Return the appropriate table based on isNiche flag
  return topicConfig.isNiche ? 'niche_trivia_questions' : 'trivia_questions';
}

/**
 * Check if the current active topic is using the niche table
 * @returns {boolean} True if using niche table, false otherwise
 */
export function isUsingNicheTable(): boolean {
  return getTriviaTableName() === 'niche_trivia_questions';
}

/**
 * Check if a specific topic is using the niche table
 * @param {string} topicKey - The topic key to check
 * @returns {boolean} True if using niche table, false otherwise
 */
export function isTopicUsingNicheTable(topicKey: string): boolean {
  return getTriviaTableNameForTopic(topicKey) === 'niche_trivia_questions';
}

/**
 * Get all topic configurations
 * @returns {Record<string, TopicConfig>} All topic configurations
 */
export function getAllTopics(): Record<string, TopicConfig> {
  return topics;
}

/**
 * Get the current active topic configuration
 * @returns {TopicConfig | null} The active topic configuration or null if not found
 */
export function getActiveTopicConfig(): TopicConfig | null {
  if (!activeTopic || activeTopic === 'default') {
    return null;
  }

  return topics[activeTopic] as TopicConfig || null;
} 