// Define colors for different topic categories
export const topicColors: Record<string, string> = {
  // Academic topics
  'Science': '#4CAF50',          // Green
  'History': '#FFC107',          // Amber
  'Geography': '#2196F3',        // Blue
  'Literature': '#9C27B0',       // Purple
  'Math': '#F44336',             // Red
  'Art': '#FF9800',              // Orange
  'Arts': '#FF9800',             // Orange (alias)
  'Music': '#E91E63',            // Pink
  'Technology': '#607D8B',       // Blue Gray
  'Engineering': '#795548',      // Brown
  'Nature': '#8BC34A',           // Light Green
  'Politics': '#9E9E9E',         // Gray
  'Sports': '#03A9F4',           // Light Blue
  'Movies': '#673AB7',           // Deep Purple
  'Entertainment': '#673AB7',    // Deep Purple (alias)
  'Miscellaneous': '#795548',    // Brown
  'General Knowledge': '#009688', // Teal
  'Pop Culture': '#FF5722',      // Deep Orange
  
  // Default color for unknown topics
  'default': '#009688'           // Teal
};

// Function to get a color for a given topic
// Renamed from getCategoryColor but keeping parameter name for backward compatibility
export function getTopicColor(category: string): string {
  // Try direct match first (case insensitive)
  const lowerCategory = category.toLowerCase();
  
  // Exact match (case-insensitive)
  if (topicColors[category]) {
    return topicColors[category];
  }
  
  // Try partial match (if "History" isn't found, but "American History" is provided, use History's color)
  const partialMatch = Object.keys(topicColors).find(key => 
    lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)
  );
  
  if (partialMatch) {
    // console.log(`Using color for "${partialMatch}" as a match for "${category}"`);
    return topicColors[partialMatch];
  }
  
  // Default fallback color
  return topicColors.default;
}

// Export old function name for backward compatibility
export const getCategoryColor = getTopicColor; 