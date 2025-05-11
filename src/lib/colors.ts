// A mapping of each category/topic to a specific background color
export const categoryColors: Record<string, string> = {
  // Main categories - full spectrum
  'Science': '#00B8D4',         // Cyan
  'Technology': '#304FFE',      // Indigo
  'History': '#D500F9',         // Purple
  'Geography': '#00C853',       // Green
  'Sports': '#FF6D00',          // Orange
  'Movies': '#FF1744',          // Red-Pink
  'Music': '#6200EA',           // Deep Purple
  'Television': '#0091EA',      // Light Blue
  'Literature': '#D50000',      // Red
  'Art': '#F50057',             // Pink
  'Pop Culture': '#FFD600',     // Yellow
  'Food & Drink': '#FF3D00',    // Deep Orange
  'General Knowledge': '#00BFA5', // Teal
  'Nature': '#64DD17',          // Light Green
  'Politics': '#651FFF',        // Deep Purple
  'Celebrities': '#FFC400',     // Amber
  
  // Special categories
  'Modern Cinema': '#C51162',   // Pink
  'Mathematics': '#00BFA5',     // Teal
  'Language': '#2962FF',        // Blue
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