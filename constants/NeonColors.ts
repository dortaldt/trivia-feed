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

// Helper function to convert hex to RGB string
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0, 0, 0";
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `${r}, ${g}, ${b}`;
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
  // === MAIN TOPIC COLORS ===
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
  "Countries": createNeonColor("Geo Blue", "#4355FF", "67, 85, 255"),
  "Nature": createNeonColor("Radioactive Green", "#7FFF00", "127, 255, 0"),
  "Engineering": createNeonColor("Engineer Orange", "#FF5722", "255, 87, 34"),
  "Mathematics": createNeonColor("Digital Lime", "#C1FF00", "193, 255, 0"),
  "General Knowledge": createNeonColor("Laser Lemon", "#FFFC00", "255, 252, 0"),
  "Food and Drink": createNeonColor("Power Peach", "#FFAA5E", "255, 170, 94"),
  "Computers": createNeonColor("Digital Cyan", "#00FFFF", "0, 255, 255"),
  "Math": createNeonColor("Digital Lime", "#C1FF00", "193, 255, 0"),
  "Food": createNeonColor("Power Peach", "#FFAA5E", "255, 170, 94"),
  "Environment": createNeonColor("Earth Green", "#00E676", "0, 230, 118"),
  "Language": createNeonColor("Vivid Raspberry", "#FF0F80", "255, 15, 128"),
  "Sports": createNeonColor("Blaze Orange", "#FF6700", "255, 103, 0"),
  "Art": createNeonColor("Artistic Pink", "#FF71CE", "255, 113, 206"),
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
  
  // === SUB-TOPIC COLORS (single source of truth from app-topic-config.js) ===
  
  // Music sub-topics
  "Classical Composers": createNeonColor("Classical Purple", "#BC13FE", hexToRgb("#BC13FE")),
  "Rock & Roll History": createNeonColor("Rock Pink", "#FF10F0", hexToRgb("#FF10F0")),
  "Pop Music Trends": createNeonColor("Pop Acid", "#39FF14", hexToRgb("#39FF14")),
  "Jazz & Blues": createNeonColor("Jazz Violet", "#8A00FF", hexToRgb("#8A00FF")),
  "Music Theory": createNeonColor("Theory Green", "#00FF8F", hexToRgb("#00FF8F")),
  "Theater & Musicals": createNeonColor("Theater Pink", "#FF71CE", hexToRgb("#FF71CE")),
  
  // Science sub-topics
  "Physics": createNeonColor("Physics Yellow", "#FFE500", hexToRgb("#FFE500")),
  "Chemistry": createNeonColor("Chemistry Teal", "#00FFCD", hexToRgb("#00FFCD")),
  "Biology": createNeonColor("Biology Green", "#00D68F", hexToRgb("#00D68F")),
  "Astronomy": createNeonColor("Astronomy Purple", "#9966FF", hexToRgb("#9966FF")),
  
  // History sub-topics
  "Ancient History": createNeonColor("Ancient Gold", "#FFD700", hexToRgb("#FFD700")),
  "Modern History": createNeonColor("Modern Blue", "#4F5FFF", hexToRgb("#4F5FFF")),
  
  // === MISSING TOPICS/SUBTOPICS FROM DATABASE ANALYSIS ===
  
  // Missing main topic
  "Trivia": createNeonColor("Trivia Lime", "#C8FF00", hexToRgb("#C8FF00")),
  
  // High-impact missing subtopics (>10 questions each)
  "Animation & Cartoons": createNeonColor("Cartoon Orange", "#FF8C00", hexToRgb("#FF8C00")),
  "Television Shows": createNeonColor("TV Blue", "#4169E1", hexToRgb("#4169E1")),
  "Food & Cuisine": createNeonColor("Cuisine Gold", "#FFD700", hexToRgb("#FFD700")),
  "Classic Films": createNeonColor("Classic Red", "#DC143C", hexToRgb("#DC143C")),
  "Viral Moments": createNeonColor("Viral Pink", "#FF1493", hexToRgb("#FF1493")),
  "Fashion Icons": createNeonColor("Fashion Purple", "#9932CC", hexToRgb("#9932CC")),
  "Art Movements": createNeonColor("Movement Magenta", "#FF69B4", hexToRgb("#FF69B4")),
  "Social Media Trends": createNeonColor("Social Cyan", "#00CED1", hexToRgb("#00CED1")),
  "Space Exploration": createNeonColor("Space Indigo", "#4B0082", hexToRgb("#4B0082")),
  "Rainforest Ecosystems": createNeonColor("Rainforest Green", "#228B22", hexToRgb("#228B22")),
  "Modern Cinema": createNeonColor("Cinema Gold", "#B8860B", hexToRgb("#B8860B")),
  "Genetics": createNeonColor("Gene Green", "#32CD32", hexToRgb("#32CD32")),
  
  // Other notable missing subtopics
  "American History": createNeonColor("American Blue", "#002868", hexToRgb("#002868")),
  "Shakespearean Plays": createNeonColor("Shakespeare Purple", "#663399", hexToRgb("#663399")),
  "Olympics": createNeonColor("Olympic Gold", "#FFD700", hexToRgb("#FFD700")),
  "Riddles & Brain Teasers": createNeonColor("Riddle Orange", "#FF6347", hexToRgb("#FF6347")),
  "Ancient Civilizations": createNeonColor("Ancient Bronze", "#CD7F32", hexToRgb("#CD7F32")),
  "Renewable Energy": createNeonColor("Green Energy", "#00FF00", hexToRgb("#00FF00")),
  "Memes & Internet Culture": createNeonColor("Meme Yellow", "#FFFF00", hexToRgb("#FFFF00")),
  
  // === MISSING MUSIC-RELATED SUBTOPICS FROM DATABASE ANALYSIS ===
  
  // High-impact music subtopics
  "Classical Music": createNeonColor("Classic Blue", "#191970", hexToRgb("#191970")),
  "Music Genres": createNeonColor("Genre Rainbow", "#FF1493", hexToRgb("#FF1493")),
  "Music Trends": createNeonColor("Trend Magenta", "#DA70D6", hexToRgb("#DA70D6")),
  "Instruments": createNeonColor("Instrument Bronze", "#CD853F", hexToRgb("#CD853F")),
  "Music Technology": createNeonColor("Tech Silver", "#C0C0C0", hexToRgb("#C0C0C0")),
  "Music Industry": createNeonColor("Industry Gold", "#DAA520", hexToRgb("#DAA520")),
  "Music Production": createNeonColor("Production Purple", "#9370DB", hexToRgb("#9370DB")),
  "Electronic Music": createNeonColor("Electronic Blue", "#0080FF", hexToRgb("#0080FF")),
  "Pop Music": createNeonColor("Pop Pink", "#FF69B4", hexToRgb("#FF69B4")),
  "Rock Music": createNeonColor("Rock Red", "#DC143C", hexToRgb("#DC143C")),
  "Music Festivals": createNeonColor("Festival Orange", "#FF8C00", hexToRgb("#FF8C00")),
  "Songwriting": createNeonColor("Songwrite Green", "#32CD32", hexToRgb("#32CD32")),
  "Contemporary Music": createNeonColor("Contemporary Cyan", "#00FFFF", hexToRgb("#00FFFF")),
  "Folk Music": createNeonColor("Folk Brown", "#8B4513", hexToRgb("#8B4513")),
  "World Music": createNeonColor("World Gold", "#FFD700", hexToRgb("#FFD700")),
  "Latin American Music": createNeonColor("Latin Red", "#FF4500", hexToRgb("#FF4500")),
  "Opera": createNeonColor("Opera Purple", "#8B008B", hexToRgb("#8B008B")),
  "Music Videos": createNeonColor("Video Violet", "#EE82EE", hexToRgb("#EE82EE")),
  "Music History": createNeonColor("History Teal", "#008080", hexToRgb("#008080")),
  "Music Composition": createNeonColor("Compose Blue", "#4682B4", hexToRgb("#4682B4")),
  
  // Music-related tags that appear frequently
  "music": createNeonColor("Music Base", "#FF1493", hexToRgb("#FF1493")),
  "pop music": createNeonColor("Pop Base", "#FF69B4", hexToRgb("#FF69B4")),
  "classical music": createNeonColor("Classical Base", "#191970", hexToRgb("#191970")),
  "jazz": createNeonColor("Jazz Gold", "#B8860B", hexToRgb("#B8860B")),
  "rock music": createNeonColor("Rock Base", "#DC143C", hexToRgb("#DC143C")),
  "electronic music": createNeonColor("Electronic Base", "#0080FF", hexToRgb("#0080FF")),
  "music theory": createNeonColor("Theory Lime", "#32CD32", hexToRgb("#32CD32")),
  "music history": createNeonColor("History Base", "#008080", hexToRgb("#008080")),
  "music industry": createNeonColor("Industry Base", "#DAA520", hexToRgb("#DAA520")),
  "instruments": createNeonColor("Instruments Base", "#CD853F", hexToRgb("#CD853F")),
  "songwriting": createNeonColor("Songwriting Base", "#32CD32", hexToRgb("#32CD32")),
  "album": createNeonColor("Album Silver", "#C0C0C0", hexToRgb("#C0C0C0")),
  "piano": createNeonColor("Piano Black", "#2F4F4F", hexToRgb("#2F4F4F")),
  "guitar": createNeonColor("Guitar Wood", "#8B4513", hexToRgb("#8B4513")),
  "symphony": createNeonColor("Symphony Gold", "#FFD700", hexToRgb("#FFD700")),
  "opera": createNeonColor("Opera Deep Purple", "#8B008B", hexToRgb("#8B008B")),
  "folk music": createNeonColor("Folk Earth", "#8B4513", hexToRgb("#8B4513")),
  "world music": createNeonColor("World Rainbow", "#FF8C00", hexToRgb("#FF8C00")),
  
  // === BACKWARDS COMPATIBILITY AND FALLBACKS ===
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