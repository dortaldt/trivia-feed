// Script to generate contextual level names for all topics and subtopics
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env.development' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key not found in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Contextual level names for different topics and subtopics
const TOPIC_LEVEL_MAPPINGS = {
  // Sports levels (example from user)
  'Sports': ['Rookie', 'B League', 'A League', 'Superstar', 'All-Star'],
  'Olympics': ['Spectator', 'Athlete', 'Competitor', 'Medalist', 'Champion'],
  
  // Music levels
  'Music': ['Listener', 'Fan', 'Enthusiast', 'Connoisseur', 'Maestro'],
  'Classical Composers': ['Student', 'Apprentice', 'Scholar', 'Virtuoso', 'Master'],
  'Rock & Roll History': ['Fan', 'Groupie', 'Rockstar', 'Legend', 'Hall of Fame'],
  'Pop Music Trends': ['Casual', 'Fan', 'Trendsetter', 'Influencer', 'Icon'],
  'Jazz & Blues': ['Listener', 'Appreciator', 'Aficionado', 'Scholar', 'Soul Master'],
  'Music Theory': ['Beginner', 'Student', 'Practitioner', 'Theorist', 'Professor'],
  
  // Science levels
  'Science': ['Curious', 'Student', 'Researcher', 'Scientist', 'Nobel Winner'],
  'Physics': ['Observer', 'Student', 'Physicist', 'Theorist', 'Einstein'],
  'Chemistry': ['Mixer', 'Student', 'Chemist', 'Researcher', 'Nobel Laureate'],
  'Biology': ['Observer', 'Student', 'Biologist', 'Researcher', 'Darwin'],
  'Astronomy': ['Stargazer', 'Student', 'Astronomer', 'Researcher', 'Cosmos Master'],
  'Quantum Physics': ['Curious', 'Student', 'Physicist', 'Quantum Master', 'Schrödinger'],
  
  // History levels
  'History': ['Student', 'Scholar', 'Historian', 'Expert', 'Time Master'],
  'Ancient History': ['Explorer', 'Student', 'Archaeologist', 'Historian', 'Time Lord'],
  'Modern History': ['Student', 'Scholar', 'Historian', 'Expert', 'Chronicle Master'],
  'American History': ['Citizen', 'Patriot', 'Scholar', 'Historian', 'Founding Father'],
  'World War II': ['Student', 'Scholar', 'Historian', 'Expert', 'War Historian'],
  
  // Entertainment & Movies
  'Entertainment': ['Viewer', 'Fan', 'Cinephile', 'Critic', 'Director'],
  'Movies': ['Viewer', 'Fan', 'Cinephile', 'Critic', 'Auteur'],
  'Movies and TV': ['Casual', 'Binge Watcher', 'Cinephile', 'Critic', 'Hollywood Elite'],
  'Classic Hollywood': ['Viewer', 'Fan', 'Cinephile', 'Golden Age Master', 'Hollywood Legend'],
  'Action Films': ['Fan', 'Adrenaline Junkie', 'Action Hero', 'Stunt Master', 'Action Legend'],
  'Horror Films': ['Scaredy Cat', 'Thriller Seeker', 'Horror Fan', 'Fear Master', 'Horror Legend'],
  'Sci-Fi & Fantasy': ['Dreamer', 'Fan', 'Sci-Fi Enthusiast', 'Galaxy Master', 'Time Lord'],
  'Animated Films': ['Viewer', 'Animation Fan', 'Cartoon Connoisseur', 'Animation Master', 'Disney Legend'],
  
  // 90s Culture
  '90s': ['Kid', 'Teen', '90s Fan', '90s Expert', '90s Legend'],
  '90s Music': ['Listener', '90s Kid', 'Grunge Fan', '90s Expert', 'Decade Master'],
  '90s Movies': ['Viewer', '90s Kid', 'Film Fan', '90s Expert', 'Blockbuster Master'],
  'Fashion Trends': ['Observer', 'Trendy', 'Fashionista', 'Style Icon', 'Fashion Legend'],
  'Technology': ['User', 'Early Adopter', 'Tech Enthusiast', 'Tech Expert', 'Digital Pioneer'],
  
  // Friends TV Show
  'Friends': ['Casual Viewer', 'Fan', 'Super Fan', 'Expert', 'Central Perk Regular'],
  'Iconic Episodes': ['Viewer', 'Fan', 'Episode Expert', 'Series Master', 'Could I BE Any Better?'],
  'Character Arcs': ['Viewer', 'Character Fan', 'Story Expert', 'Character Master', 'Lobster Expert'],
  'Famous Quotes': ['Viewer', 'Quote Fan', 'Quotable', 'Quote Master', 'Could I BE More Quotable?'],
  'Relationships & Dating': ['Observer', 'Romantic', 'Love Expert', 'Relationship Master', 'Ross & Rachel Expert'],
  
  // Literature
  'Literature': ['Reader', 'Bookworm', 'Scholar', 'Literary Expert', 'Shakespeare'],
  'Classic Literature': ['Reader', 'Student', 'Scholar', 'Literature Master', 'Literary Genius'],
  'Poetry': ['Reader', 'Verse Lover', 'Poet', 'Poetry Master', 'Wordsworth'],
  'Shakespearean Plays': ['Reader', 'Student', 'Scholar', 'Bard Expert', 'To Be or Not To Be'],
  
  // Technology
  'Technology': ['User', 'Early Adopter', 'Tech Enthusiast', 'Tech Expert', 'Digital Pioneer'],
  'Artificial Intelligence': ['Curious', 'Student', 'AI Enthusiast', 'AI Expert', 'Turing Master'],
  'Programming Languages': ['Beginner', 'Coder', 'Developer', 'Expert', 'Code Master'],
  'Computers': ['User', 'Power User', 'Tech Enthusiast', 'Computer Expert', 'Digital Wizard'],
  
  // Geography
  'Geography': ['Explorer', 'Traveler', 'Navigator', 'Geography Expert', 'World Master'],
  'World Capitals': ['Tourist', 'Traveler', 'Geography Fan', 'Capital Expert', 'Globe Trotter'],
  'Countries': ['Tourist', 'Traveler', 'World Explorer', 'Geography Master', 'Global Citizen'],
  
  // Art
  'Art': ['Observer', 'Art Lover', 'Art Enthusiast', 'Art Connoisseur', 'Da Vinci'],
  'Arts': ['Observer', 'Art Lover', 'Art Enthusiast', 'Art Connoisseur', 'Renaissance Master'],
  'Renaissance Art': ['Student', 'Art Lover', 'Renaissance Fan', 'Art Master', 'Michelangelo'],
  'Modern Art': ['Observer', 'Art Fan', 'Modern Art Lover', 'Art Expert', 'Picasso'],
  'Painting': ['Observer', 'Art Student', 'Painter', 'Artist', 'Master Painter'],
  
  // Mathematics
  'Math': ['Student', 'Calculator', 'Problem Solver', 'Mathematician', 'Euler'],
  'Mathematics': ['Student', 'Calculator', 'Problem Solver', 'Mathematician', 'Newton'],
  'Arithmetic': ['Counter', 'Calculator', 'Number Cruncher', 'Math Whiz', 'Human Calculator'],
  'Statistics': ['Data Observer', 'Analyst', 'Statistician', 'Data Expert', 'Stats Master'],
  
  // Nature & Environment
  'Nature': ['Observer', 'Nature Lover', 'Environmentalist', 'Naturalist', 'Planet Guardian'],
  'Environment': ['Observer', 'Eco-Aware', 'Environmentalist', 'Eco Warrior', 'Planet Protector'],
  'Wildlife': ['Observer', 'Animal Lover', 'Nature Enthusiast', 'Wildlife Expert', 'Steve Irwin'],
  'Botany': ['Observer', 'Plant Lover', 'Gardener', 'Botanist', 'Plant Whisperer'],
  
  // Culture
  'Culture': ['Observer', 'Culture Enthusiast', 'Cultural Explorer', 'Culture Expert', 'Cultural Ambassador'],
  'Pop Culture': ['Observer', 'Trend Follower', 'Pop Culture Fan', 'Trendsetter', 'Cultural Icon'],
  'Folklore': ['Listener', 'Story Lover', 'Folklore Fan', 'Legend Keeper', 'Myth Master'],
  
  // Politics
  'Politics': ['Citizen', 'Voter', 'Political Enthusiast', 'Political Expert', 'Statesman'],
  'Civil Rights': ['Aware', 'Supporter', 'Advocate', 'Activist', 'Rights Champion'],
  'Government Structure': ['Citizen', 'Civic Student', 'Political Scholar', 'Government Expert', 'Constitutional Master'],
  
  // Language
  'Language': ['Speaker', 'Language Learner', 'Polyglot', 'Linguist', 'Language Master'],
  'Linguistics': ['Student', 'Language Student', 'Linguistics Fan', 'Linguist', 'Chomsky'],
  
  // Engineering
  'Engineering': ['Student', 'Designer', 'Engineer', 'Expert Engineer', 'Master Builder'],
  'Civil Engineering': ['Observer', 'Builder', 'Civil Engineer', 'Infrastructure Expert', 'Master Architect'],
  'Electrical Engineering': ['Tinkerer', 'Electrician', 'Electrical Engineer', 'Circuit Master', 'Tesla'],
  
  // Food
  'Food': ['Eater', 'Food Lover', 'Foodie', 'Culinary Expert', 'Master Chef'],
  'Food and Drink': ['Taster', 'Food Lover', 'Culinary Enthusiast', 'Gourmet', 'Master Chef'],
  'Culinary Arts': ['Observer', 'Home Cook', 'Chef', 'Culinary Artist', 'Gordon Ramsay'],
  
  // Default fallback levels for any topic without specific mapping
  'DEFAULT': ['Novice', 'Apprentice', 'Practitioner', 'Expert', 'Master']
};

