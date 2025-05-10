/**
 * Neon theme colors for the app
 */

const neonPrimary = '#00FFFF'; // Cyan/Aqua
const neonSecondary = '#FF10F0'; // Magenta
const neonAccent = '#FFFF00'; // Yellow

// Neon category colors for gradients
export const NeonCategoryColors: Record<string, { primary: string, secondary: string }> = {
  // Main categories with vibrant neon gradients
  'Science': { primary: '#00FFFF', secondary: '#0080FF' },         // Cyan to Blue
  'Technology': { primary: '#0080FF', secondary: '#0040FF' },      // Blue to Deep Blue  
  'History': { primary: '#FF10F0', secondary: '#8000FF' },         // Pink to Purple
  'Geography': { primary: '#00FF80', secondary: '#00FF00' },       // Teal to Green
  'Sports': { primary: '#FF8000', secondary: '#FF4000' },          // Orange
  'Movies': { primary: '#FF10F0', secondary: '#C000FF' },          // Pink to Purple
  'Music': { primary: '#C000FF', secondary: '#8000FF' },           // Purple
  'Television': { primary: '#0040FF', secondary: '#6000FF' },      // Blue to Purple
  'Literature': { primary: '#FF0040', secondary: '#FF0080' },      // Red to Pink
  'Art': { primary: '#FF0080', secondary: '#FF10F0' },             // Pink
  'Pop Culture': { primary: '#FFFF00', secondary: '#FF8000' },     // Yellow to Orange
  'Food & Drink': { primary: '#FF4000', secondary: '#FF0000' },    // Orange to Red
  'General Knowledge': { primary: '#00FFFF', secondary: '#00FF80' }, // Cyan to Teal
  'Nature': { primary: '#00FF80', secondary: '#80FF00' },          // Teal to Lime
  'Politics': { primary: '#C0C0FF', secondary: '#8080FF' },        // Light Purple
  'Celebrities': { primary: '#FFFF00', secondary: '#FFFF80' },     // Yellow
  
  // Special categories
  'Modern Cinema': { primary: '#FF10F0', secondary: '#FF0080' },   // Pink
  'Mathematics': { primary: '#00FFFF', secondary: '#00FF80' },     // Cyan to Teal
  'Language': { primary: '#0080FF', secondary: '#0040FF' },        // Blue
  'Mythology': { primary: '#8000FF', secondary: '#6000FF' },       // Purple
  'Animals': { primary: '#00FF40', secondary: '#80FF00' },         // Green to Lime
  
  // Default fallback color
  'default': { primary: '#00FFFF', secondary: '#FF10F0' }          // Cyan to Pink
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
    background: '#121212',
    tint: neonPrimary,
    icon: neonSecondary,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: neonPrimary,
    // Additional neon theme colors
    primary: neonPrimary,
    secondary: neonSecondary,
    accent: neonAccent,
    border: neonPrimary,
    card: '#1E1E1E',
    notification: neonSecondary,
  },
}; 