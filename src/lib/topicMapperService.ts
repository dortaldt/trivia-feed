/**
 * TopicMapper - A service that maps topics to related topics
 * This helps discover new content while staying relevant to user interests
 */

// Map of topics to related topics
// This could be expanded based on actual topics in the database
// and could be moved to a database table for dynamic updates
const TOPIC_RELATIONS: Record<string, string[]> = {
  // Science topics
  'Science': ['Physics', 'Biology', 'Chemistry', 'Astronomy', 'Technology'],
  'Physics': ['Science', 'Astronomy', 'Mathematics'],
  'Biology': ['Science', 'Medicine', 'Nature'],
  'Chemistry': ['Science', 'Medicine', 'Physics'],
  'Astronomy': ['Science', 'Physics', 'Space'],
  'Technology': ['Science', 'Computers', 'Engineering'],
  
  // History topics
  'History': ['Ancient History', 'Modern History', 'Politics', 'Geography'],
  'Ancient History': ['History', 'Archaeology', 'Mythology'],
  'Modern History': ['History', 'Politics', 'Geography'],
  
  // Geography topics
  'Geography': ['History', 'Nature', 'Countries'],
  'Countries': ['Geography', 'Culture', 'Politics'],
  
  // Arts and Entertainment
  'Arts': ['Literature', 'Music', 'Visual Arts', 'Movies'],
  'Literature': ['Arts', 'History', 'Language'],
  'Music': ['Arts', 'Entertainment', 'Culture'],
  'Movies': ['Arts', 'Entertainment', 'Pop Culture'],
  
  // Sports and Games
  'Sports': ['Olympics', 'Team Sports', 'Athletics'],
  'Games': ['Video Games', 'Board Games', 'Puzzles'],
  
  // Food and Cuisine
  'Food': ['Cooking', 'Cuisine', 'Nutrition'],
  'Cuisine': ['Food', 'Culture', 'Geography'],
  
  // General Knowledge
  'General Knowledge': ['Trivia', 'Facts', 'Science', 'History'],
  'Trivia': ['General Knowledge', 'Entertainment', 'Pop Culture'],
  
  // Add more mappings as needed
};

// Fallback topics when a specific mapping isn't found
const DEFAULT_RELATED_TOPICS = ['General Knowledge', 'Trivia', 'Science', 'History'];

export class TopicMapper {
  /**
   * Get related topics for a given topic
   * @param topic The main topic
   * @param count Maximum number of related topics to return
   * @returns Array of related topics
   */
  getRelatedTopics(topic: string, count: number = 2): string[] {
    // Try to find exact match first
    if (TOPIC_RELATIONS[topic]) {
      // Return a random subset of related topics
      const related = TOPIC_RELATIONS[topic];
      if (related.length <= count) {
        return related;
      }
      
      // Shuffle and take the first count elements
      return this.shuffleArray(related).slice(0, count);
    }
    
    // Try case-insensitive match
    const lowerTopic = topic.toLowerCase();
    for (const [key, value] of Object.entries(TOPIC_RELATIONS)) {
      if (key.toLowerCase() === lowerTopic) {
        return this.shuffleArray(value).slice(0, count);
      }
    }
    
    // Return default topics if no match found
    return this.shuffleArray(DEFAULT_RELATED_TOPICS).slice(0, count);
  }
  
  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Singleton instance
let topicMapperInstance: TopicMapper | null = null;

/**
 * Get the TopicMapper instance
 */
export function getTopicMapper(): TopicMapper {
  if (!topicMapperInstance) {
    topicMapperInstance = new TopicMapper();
  }
  return topicMapperInstance;
} 