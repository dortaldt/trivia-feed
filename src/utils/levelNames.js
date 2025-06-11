// Utility for contextual level names
// Import the auto-generated configuration
const { LEVEL_NAMES_CONFIG, getLevelName: getConfigLevelName, getAllLevelNames: getConfigAllLevelNames } = require('../../level-names-config.js');

/**
 * Get contextual level name for a topic/subtopic combination
 * @param {string} topic - The main topic
 * @param {string|null} subtopic - The subtopic (optional)
 * @param {number} level - The level (1-5)
 * @param {boolean} includeNumber - Whether to include the level number (default: true)
 * @returns {string} The contextual level name
 */
function getLevelName(topic, subtopic, level, includeNumber = true) {
  try {
    const levelName = getConfigLevelName(topic, subtopic, level);
    const validLevel = Math.max(1, Math.min(5, level));
    return includeNumber ? `${levelName} ${validLevel}` : levelName;
  } catch (error) {
    console.warn('Error getting level name:', error);
    // Fallback to default
    const defaultLevels = ['Novice', 'Apprentice', 'Practitioner', 'Expert', 'Master'];
    const validLevel = Math.max(1, Math.min(5, level));
    const levelName = defaultLevels[validLevel - 1];
    return includeNumber ? `${levelName} ${validLevel}` : levelName;
  }
}

/**
 * Get all level names for a topic/subtopic
 * @param {string} topic - The main topic
 * @param {string|null} subtopic - The subtopic (optional)
 * @returns {string[]} Array of 5 level names
 */
function getAllLevelNames(topic, subtopic) {
  try {
    return getConfigAllLevelNames(topic, subtopic);
  } catch (error) {
    console.warn('Error getting all level names:', error);
    // Fallback to default
    return ['Novice', 'Apprentice', 'Practitioner', 'Expert', 'Master'];
  }
}

/**
 * Get a formatted level display string (e.g., "Rookie" instead of "Level 1")
 * @param {string} topic - The main topic
 * @param {string|null} subtopic - The subtopic (optional)
 * @param {number} level - The level (1-5)
 * @returns {string} The formatted level display
 */
function getFormattedLevelDisplay(topic, subtopic, level) {
  return getLevelName(topic, subtopic, level);
}

/**
 * Check if a topic/subtopic has custom level names (vs default fallback)
 * @param {string} topic - The main topic
 * @param {string|null} subtopic - The subtopic (optional)
 * @returns {boolean} True if has custom level names
 */
function hasCustomLevelNames(topic, subtopic) {
  try {
    // Check if subtopic has custom mapping
    if (subtopic && LEVEL_NAMES_CONFIG[subtopic]) {
      return true;
    }
    
    // Check if topic has custom mapping
    if (LEVEL_NAMES_CONFIG[topic]) {
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Legacy function to maintain backward compatibility
 * Returns either contextual level name or generic "Level X" format
 * @param {string} topic - The main topic
 * @param {string|null} subtopic - The subtopic (optional)
 * @param {number} level - The level (1-5)
 * @param {boolean} useContextual - Whether to use contextual names (default: true)
 * @returns {string} The level display
 */
function getLevelDisplay(topic, subtopic, level, useContextual = true) {
  if (useContextual) {
    return getLevelName(topic, subtopic, level);
  } else {
    return `Level ${level}`;
  }
}

// Export everything using CommonJS
module.exports = {
  getLevelName,
  getAllLevelNames,
  getFormattedLevelDisplay,
  hasCustomLevelNames,
  getLevelDisplay,
  LEVEL_NAMES_CONFIG
}; 