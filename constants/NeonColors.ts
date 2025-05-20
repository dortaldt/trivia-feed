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

// Neon topic colors with vibrant distinct colors
export const NeonTopicColors: Record<string, NeonColor> = {
  // Top topics from database
  "Music": createNeonColor("Electric Purple", "#BC13FE", "188, 19, 254"),
  "Entertainment": createNeonColor("Hot Pink", "#FF10F0", "255, 16, 240"),
  "Science": createNeonColor("Toxic Green", "#00FF8F", "0, 255, 143"),
  "History": createNeonColor("Virtual Violet", "#8A00FF", "138, 0, 255"),
  "Pop Culture": createNeonColor("Acid Green", "#39FF14", "57, 255, 20"),
  "Miscellaneous": createNeonColor("Cyber Orange", "#FF9500", "255, 149, 0"),
  "Literature": createNeonColor("Plasma Pink", "#FF71CE", "255, 113, 206"),
  "Technology": createNeonColor("Electric Blue", "#0AEFFF", "10, 239, 255"),
  "Arts": createNeonColor("Plasma Pink", "#FF71CE", "255, 113, 206"),
  "Culture": createNeonColor("Vibrant Magenta", "#FF00B8", "255, 0, 184"),
  "Politics": createNeonColor("Arcade Magenta", "#CB198F", "203, 25, 143"),
  "Geography": createNeonColor("Digital Sky", "#38B6FF", "56, 182, 255"),
  "Chemistry": createNeonColor("Toxic Teal", "#00FFCD", "0, 255, 205"),
  "Countries": createNeonColor("Geo Blue", "#4355FF", "67, 85, 255"),
  "Nature": createNeonColor("Radioactive Green", "#7FFF00", "127, 255, 0"),
  "Biology": createNeonColor("Bio Green", "#00D68F", "0, 214, 143"),
  "Physics": createNeonColor("Energy Yellow", "#FFE500", "255, 229, 0"),
  "Environment": createNeonColor("Earth Green", "#00E676", "0, 230, 118"),
  "Ancient History": createNeonColor("Ancient Gold", "#FFD700", "255, 215, 0"),
  "Language": createNeonColor("Vivid Raspberry", "#FF0F80", "255, 15, 128"),
  "Modern History": createNeonColor("Modern Blue", "#4F5FFF", "79, 95, 255"),
  "Sports": createNeonColor("Blaze Orange", "#FF6700", "255, 103, 0"),
  "Art": createNeonColor("Artistic Pink", "#FF71CE", "255, 113, 206"),
  "Astronomy": createNeonColor("Cosmic Purple", "#9966FF", "153, 102, 255"),
  "Engineering": createNeonColor("Engineer Orange", "#FF5722", "255, 87, 34"),
  "Mathematics": createNeonColor("Digital Lime", "#C1FF00", "193, 255, 0"),
  "General Knowledge": createNeonColor("Laser Lemon", "#FFFC00", "255, 252, 0"),
  "Food and Drink": createNeonColor("Power Peach", "#FFAA5E", "255, 170, 94"),
  "Computers": createNeonColor("Digital Cyan", "#00FFFF", "0, 255, 255"),
  "Math": createNeonColor("Digital Lime", "#C1FF00", "193, 255, 0"),
  "Food": createNeonColor("Power Peach", "#FFAA5E", "255, 170, 94"),
  
  // Additional useful topics
  "Movies": createNeonColor("Neon Red", "#FF3131", "255, 49, 49"),
  "Television": createNeonColor("Shocking Orange", "#FF5F1F", "255, 95, 31"),
  "Video Games": createNeonColor("Plasma Blue", "#1F51FF", "31, 81, 255"),
  "Nature & Animals": createNeonColor("Radioactive Green", "#7FFF00", "127, 255, 0"),
  "Mythology": createNeonColor("Electric Indigo", "#6600FF", "102, 0, 255"),
  "Religion": createNeonColor("Aqua Blast", "#01FFFF", "1, 255, 255"),
  "Current Events": createNeonColor("Quantum Coral", "#FF6E4A", "255, 110, 74"),
  "Celebrities": createNeonColor("Highlighter Yellow", "#FFF01F", "255, 240, 31"),
  "Business & Economics": createNeonColor("Cyber Teal", "#00FFCD", "0, 255, 205"),
  "Philosophy": createNeonColor("Cyber Yellow", "#FFD300", "255, 211, 0"),
  "Art & Literature": createNeonColor("Plasma Pink", "#FF71CE", "255, 113, 206"),
  
  // Backwards compatibility and fallbacks
  "Animals": createNeonColor("Radioactive Green", "#7FFF00", "127, 255, 0"),
  "default": createNeonColor("Electric Blue", "#0AEFFF", "10, 239, 255")
};

// For backward compatibility, keep the old name as well
export const NeonCategoryColors = NeonTopicColors;

// Helper function to get color for a topic
export const getTopicColor = (topic: string) => {
  // Check if the topic exists exactly
  if (NeonTopicColors[topic]) {
    return NeonTopicColors[topic];
  }
  
  // If no exact match, try to find a parent topic or fuzzy match
  // This is important for subtopics and tags which don't have explicit color definitions
  
  // Normalize the topic for comparison
  const normalizedTopic = topic.toLowerCase().trim();
  
  // First, check if this is a subtopic (contains a parent topic as a substring)
  for (const key of Object.keys(NeonTopicColors)) {
    if (normalizedTopic.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedTopic)) {
      // Found a parent topic or partial match
      return NeonTopicColors[key];
    }
  }
  
  // If no matches found through parent topic check, use a hash-based approach to ensure
  // consistent colors for unknown subtopics/tags
  
  // Simple string hash function to generate a number from a string
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
  
  // Get all topic keys from NeonTopicColors (excluding 'default')
  const topicKeys = Object.keys(NeonTopicColors).filter(key => key !== 'default');
  
  // Use hash to consistently select a color from the available colors
  const hash = hashString(normalizedTopic);
  const colorKey = topicKeys[hash % topicKeys.length];
  
  return NeonTopicColors[colorKey] || NeonTopicColors["default"];
};

// For backward compatibility, keep the old function as well
export const getCategoryColor = getTopicColor;

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