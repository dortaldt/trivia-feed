# Topic-Based App Developer Guide

This guide provides detailed instructions for developers working with the topic-based configuration system in the Trivia Feed app.

## Overview

The Trivia Feed app can be configured to focus on a specific topic (like Music, Science, etc.), 
which changes both the app's appearance (icons, splash screen) and content filtering.

This is a build-time configuration system, meaning each build of the app is dedicated to a specific topic 
or the default multi-topic experience.

## Getting Started

### Prerequisites

- Node.js and npm installed
- Sharp image processing library: `npm install sharp`
- A high-quality source icon for your topic (1024x1024 recommended)

## Creating a New Topic

Follow these steps to add a new topic to the system:

### 1. Prepare Your Topic Icon

1. Create a high-quality icon representing your topic (1024x1024 pixels recommended)
2. Name it `app-icon-{topic}.png` (e.g., `app-icon-sports.png`)
3. Place it in the `assets/images` directory

### 2. Run the Asset Generator

```bash
# Install Sharp if you haven't already
npm install sharp

# Generate all required assets for your topic
node scripts/generate-topic-assets.js your-topic-name
```

This script will create:
- Favicons of various sizes
- Apple touch icon
- Splash screen
- Adaptive icon for Android

### 3. Update Topic Configuration

Edit `app-topic-config.js` to add your new topic:

```javascript
topics: {
  // ... existing topics ...
  
  // Add your new topic
  "your-topic-name": {
    displayName: "Your Topic Display Name",
    description: "Short description of your topic",
    dbTopicName: "ExactTopicNameInDatabase", // As it appears in the database
  }
}
```

### 4. Build a Topic-Specific App

To build an app focused on your topic:

1. Edit `app-topic-config.js`:
   ```javascript
   activeTopic: 'your-topic-name',
   filterContentByTopic: true,
   ```

2. Build the app:
   ```bash
   npm run build
   ```

## How It Works

### Asset Resolution

The app uses the following logic to resolve assets:

1. If `activeTopic` is set to `default`, standard assets are used (e.g., `app-icon.png`)
2. If `activeTopic` is set to a specific topic, topic-specific assets are used (e.g., `app-icon-music.png`)

This is configured in `app.config.js` which reads from `app-topic-config.js`.

### Content Filtering

When `filterContentByTopic` is `true`:

1. The app adds a filter to Supabase queries
2. Only questions with matching topic names are returned
3. The filter uses the `dbTopicName` value from your topic configuration

## Troubleshooting

### Missing Assets

If you see errors about missing assets:

1. Verify that your source icon exists at `assets/images/app-icon-{topic}.png`
2. Run the asset generator script again
3. Check the output directories (`public/` and `assets/images/`) for the generated files

### Content Not Filtering Correctly

If topic filtering isn't working:

1. Verify `filterContentByTopic` is `true` in `app-topic-config.js`
2. Check that `dbTopicName` exactly matches the topic name in your database
3. Look at the console logs for any filtering errors

## Advanced Customization

### Custom Background Colors

You can customize the background color used for transparent areas in your assets:

1. Edit `scripts/generate-topic-assets.js`
2. Modify the `BG_COLOR` constant or the background settings in `ASSETS_CONFIG`

### Adding New Asset Types

To add new asset types:

1. Add a new entry to the `ASSETS_CONFIG` array in `scripts/generate-topic-assets.js`
2. Update the asset resolution logic in `app.config.js`

## Best Practices

1. **High-Quality Source Icons**: Always start with high-resolution source icons (1024x1024 pixels minimum)

2. **Consistent Naming**: Follow the established naming conventions (`app-icon-{topic}.png`)

3. **Topic Names in Database**: Ensure your database has consistent topic names that match your configuration

4. **Testing**: Always test both filtered and unfiltered modes before releasing

5. **Documentation**: Document any new topics added to the system in this guide

## Reference

### File Structure

```
├── app-topic-config.js           # Topic configuration
├── app.config.js                 # Expo config using topic settings
├── assets/
│   ├── images/
│   │   ├── app-icon.png          # Default app icon
│   │   ├── app-icon-music.png    # Music topic source icon
│   │   ├── splash-icon-music.png # Generated splash icon
│   │   └── ...
├── public/
│   ├── favicon.png               # Default favicon
│   ├── favicon-music.png         # Music topic favicon
│   ├── favicon-music-16x16.png   # Smaller variants
│   └── ...
└── scripts/
    └── generate-topic-assets.js  # Asset generator script
```

### Available Scripts

- `node scripts/generate-topic-assets.js [topic]`: Generate all assets for a topic
- `node scripts/generate-topic-assets.js --help`: Show help information 