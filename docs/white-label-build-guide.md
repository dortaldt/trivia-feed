# Trivia Feed White Label Build Guide

This document provides step-by-step instructions for creating and building white-labeled variants of the Trivia Feed app (e.g., Music Trivia, Science Trivia) using Xcode without EAS.

## Overview

The Trivia Feed app supports white labeling through a topic-based configuration system. This allows you to create subject-specific variants of the app with:

- Custom app name
- Custom app icon and splash screen
- Subject-filtered content
- Different bundle identifiers
- Different URL schemes

## Prerequisites

- Xcode installed on your Mac
- Node.js and npm installed
- Basic understanding of React Native and Expo
- Necessary assets for each topic variant (app icons, splash screens)

## Project Setup

The white labeling system is controlled by three key files:

1. **`app-topic-config.js`** - Defines available topics and the active topic
2. **`app.config.js`** - Configures the app based on the active topic
3. **`eas.json`** - Contains build profiles for each topic variant (if using EAS)

### Asset Requirements

For each topic, you need the following assets in `assets/images/`:

- `app-icon-{topic}.png` - The main app icon (1024×1024px)
- `splash-icon-{topic}.png` - The splash screen image
- `adaptive-icon-{topic}.png` - Android adaptive icon foreground

Where `{topic}` is the topic identifier (e.g., `music`, `science`).

## Building a White Label Variant

### Step 1: Configure the Topic

1. Open `app-topic-config.js`
2. Set the `activeTopic` to your desired topic:

```javascript
activeTopic: 'music', // Replace with your topic: 'music', 'science', etc.
```

3. Make sure the topic is defined in the `topics` section:

```javascript
topics: {
  default: {
    displayName: 'All Topics',
    description: 'The full trivia experience across all topics',
    dbTopicName: null, // No filtering for default
  },
  music: {
    displayName: 'Music Trivia',
    description: 'Test your knowledge about music, artists, and songs',
    dbTopicName: 'Music', // Exact name as it appears in the database
  },
  // Add more topics as needed
}
```

### Step 2: Generate the Native Project

Run the following command to generate the native iOS project:

```bash
npx expo prebuild --platform ios --clean
```

This will create a new Xcode project with the topic-specific configuration.

### Step 3: Build with Xcode

1. Open the generated Xcode workspace:

```bash
open ios/[ProjectName].xcworkspace
```

Where `[ProjectName]` will be based on your topic (e.g., `MusicTrivia.xcworkspace` for the music topic).

2. In Xcode:
   - Select the main target
   - Go to the "Signing & Capabilities" tab
   - Sign in with your Apple Developer account
   - Select your development team

3. For a production build:
   - Select "Any iOS Device" in the device selector
   - Choose Product > Archive from the menu
   - When the Archive completes, click "Distribute App"
   - Choose your distribution method (App Store, Ad Hoc, etc.)
   - Follow the remaining steps in the wizard

## Managing Multiple White Label Variants

Since Expo replaces the native project on each prebuild, you have two options for maintaining multiple variants:

### Option 1: Separate Directories

1. Create a copy of your project for each variant:
   ```bash
   cp -R trivia-feed trivia-feed-music
   ```

2. Configure each project for its specific topic
3. Build each project independently

### Option 2: Git Branches

1. Create a branch for each variant:
   ```bash
   git checkout -b music-variant
   # Configure for music
   
   git checkout -b science-variant
   # Configure for science
   ```

2. Switch branches when you need to work on or build a specific variant

## White Label Configuration Details

### Bundle Identifiers

Each topic variant uses a different bundle identifier, defined in `app.config.js`:

```javascript
function getAppSpecificConfig(topic) {
  const appConfigs = {
    default: {
      bundleId: "com.triviafeed",
      scheme: "trivia-feed",
      slug: "trivia-feed",
    },
    music: {
      bundleId: "com.triviafeed.music",
      scheme: "trivia-feed-music",
      slug: "trivia-feed-music",
    }
    // Add more topic-specific configurations as needed
  };
  
  return appConfigs[topic] || appConfigs.default;
}
```

### Content Filtering

Content filtering is controlled by the `filterContentByTopic` setting in `app-topic-config.js`:

```javascript
filterContentByTopic: true,
```

When true, only questions matching the active topic will be shown.

## Example: Building the Music Trivia Variant

1. Edit `app-topic-config.js`:
   ```javascript
   activeTopic: 'music',
   ```

2. Run prebuild:
   ```bash
   npx expo prebuild --platform ios --clean
   ```

3. Open the project:
   ```bash
   open ios/MusicTrivia.xcworkspace
   ```

4. Build in Xcode as described above

## Example: Building the Default Trivia Feed App

1. Edit `app-topic-config.js`:
   ```javascript
   activeTopic: 'default',
   ```

2. Run prebuild:
   ```bash
   npx expo prebuild --platform ios --clean
   ```

3. Open the project:
   ```bash
   open ios/TriviaFeed.xcworkspace
   ```

4. Build in Xcode as described above

## Troubleshooting

- **Issue**: Prebuild fails with asset errors
  **Solution**: Ensure all required assets exist for the topic you're building

- **Issue**: App icon not reflecting the topic
  **Solution**: Verify the asset naming convention (`app-icon-{topic}.png`)

- **Issue**: Content not being filtered correctly
  **Solution**: Check the `dbTopicName` in your topic configuration matches exactly what's in the database

## Best Practices

1. Always commit your changes before running prebuild
2. Keep a backup of your project before making significant changes
3. Test each white-labeled variant thoroughly before distribution
4. When adding a new topic, ensure all required assets and configuration are in place
5. Document each white-labeled variant for future reference

## Additional Resources

- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
- [iOS App Distribution Guide](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Android App Distribution Guide](https://developer.android.com/studio/publish) 