// A mapping of each category/topic to a specific background color
export const categoryColors: Record<string, string> = {
  // Main categories
  'Science': '#3498db',         // Blue
  'Technology': '#2980b9',      // Darker blue
  'History': '#8e44ad',         // Purple
  'Geography': '#27ae60',       // Green
  'Sports': '#e67e22',          // Orange
  'Movies': '#7f8c8d',          // Gray
  'Music': '#9b59b6',           // Light purple
  'Television': '#34495e',      // Dark blue-gray
  'Literature': '#c0392b',      // Dark red
  'Art': '#e74c3c',             // Red
  'Pop Culture': '#f39c12',     // Yellow-orange
  'Food & Drink': '#d35400',    // Dark orange
  'General Knowledge': '#16a085', // Teal
  'Nature': '#2ecc71',          // Light green
  'Politics': '#95a5a6',        // Light gray
  'Celebrities': '#f1c40f',     // Yellow
  
  // Special categories
  'Modern Cinema': '#2c3e50',   // Navy
  'Mathematics': '#1abc9c',     // Turquoise
  'Language': '#3498db',        // Blue
  'Mythology': '#8e44ad',       // Purple
  'Animals': '#27ae60',         // Green
  
  // Default fallback color
  'default': '#34495e'          // Dark blue-gray
};

// Function to get a color based on category
export function getCategoryColor(category: string): string {
  // Try to get direct match
  if (categoryColors[category]) {
    return categoryColors[category];
  }
  
  // Try to find a partial match
  const partialMatch = Object.keys(categoryColors).find(key => 
    category.toLowerCase().includes(key.toLowerCase()) || 
    key.toLowerCase().includes(category.toLowerCase())
  );
  
  if (partialMatch) {
    return categoryColors[partialMatch];
  }
  
  // Return default color if no match found
  return categoryColors.default;
} 