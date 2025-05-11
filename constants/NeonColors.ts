/**
 * Neon theme colors for the app
 */

// Base neon colors with increased vibrance for night club feel
const neonPrimary = '#00FFFF'; // Vibrant Cyan/Aqua
const neonSecondary = '#FF00FF'; // Vibrant Magenta (slightly adjusted for more pop)
const neonAccent = '#FFFF00'; // Vibrant Yellow

// Neon category colors for gradients
export const NeonCategoryColors: Record<string, { primary: string, secondary: string }> = {
  // Main categories with more vibrant and distinct neon gradients across the full spectrum
  'Science': { primary: '#00FFFF', secondary: '#00CCFF' },         // Cyan
  'Technology': { primary: '#3300FF', secondary: '#6600FF' },      // Deep Blue
  'History': { primary: '#FF00FF', secondary: '#CC00FF' },         // Magenta
  'Geography': { primary: '#00FF00', secondary: '#33FF66' },       // Green
  'Sports': { primary: '#FF8000', secondary: '#FF6600' },          // Orange
  'Movies': { primary: '#FF0066', secondary: '#FF0033' },          // Hot Pink
  'Music': { primary: '#9900FF', secondary: '#6600CC' },           // Purple
  'Television': { primary: '#00CCFF', secondary: '#0099FF' },      // Light Blue
  'Literature': { primary: '#FF0000', secondary: '#CC0000' },      // Red
  'Art': { primary: '#FF66FF', secondary: '#FF33CC' },             // Pink
  'Pop Culture': { primary: '#FFFF00', secondary: '#FFCC00' },     // Yellow
  'Food & Drink': { primary: '#FF3300', secondary: '#CC3300' },    // Red-Orange
  'General Knowledge': { primary: '#00FFCC', secondary: '#00CCAA' }, // Turquoise
  'Nature': { primary: '#66FF00', secondary: '#99FF33' },          // Lime
  'Politics': { primary: '#6600FF', secondary: '#3300CC' },        // Indigo
  'Celebrities': { primary: '#FFDD00', secondary: '#FFBB00' },     // Gold
  
  // Special categories
  'Modern Cinema': { primary: '#FF0099', secondary: '#CC0066' },   // Bright Pink
  'Mathematics': { primary: '#00FFAA', secondary: '#00CC88' },     // Sea Green
  'Language': { primary: '#0066FF', secondary: '#0044CC' },        // Royal Blue
  'Mythology': { primary: '#AA00FF', secondary: '#8800CC' },       // Violet
  'Animals': { primary: '#88FF00', secondary: '#66CC00' },         // Yellow-Green
  
  // Additional categories with unique neon colors
  'Science Fiction': { primary: '#00DDAA', secondary: '#00AA88' }, // Teal
  'Video Games': { primary: '#CC00FF', secondary: '#9900CC' },     // Bright Purple
  'Anime & Manga': { primary: '#FF99FF', secondary: '#FF66CC' },   // Pastel Pink
  'Architecture': { primary: '#FFAA00', secondary: '#FF8800' },    // Amber
  'Business & Economics': { primary: '#00DD66', secondary: '#00AA44' }, // Emerald
  'Health & Medicine': { primary: '#FF3366', secondary: '#CC0033' }, // Crimson
  'Religion': { primary: '#8888FF', secondary: '#6666CC' },        // Lavender
  'Fashion': { primary: '#FF33AA', secondary: '#CC0088' },         // Fuchsia
  'Transportation': { primary: '#33AAFF', secondary: '#0088DD' },  // Azure
  'Space & Astronomy': { primary: '#4400FF', secondary: '#2200CC' }, // Deep Indigo
  'Comics & Superheroes': { primary: '#FF2200', secondary: '#CC1100' }, // Scarlet
  'Board Games': { primary: '#00FF44', secondary: '#00CC33' },     // Spring Green
  
  // Default fallback color
  'default': { primary: '#00FFFF', secondary: '#FF00FF' }          // Cyan to Magenta
};

export const NeonColors = {
  light: {
    text: '#121212',
    background: '#FFFFFF',
    tint: neonPrimary,
    icon: neonSecondary,
    tabIconDefault: '#687076',
    tabIconSelected: neonPrimary,
    // Additional neon theme colors
    primary: neonPrimary,
    secondary: neonSecondary,
    accent: neonAccent,
    border: neonPrimary,
    card: '#F0F0F0',
    notification: neonSecondary,
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000', // Darker background for more contrast
    tint: neonPrimary,
    icon: neonSecondary,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: neonPrimary,
    // Additional neon theme colors
    primary: neonPrimary,
    secondary: neonSecondary,
    accent: neonAccent,
    border: neonPrimary,
    card: '#0D0D0D', // Darker card background
    notification: neonSecondary,
  },
}; 