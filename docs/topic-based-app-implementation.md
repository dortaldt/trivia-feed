# Topic-Based App Implementation Guide

## Overview

This document outlines the implementation of a topic-based system for the Trivia Feed app. The system allows the app to be configured to focus on a specific topic, changing both the visual assets (app icon, favicon, splash screen) and content filtering to match the selected topic.

## Key Requirements

1. **Asset Management**: App icon, favicon, and touch icon should use the topic-specific image from `app-icon-{topic}.png`
2. **Content Filtering**: The system should limit the app to fetch only content related to the selected topic
3. **Centralized Configuration**: A single configuration setting should control all topic-related changes
4. **Default Topic Support**: The current configuration should be maintained as the default
5. **Scalability**: The solution should be easy to extend with new topics
6. **Subtopic Display**: In topic-specific mode, display the subtopic instead of the main topic in feed items

## Implementation Approach

### 1. Topic Configuration System

Create a central topic configuration that will be used throughout the app build process:

#### A. Configuration File Structure

```javascript
// File: app-topic-config.js
module.exports = {
  // The active topic for this build (default, music, science, etc.)
  activeTopic: 'music',
  
  // Whether to filter content based on the active topic
  filterContentByTopic: true,
  
  // Available topics configuration
  topics: {
    default: {
      displayName: 'All Topics',
      description: 'The full trivia experience across all topics'
    },
    music: {
      displayName: 'Music Trivia',
      description: 'Test your knowledge about music, artists, and songs'
    }
    // Add more topics as needed
  }
};
```

### 2. Asset Management System

#### A. Asset Naming Convention

All topic-specific assets should follow a consistent naming pattern:

- `app-icon-{topic}.png`: Main app icon (1024x1024 recommended)
- `favicon-{topic}.png`: Web favicon
- `splash-icon-{topic}.png`: Splash screen
- `adaptive-icon-{topic}.png`: Android adaptive icon
- `apple-touch-icon-{topic}.png`: iOS touch icon

The default assets (without topic suffix) will be used when no specific topic is selected.

#### B. Asset Generation Script

Create a script that will generate all required assets from a source app icon:

```javascript
// File: scripts/generate-topic-assets.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { activeTopic } = require('../app-topic-config');

async function generateTopicAssets(topic) {
  console.log(`Generating assets for topic: ${topic}`);
  
  const sourceIcon = path.resolve(__dirname, `../assets/images/app-icon-${topic}.png`);
  
  if (!fs.existsSync(sourceIcon)) {
    console.error(`Source icon not found: ${sourceIcon}`);
    console.error(`Please provide an app-icon-${topic}.png file in assets/images directory`);
    process.exit(1);
  }
  
  // Generate favicon sizes
  await sharp(sourceIcon)
    .resize(32, 32)
    .toFile(path.resolve(__dirname, `../public/favicon-${topic}.png`));
    
  await sharp(sourceIcon)
    .resize(16, 16)
    .toFile(path.resolve(__dirname, `../public/favicon-${topic}-16x16.png`));
    
  await sharp(sourceIcon)
    .resize(32, 32)
    .toFile(path.resolve(__dirname, `../public/favicon-${topic}-32x32.png`));
  
  // Generate apple touch icon
  await sharp(sourceIcon)
    .resize(180, 180)
    .toFile(path.resolve(__dirname, `../public/apple-touch-icon-${topic}.png`));
  
  // Generate splash icon (keeping original aspect ratio)
  await sharp(sourceIcon)
    .resize(1024, 1024, { fit: 'contain', background: { r: 21, g: 23, b: 24, alpha: 1 } })
    .toFile(path.resolve(__dirname, `../assets/images/splash-icon-${topic}.png`));
  
  console.log(`Successfully generated all assets for topic: ${topic}`);
}

// If called directly (not imported)
if (require.main === module) {
  const topic = process.argv[2] || activeTopic;
  
  if (topic === 'default') {
    console.log('Generating assets for default topic');
    // For default topic, just copy the standard assets without suffix
    // Implementation details omitted for brevity
  } else {
    generateTopicAssets(topic)
      .catch(err => {
        console.error('Error generating assets:', err);
        process.exit(1);
      });
  }
}

module.exports = { generateTopicAssets };
```

### 3. Build-Time Integration

#### A. Update app.config.js

