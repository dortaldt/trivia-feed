// A mapping of each category/topic to a specific background color
export const categoryColors: Record<string, string> = {
  // Main categories - full spectrum
  'Music': '#6200EA',           // Deep Purple
  'Entertainment': '#FF4081',   // Pink
  'Science': '#00B8D4',         // Cyan
  'History': '#D500F9',         // Purple
  'Pop Culture': '#FFD600',     // Yellow
  'Miscellaneous': '#FF9800',   // Orange
  'Literature': '#D50000',      // Red
  'Technology': '#304FFE',      // Indigo
  'Arts': '#F50057',            // Pink
  'Culture': '#9C27B0',         // Purple
  'Politics': '#651FFF',        // Deep Purple
  'Geography': '#00C853',       // Green
  'Chemistry': '#00BCD4',       // Cyan
  'Countries': '#3F51B5',       // Indigo
  'Nature': '#64DD17',          // Light Green
  'Biology': '#00C853',         // Green
  'Physics': '#FFD600',         // Yellow
  'Environment': '#4CAF50',     // Green
  'Ancient History': '#9C27B0', // Purple
  'Language': '#2962FF',        // Blue
  'Modern History': '#7E57C2',  // Deep Purple
  'Sports': '#FF6D00',          // Orange
  'Art': '#F50057',             // Pink
  'Astronomy': '#673AB7',       // Deep Purple
  'Engineering': '#FF5722',     // Deep Orange
  'Mathematics': '#00BFA5',     // Teal
  'General Knowledge': '#00BFA5', // Teal
  'Food and Drink': '#FF3D00',  // Deep Orange
  'Computers': '#0288D1',       // Light Blue
  'Math': '#00BFA5',            // Teal
  'Food': '#FF3D00',            // Deep Orange
  
  // Special categories
  'Modern Cinema': '#C51162',   // Pink
  'Mythology': '#AA00FF',       // Purple
  'Animals': '#76FF03',         // Light Green
  
  // Additional categories
  'Science Fiction': '#009688', // Teal
  'Video Games': '#AA00FF',     // Purple
  'Anime & Manga': '#E040FB',   // Light Purple
  'Architecture': '#FFB300',    // Amber
  'Business & Economics': '#00C853', // Green
  'Health & Medicine': '#D50000', // Red
  'Religion': '#3D5AFE',        // Indigo
  'Fashion': '#F50057',         // Pink
  'Transportation': '#2979FF',  // Blue
  'Space & Astronomy': '#6200EA', // Deep Purple
  'Comics & Superheroes': '#FF1744', // Red
  'Board Games': '#00E676',     // Green
  
  // Default fallback color
  'default': '#455A64'          // Blue Grey
};

// Import category colors from NeonColors for consistency
import { NeonCategoryColors, getCategoryColor as getNeonColor } from '@/constants/NeonColors';

// Function to get a color based on category
export function getCategoryColor(category: string, isNeonTheme = false): string {
  // If in neon theme, use the hex color from neon category colors
  if (isNeonTheme) {
    // Use the helper function from NeonColors
    return getNeonColor(category).hex;
  }
  
  // For standard theme, use the original colors
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