// Additional subtopic mappings based on patterns
const SUBTOPIC_PATTERNS = {
  // Pattern-based mappings for common subtopic themes
  'olympic': ['Spectator', 'Athlete', 'Competitor', 'Medalist', 'Champion'],
  'war': ['Student', 'Cadet', 'Soldier', 'Veteran', 'General'],
  'film': ['Viewer', 'Fan', 'Cinephile', 'Critic', 'Director'],
  'tv': ['Viewer', 'Fan', 'Binge Watcher', 'TV Expert', 'Showrunner'],
  'game': ['Player', 'Gamer', 'Pro Gamer', 'Esports Star', 'Gaming Legend'],
  'artist': ['Observer', 'Art Student', 'Artist', 'Master Artist', 'Legend'],
  'writer': ['Reader', 'Writer', 'Author', 'Novelist', 'Literary Master'],
  'invention': ['Curious', 'Tinkerer', 'Inventor', 'Innovator', 'Edison'],
  'discovery': ['Student', 'Explorer', 'Researcher', 'Discoverer', 'Pioneer'],
};

function generateLevelNameForTopic(topic, subtopic = null) {
  // First, try exact match for subtopic if provided
  if (subtopic && TOPIC_LEVEL_MAPPINGS[subtopic]) {
    return TOPIC_LEVEL_MAPPINGS[subtopic];
  }
  
  // Then try exact match for topic
  if (TOPIC_LEVEL_MAPPINGS[topic]) {
    return TOPIC_LEVEL_MAPPINGS[topic];
  }
  
  // Try pattern matching for subtopics
  if (subtopic) {
    const subtopicLower = subtopic.toLowerCase();
    for (const [pattern, levels] of Object.entries(SUBTOPIC_PATTERNS)) {
      if (subtopicLower.includes(pattern)) {
        return levels;
      }
    }
  }
  
  // Try pattern matching for topics
  const topicLower = topic.toLowerCase();
  for (const [pattern, levels] of Object.entries(SUBTOPIC_PATTERNS)) {
    if (topicLower.includes(pattern)) {
      return levels;
    }
  }
  
  // Fallback to default
  return TOPIC_LEVEL_MAPPINGS['DEFAULT'];
}