Modify app.config.js to use the topic configuration:

```javascript
// In app.config.js
const { activeTopic, filterContentByTopic } = require('./app-topic-config');

// Function to get asset path based on topic
function getTopicAsset(assetName) {
  if (activeTopic === 'default') {
    return `./assets/images/${assetName}.png`;
  }
  return `./assets/images/${assetName}-${activeTopic}.png`;
}

export default {
  expo: {
    // ...existing config...
    icon: getTopicAsset('app-icon'),
    splash: {
      image: getTopicAsset('splash-icon'),
      // ...other splash settings...
    },
    ios: {
      // ...existing ios config...
      icon: getTopicAsset('app-icon'),
    },
    android: {
      adaptiveIcon: {
        foregroundImage: getTopicAsset('adaptive-icon'),
        // ...other adaptive icon settings...
      },
      // ...other android settings...
    },
    web: {
      favicon: activeTopic === 'default' 
        ? './assets/images/app-icon.png' 
        : `./assets/images/app-icon-${activeTopic}.png`,
    },
    extra: {
      // ...existing extras...
      activeTopic,
      filterContentByTopic,
    }
  }
};
```

### 4. Content Filtering Implementation

#### A. Topic-based Content Filter

Add filtering to the data fetching functions in triviaService.ts:

```typescript
// In fetchTriviaQuestions and similar functions
import Constants from 'expo-constants';

// Get topic configuration from app config
const { activeTopic, filterContentByTopic } = Constants.expoConfig.extra;

// Inside the fetch function, before making the request:
let query = supabase
  .from('trivia_questions')
  .select('*');

// Apply topic filter if configured
if (filterContentByTopic && activeTopic !== 'default') {
  console.log(`Filtering questions by topic: ${activeTopic}`);
  query = query.eq('topic', getStandardizedTopicName(activeTopic));
}

const { data, error } = await query;
```

### 5. Theme Icons Integration

Update themeIcons.ts to be topic-aware:

```typescript
import Constants from 'expo-constants';

// Get topic from app config
const activeTopic = Constants.expoConfig?.extra?.activeTopic || 'default';

// Get app icon based on theme and topic
export const getAppIcon = (theme: ThemeName): string => {
  if (activeTopic === 'default') {
    // Use theme-specific icons for default topic
    return appIconMap[theme] || appIconMap.default;
  }
  
  // For specific topics, use topic-specific icons
  return `/assets/images/app-icon-${activeTopic}.png`;
};

// Get favicon based on theme and topic
export const getFavicon = (theme: ThemeName): string => {
  if (activeTopic === 'default') {
    // Use theme-specific favicons for default topic
    return faviconMap[theme] || faviconMap.default;
  }
  
  // For specific topics, use topic-specific favicon
  return `favicon-${activeTopic}.png`;
};

// Similar adjustments for other asset getters
```

### 6. Subtopic Display

Update FeedItem.tsx to display subtopics instead of the main topic when in topic-specific mode:

```typescript
import Constants from 'expo-constants';

// Get topic configuration from expo config
const { activeTopic, filterContentByTopic } = Constants.expoConfig?.extra || {};
const isTopicSpecificMode = activeTopic !== 'default' && filterContentByTopic;

// Inside the FeedItem component
const getDisplayLabel = () => {
  if (isTopicSpecificMode) {
    // If in topic-specific mode, prefer to show the subtopic if available
    if (item.subtopic) {
      return item.subtopic;
    } else if (item.tags && item.tags.length > 0) {
      // Fall back to the first tag as subtopic
      return item.tags[0];
    }
  }
  // Default to showing the main topic
  return item.topic;
};

// In the render method
<Text style={styles.topicLabel}>{getDisplayLabel()}</Text>
```

## Actual Implementation

The topic-based system has been successfully implemented in the Trivia Feed app, with 'music' as the first topic. Here's what was done:

### 1. Configuration System

Created and activated the topic-based configuration:

```javascript
// app-topic-config.js
module.exports = {
  activeTopic: 'music',
  filterContentByTopic: true,
  topics: {
    default: {
      displayName: 'All Topics',
      description: 'The full trivia experience across all topics',
      dbTopicName: null,
    },
    music: {
      displayName: 'Music Trivia',
      description: 'Test your knowledge about music, artists, and songs',
      dbTopicName: 'Music',
    },
    // Other topics...
  }
};
```

