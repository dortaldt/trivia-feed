/**
 * Neon theme colors for the app
 */

// Base neon colors with increased vibrance for night club feel
const neonPrimary = '#00FFFF'; // Vibrant Cyan/Aqua
const neonSecondary = '#FF00FF'; // Vibrant Magenta (slightly adjusted for more pop)
const neonAccent = '#FFFF00'; // Vibrant Yellow

// Neon category colors for gradients
export const NeonCategoryColors: Record<string, { primary: string, secondary: string }> = {
  // Main categories with more vibrant neon gradients
  'Science': { primary: '#00FFFF', secondary: '#0080FF' },         // Cyan to Blue
  'Technology': { primary: '#00CDFF', secondary: '#0050FF' },      // Bright Cyan to Deep Blue  
  'History': { primary: '#FF00FF', secondary: '#8A00FF' },         // Magenta to Purple
  'Geography': { primary: '#00FF80', secondary: '#00FF00' },       // Teal to Green
  'Sports': { primary: '#FF8000', secondary: '#FF2000' },          // Orange
  'Movies': { primary: '#FF00FF', secondary: '#C000FF' },          // Magenta to Purple
  'Music': { primary: '#BF00FF', secondary: '#7000FF' },           // Purple
  'Television': { primary: '#0040FF', secondary: '#6000FF' },      // Blue to Purple
  'Literature': { primary: '#FF0040', secondary: '#FF0080' },      // Red to Pink
  'Art': { primary: '#FF0080', secondary: '#FF00FF' },             // Pink
  'Pop Culture': { primary: '#FFFF00', secondary: '#FF8000' },     // Yellow to Orange
  'Food & Drink': { primary: '#FF4000', secondary: '#FF0000' },    // Orange to Red
  'General Knowledge': { primary: '#00FFFF', secondary: '#00FF80' }, // Cyan to Teal
  'Nature': { primary: '#00FF80', secondary: '#80FF00' },          // Teal to Lime
  'Politics': { primary: '#C000FF', secondary: '#8000FF' },        // More vibrant purple
  'Celebrities': { primary: '#FFFF00', secondary: '#FFFF80' },     // Yellow
  
  // Special categories
  'Modern Cinema': { primary: '#FF00FF', secondary: '#FF0080' },   // Magenta to Pink
  'Mathematics': { primary: '#00FFFF', secondary: '#00FF80' },     // Cyan to Teal
  'Language': { primary: '#0080FF', secondary: '#0040FF' },        // Blue
  'Mythology': { primary: '#8A00FF', secondary: '#6000FF' },       // Bright Purple
  'Animals': { primary: '#00FF40', secondary: '#80FF00' },         // Green to Lime
  
  // Additional categories with unique neon colors
  'Science Fiction': { primary: '#00FFAA', secondary: '#00CCFF' }, // Teal to Bright Blue
  'Video Games': { primary: '#FF00AA', secondary: '#AA00FF' },     // Hot Pink to Purple
  'Anime & Manga': { primary: '#FF66EE', secondary: '#EE66FF' },   // Bright Pink
  'Architecture': { primary: '#FFAA00', secondary: '#FF6600' },    // Gold to Orange
  'Business & Economics': { primary: '#00FF66', secondary: '#00AA33' }, // Bright Green
  'Health & Medicine': { primary: '#FF3366', secondary: '#FF0033' }, // Bright Red
  'Religion': { primary: '#AAAAFF', secondary: '#6666FF' },        // Light Blue to Medium Blue
  'Fashion': { primary: '#FF66AA', secondary: '#FF3399' },         // Pink to Hot Pink
  'Transportation': { primary: '#33CCFF', secondary: '#0099FF' },  // Sky Blue
  'Space & Astronomy': { primary: '#4D00FF', secondary: '#3300AA' }, // Deep Purple to Indigo
  'Comics & Superheroes': { primary: '#FF3300', secondary: '#CC0000' }, // Bright Red to Dark Red
  'Board Games': { primary: '#33FF33', secondary: '#00CC00' },     // Bright Green
  
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