async function generateLevelMappings() {
  try {
    console.log('🎯 Generating contextual level names for all topics and subtopics...\n');
    
    // Query both tables for all topics and subtopics
    const [triviaResponse, nicheResponse] = await Promise.all([
      supabase.from('trivia_questions').select('topic, subtopic').not('topic', 'is', null),
      supabase.from('niche_trivia_questions').select('topic, subtopic').not('topic', 'is', null)
    ]);
    
    if (triviaResponse.error) {
      console.error('Error fetching trivia data:', triviaResponse.error);
      return;
    }
    
    if (nicheResponse.error) {
      console.error('Error fetching niche data:', nicheResponse.error);
      return;
    }
    
    // Combine all data
    const allData = [...(triviaResponse.data || []), ...(nicheResponse.data || [])];
    
    // Extract unique topics and subtopics
    const topicsSet = new Set();
    const subtopicsSet = new Set();
    const topicSubtopicMap = new Map();
    
    allData.forEach(item => {
      if (item.topic) {
        topicsSet.add(item.topic);
        if (!topicSubtopicMap.has(item.topic)) {
          topicSubtopicMap.set(item.topic, new Set());
        }
        if (item.subtopic) {
          subtopicsSet.add(item.subtopic);
          topicSubtopicMap.get(item.topic).add(item.subtopic);
        }
      }
    });
    
    console.log(`📊 Found ${topicsSet.size} unique topics and ${subtopicsSet.size} unique subtopics`);
    
    // Generate level mappings for all topics and subtopics
    const levelMappings = {};
    
    // Process topics
    [...topicsSet].sort().forEach(topic => {
      const levels = generateLevelNameForTopic(topic);
      levelMappings[topic] = levels;
      console.log(`🔖 ${topic}: [${levels.join(', ')}]`);
    });
    
    // Process subtopics
    [...subtopicsSet].sort().forEach(subtopic => {
      // Find the parent topic for this subtopic
      let parentTopic = null;
      for (const [topic, subtopics] of topicSubtopicMap.entries()) {
        if (subtopics.has(subtopic)) {
          parentTopic = topic;
          break;
        }
      }
      
      const levels = generateLevelNameForTopic(parentTopic, subtopic);
      levelMappings[subtopic] = levels;
      console.log(`📝 ${subtopic} (${parentTopic}): [${levels.join(', ')}]`);
    });
    
    // Generate the configuration object
    const configExport = {
      // Level names mapping - 5 levels for each topic/subtopic
      levelNames: levelMappings,
      
      // Helper function to get level name
      getLevelName: `function(topic, subtopic, level) {
        // Validate level (should be 1-5)
        const validLevel = Math.max(1, Math.min(5, level));
        const levelIndex = validLevel - 1;
        
        // Try subtopic first if provided
        if (subtopic && this.levelNames[subtopic]) {
          return this.levelNames[subtopic][levelIndex];
        }
        
        // Try topic
        if (this.levelNames[topic]) {
          return this.levelNames[topic][levelIndex];
        }
        
        // Fallback to default
        const defaultLevels = ['Novice', 'Apprentice', 'Practitioner', 'Expert', 'Master'];
        return defaultLevels[levelIndex];
      }`
    };
    
    // Write to file
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '..', 'level-names-config.js');
    
    const fileContent = `// Auto-generated contextual level names configuration
// Generated on: ${new Date().toISOString()}
// Topics: ${topicsSet.size}, Subtopics: ${subtopicsSet.size}

export const LEVEL_NAMES_CONFIG = ${JSON.stringify(levelMappings, null, 2)};

/**
 * Get contextual level name for a topic/subtopic combination
 * @param {string} topic - The main topic
 * @param {string|null} subtopic - The subtopic (optional)
 * @param {number} level - The level (1-5)
 * @returns {string} The contextual level name
 */
export function getLevelName(topic, subtopic, level) {
  // Validate level (should be 1-5)
  const validLevel = Math.max(1, Math.min(5, level));
  const levelIndex = validLevel - 1;
  
  // Try subtopic first if provided
  if (subtopic && LEVEL_NAMES_CONFIG[subtopic]) {
    return LEVEL_NAMES_CONFIG[subtopic][levelIndex];
  }
  
  // Try topic
  if (LEVEL_NAMES_CONFIG[topic]) {
    return LEVEL_NAMES_CONFIG[topic][levelIndex];
  }
  
  // Fallback to default
  const defaultLevels = ['Novice', 'Apprentice', 'Practitioner', 'Expert', 'Master'];
  return defaultLevels[levelIndex];
}

/**
 * Get all level names for a topic/subtopic
 * @param {string} topic - The main topic
 * @param {string|null} subtopic - The subtopic (optional)
 * @returns {string[]} Array of 5 level names
 */
export function getAllLevelNames(topic, subtopic) {
  // Try subtopic first if provided
  if (subtopic && LEVEL_NAMES_CONFIG[subtopic]) {
    return LEVEL_NAMES_CONFIG[subtopic];
  }
  
  // Try topic
  if (LEVEL_NAMES_CONFIG[topic]) {
    return LEVEL_NAMES_CONFIG[topic];
  }
  
  // Fallback to default
  return ['Novice', 'Apprentice', 'Practitioner', 'Expert', 'Master'];
}

// Export default for CommonJS compatibility
module.exports = {
  LEVEL_NAMES_CONFIG,
  getLevelName,
  getAllLevelNames
};
`;
    
    fs.writeFileSync(configPath, fileContent);
    
    console.log(`\n✅ Level names configuration generated successfully!`);
    console.log(`📁 Saved to: ${configPath}`);
    console.log(`📊 Total mappings: ${Object.keys(levelMappings).length}`);
    console.log(`\n🎯 Example usage:`);
    console.log(`   getLevelName('Sports', null, 1) => "${generateLevelNameForTopic('Sports')[0]}"`);
    console.log(`   getLevelName('Music', 'Jazz & Blues', 3) => "${generateLevelNameForTopic('Music', 'Jazz & Blues')[2]}"`);
    console.log(`   getLevelName('History', 'World War II', 5) => "${generateLevelNameForTopic('History', 'World War II')[4]}"`);
    
  } catch (error) {
    console.error('Error generating level mappings:', error);
  }
}

// Execute the function
generateLevelMappings(); 