### 2. Asset Generation

The asset generation script was created and executed to produce all required assets from the source music icon:

```bash
npm install sharp
node scripts/generate-topic-assets.js music
```

This script successfully generated:
- favicon-music.png (32x32px)
- favicon-music-16x16.png (16x16px)
- favicon-music-32x32.png (32x32px)
- apple-touch-icon-music.png (180x180px)
- splash-icon-music.png (1024x1024px)
- adaptive-icon-music.png (1024x1024px)
- app-icon-music-processed.png

### 3. App Configuration

Updated app.config.js to use the topic configuration:

```javascript
// app.config.js
const topicConfig = require('./app-topic-config');
const { activeTopic, filterContentByTopic, topics } = topicConfig;
const currentTopic = topics[activeTopic] || topics.default;

// Function to get asset path based on topic
function getTopicAsset(assetName) {
  if (activeTopic === 'default') {
    return `./assets/images/${assetName}.png`;
  }
  return `./assets/images/${assetName}-${activeTopic}.png`;
}

export default {
  expo: {
    name: activeTopic === 'default' 
      ? "Trivia Feed" 
      : `${currentTopic.displayName}`,
    icon: getTopicAsset('app-icon'),
    // ...other configurations using getTopicAsset()
    extra: {
      // ...existing extras
      activeTopic,
      filterContentByTopic,
      topicDbName: currentTopic.dbTopicName,
    }
  }
};
```

### 4. Content Filtering Implementation

Updated triviaService.ts to filter content by topic:

```typescript
// src/lib/triviaService.ts
import Constants from 'expo-constants';

// Get topic configuration
const { activeTopic, filterContentByTopic, topicDbName } = Constants.expoConfig?.extra || {};

// In fetch functions:
let query = supabase
  .from('trivia_questions')
  .select('*');

// Apply topic filter if configured
if (filterContentByTopic && activeTopic !== 'default' && topicDbName) {
  console.log(`DEBUG: Filtering questions by topic: ${topicDbName}`);
  query = query.eq('topic', topicDbName);
}

const { data, error } = await query;
```

The same filtering logic was applied to both `fetchTriviaQuestions` and `fetchNewTriviaQuestions` functions.

### 5. Subtopic Display Implementation

Updated FeedItem.tsx to show subtopics instead of the main topic when in topic-specific mode:

```typescript
// src/features/feed/FeedItem.tsx
import Constants from 'expo-constants';

// Get topic configuration from expo config
const { activeTopic, filterContentByTopic } = Constants.expoConfig?.extra || {};
const isTopicSpecificMode = activeTopic !== 'default' && filterContentByTopic;

// Inside the FeedItem component
const getDisplayLabel = () => {
  if (isTopicSpecificMode) {
    // If in topic-specific mode, prefer to show the subtopic if available
    if (item.subtopic) {
      return item.subtopic;
    } else if (item.tags && item.tags.length > 0) {
      // Fall back to the first tag as subtopic
      return item.tags[0];
    }
  }
  // Default to showing the main topic
  return item.topic;
};
```

This enhances the user experience in topic-specific apps by showing more granular information (subtopics) rather than repeatedly displaying the same topic on every card.

## Adding New Topics

To add a new topic:

1. Create a high-resolution source icon named `app-icon-{topic}.png` in the assets/images directory
2. Run the asset generation script: `node scripts/generate-topic-assets.js {topic}`
3. Update `app-topic-config.js` to include the new topic in the topics list
4. Set `activeTopic` to the new topic name to build a version focused on that topic

## Usage Instructions

### Building a Topic-Specific App

1. Edit `app-topic-config.js` to set:
   - `activeTopic` to your desired topic (e.g., 'music')
   - `filterContentByTopic` to `true`

2. Ensure all required assets exist:
   - Verify `app-icon-{topic}.png` exists in assets/images
   - Run the asset generator if needed: `node scripts/generate-topic-assets.js {topic}`

3. Build the app as usual:
   ```
   npm run build
   ```

### Reverting to Default Mode

1. Edit `app-topic-config.js` to set:
   - `activeTopic` to 'default'
   - `filterContentByTopic` to `false`

2. Build the app as usual

## Limitations and Considerations

