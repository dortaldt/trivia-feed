/**
 * Neon theme colors for the app
 */

// Base neon colors with increased vibrance for night club feel
const neonPrimary = '#00FFFF'; // Vibrant Cyan/Aqua
const neonSecondary = '#FF00FF'; // Vibrant Magenta (slightly adjusted for more pop)
const neonAccent = '#FFFF00'; // Vibrant Yellow

// Helper function to adjust hex color brightness
const adjustHexBrightness = (hex: string, percent: number): string => {
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const adjustBrightness = (value: number) => {
    return Math.max(0, Math.min(255, value + (value * percent / 100)));
  };
  
  const newR = Math.round(adjustBrightness(r)).toString(16).padStart(2, '0');
  const newG = Math.round(adjustBrightness(g)).toString(16).padStart(2, '0');
  const newB = Math.round(adjustBrightness(b)).toString(16).padStart(2, '0');
  
  return `#${newR}${newG}${newB}`;
};

// Type definition with backward compatibility
interface NeonColor {
  name: string;
  hex: string;
  rgb: string;
  // For backward compatibility
  primary?: string;
  secondary?: string;
}

// Helper to create colors with backward compatibility
const createNeonColor = (name: string, hex: string, rgb: string): NeonColor => ({
  name,
  hex,
  rgb,
  // Add backward compatibility fields
  primary: hex,
  secondary: adjustHexBrightness(hex, -15) // Create a slightly darker secondary color
});

// Neon category colors with vibrant distinct colors
export const NeonCategoryColors: Record<string, NeonColor> = {
  "History": createNeonColor("Virtual Violet", "#8A00FF", "138, 0, 255"),
  "Geography": createNeonColor("Digital Sky", "#38B6FF", "56, 182, 255"),
  "Science": createNeonColor("Toxic Green", "#00FF8F", "0, 255, 143"),
  "Entertainment": createNeonColor("Hot Pink", "#FF10F0", "255, 16, 240"),
  "Sports": createNeonColor("Blaze Orange", "#FF6700", "255, 103, 0"),
  "Art & Literature": createNeonColor("Plasma Pink", "#FF71CE", "255, 113, 206"),
  "Technology": createNeonColor("Electric Blue", "#0AEFFF", "10, 239, 255"),
  "Food & Drink": createNeonColor("Power Peach", "#FFAA5E", "255, 170, 94"),
  "Music": createNeonColor("Electric Purple", "#BC13FE", "188, 19, 254"),
  "Movies": createNeonColor("Neon Red", "#FF3131", "255, 49, 49"),
  "Television": createNeonColor("Shocking Orange", "#FF5F1F", "255, 95, 31"),
  "Video Games": createNeonColor("Plasma Blue", "#1F51FF", "31, 81, 255"),
  "Nature & Animals": createNeonColor("Radioactive Green", "#7FFF00", "127, 255, 0"),
  "Politics": createNeonColor("Arcade Magenta", "#CB198F", "203, 25, 143"),
  "Mathematics": createNeonColor("Digital Lime", "#C1FF00", "193, 255, 0"),
  "Mythology": createNeonColor("Electric Indigo", "#6600FF", "102, 0, 255"),
  "Religion": createNeonColor("Aqua Blast", "#01FFFF", "1, 255, 255"),
  "Current Events": createNeonColor("Quantum Coral", "#FF6E4A", "255, 110, 74"),
  "Language": createNeonColor("Vivid Raspberry", "#FF0F80", "255, 15, 128"),
  "Celebrities": createNeonColor("Highlighter Yellow", "#FFF01F", "255, 240, 31"),
  "Business & Economics": createNeonColor("Cyber Teal", "#00FFCD", "0, 255, 205"),
  "Philosophy": createNeonColor("Cyber Yellow", "#FFD300", "255, 211, 0"),
  "Pop Culture": createNeonColor("Acid Green", "#39FF14", "57, 255, 20"),
  "General Knowledge": createNeonColor("Laser Lemon", "#FFFC00", "255, 252, 0"),
  
  // Backwards compatibility and fallbacks
  "Literature": createNeonColor("Plasma Pink", "#FF71CE", "255, 113, 206"),
  "Art": createNeonColor("Plasma Pink", "#FF71CE", "255, 113, 206"),
  "Nature": createNeonColor("Radioactive Green", "#7FFF00", "127, 255, 0"),
  "Animals": createNeonColor("Radioactive Green", "#7FFF00", "127, 255, 0"),
  "default": createNeonColor("Electric Blue", "#0AEFFF", "10, 239, 255")
};

// Helper function to get color for a category
export const getCategoryColor = (category: string) => {
  return NeonCategoryColors[category] || NeonCategoryColors["default"];
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