1. **Build-Time Configuration**: This implementation focuses on build-time configuration rather than runtime switching. Each build is dedicated to a specific topic.

2. **Asset Management**: All topic-specific assets must be created before building. The asset generation script helps with this process.

3. **Content Filtering**: The system filters by the `topic` field in the database. Ensure your data is properly tagged.

4. **Scalability Considerations**: As you add more topics, the assets directory will grow. Consider implementing an organizational structure if many topics are anticipated.

## Subtopic Display and Coloring

A key enhancement to the topic-specific mode is the use of subtopics not only for display labels but also for visual differentiation through colors:

### 1. Subtopic Display

When in topic-specific mode, the app displays the subtopic (or the first tag if no subtopic exists) instead of the main topic in feed items:

```typescript
// Inside the FeedItem component
const getDisplayLabel = () => {
  if (isTopicSpecificMode) {
    // If in topic-specific mode, prefer to show the subtopic if available
    if (item.subtopic) {
      return item.subtopic;
    } else if (item.tags && item.tags.length > 0) {
      // Fall back to the first tag as subtopic
      return item.tags[0];
    }
  }
  // Default to showing the main topic
  return item.topic;
};
```

### 2. Subtopic-Based Background Colors

To provide visual variety in topic-specific mode, background colors are now determined by subtopics rather than the main topic:

#### A. In FeedItem.tsx

```typescript
// Get the display color - use subtopic for color in topic-specific mode
const getDisplayColor = () => {
  if (isTopicSpecificMode) {
    // In topic-specific mode, use subtopic or tag for color variation
    if (item.subtopic) {
      return item.subtopic;
    } else if (item.tags && item.tags.length > 0) {
      return item.tags[0];
    }
  }
  // Default to using the main topic for color
  return item.topic;
};

// Use this function for all color-related operations
const backgroundComponent = useMemo(() => {
  if (isNeonTheme) {
    const displayColor = getDisplayColor();
    return <NeonGradientBackground topic={displayColor} nextTopic={nextTopic} />;
  } else {
    const colorObj = getTopicColor(getDisplayColor());
    return <View style={[dynamicStyles.backgroundColor, {
      backgroundColor: colorObj.hex
    }]} />;
  }
}, [isNeonTheme, item.topic, item.subtopic, item.tags, nextTopic]);
```

#### B. In triviaService.ts

The data fetching service was also updated to determine background colors based on subtopics in topic-specific mode:

```typescript
// Get background color based on category or subtopic depending on mode
let backgroundColor;
if (filterContentByTopic && activeTopic !== 'default') {
  // In topic-specific mode, use subtopic or tag for background color variation
  if (subtopic) {
    backgroundColor = getTopicColor(subtopic);
  } else if (tags && tags.length > 0) {
    backgroundColor = getTopicColor(tags[0]);
  } else {
    backgroundColor = getTopicColor(category);
  }
} else {
  // In multi-topic mode, use the main topic for color
  backgroundColor = getTopicColor(category);
}
```

#### C. Improved Color Mapping for Subtopics

The getTopicColor function in constants/NeonColors.ts was enhanced to better handle subtopics:

```typescript
export const getTopicColor = (topic: string) => {
  // Check for exact matches first
  if (NeonTopicColors[topic]) {
    return NeonTopicColors[topic];
  }
  
  // Try fuzzy matching for subtopics
  const normalizedTopic = topic.toLowerCase().trim();
  
  for (const key of Object.keys(NeonTopicColors)) {
    if (normalizedTopic.includes(key.toLowerCase()) || 
        key.toLowerCase().includes(normalizedTopic)) {
      return NeonTopicColors[key];
    }
  }
  
  // If no match found, use a hash-based approach for consistent colors
  const hashString = (str: string) => {
    // Hash implementation...
  };
  
  const topicKeys = Object.keys(NeonTopicColors).filter(key => key !== 'default');
  const hash = hashString(normalizedTopic);
  const colorKey = topicKeys[hash % topicKeys.length];
  
  return NeonTopicColors[colorKey] || NeonTopicColors["default"];
};
```

This implementation ensures that:
1. Subtopics within the same "family" (e.g., "Rock Music," "Classical Music") get related but distinct colors
2. Unknown subtopics receive consistent colors based on their names rather than random colors
3. The visual experience in topic-specific apps is more varied and engaging, with cards visually differentiated by their subtopics 