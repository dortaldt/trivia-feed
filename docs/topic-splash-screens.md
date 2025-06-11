# Topic-Specific Splash Screens

This documentation explains how the app automatically uses topic-specific splash screens and app icons based on the active topic configuration.

## Overview

The app now supports topic-specific branding across all splash screens and app icons:

- **In-app loading screens** (ThemedLoadingScreen component)
- **Login screen app icon**
- **Expo splash screen** (app.json configuration)
- **iOS native splash screen** (storyboard configuration)
- **Web favicon**

## How It Works

### 1. Dynamic Icon Functions

The app uses two main functions in `src/components/ThemedLoadingScreen.tsx`:

- `getAppIcon()` - Returns topic-specific app icons
- `getSplashIcon()` - Returns topic-specific splash icons

These functions follow a naming convention and automatically fall back to default icons if topic-specific ones don't exist.

### 2. Naming Convention

Topic-specific assets should follow these naming patterns:

```
assets/images/
├── app-icon-{topic}.png          # App icons
├── splash-icon-{topic}.png       # Splash screen icons
├── app-icon.png                  # Default app icon
└── splash-icon.png               # Default splash icon
```

**Examples:**
- `app-icon-music.png`
- `app-icon-nineties.png`
- `app-icon-friends.png`
- `splash-icon-music.png`
- `splash-icon-nineties.png`

### 3. Supported Topics

Currently supported topics with icon mappings:

- `music` → `app-icon-music.png`, `splash-icon-music.png`
- `nineties` → `app-icon-nineties.png`, `splash-icon-nineties.png`
- `friends` / `friends-tv` → `app-icon-friends.png`, `splash-icon-friends.png`
- `science` → `app-icon-science.png`, `splash-icon-science.png`
- `history` → `app-icon-history.png`, `splash-icon-history.png`
- `movies-and-tv` → `app-icon-movies-and-tv.png`, `splash-icon-movies-and-tv.png`

## Adding New Topics

### Step 1: Add Assets

1. Create topic-specific app icon: `assets/images/app-icon-{topic}.png`
2. Create topic-specific splash icon: `assets/images/splash-icon-{topic}.png`

### Step 2: Update Icon Functions

Add your topic to both switch statements in `src/components/ThemedLoadingScreen.tsx`:

```javascript
// In getAppIcon() function
case 'your-topic':
  return require('../../assets/images/app-icon-your-topic.png');

// In getSplashIcon() function  
case 'your-topic':
  return require('../../assets/images/splash-icon-your-topic.png');
```

### Step 3: Update Scripts (Optional)

For iOS native splash support, add your topic to the `topicsWithAssets` array in `scripts/update-ios-splash-for-topic.js`:

```javascript
const topicsWithAssets = ['music', 'nineties', 'friends', 'friends-tv', 'your-topic'];
```

### Step 4: Update Configuration

Run the splash screen update script:

```bash
npm run update-splash
```

This will automatically update:
- `app.json` with topic-specific splash screen
- iOS storyboard with topic-specific logo reference

## Scripts

### `npm run update-splash`

Master script that updates all splash screen configurations based on the current `activeTopic` in `app-topic-config.js`.

**What it does:**
- Updates `app.json` expo splash configuration
- Updates iOS storyboard splash logo reference
- Updates app icon and favicon references

### Individual Scripts

- `scripts/update-splash-for-topic.js` - Updates app.json only
- `scripts/update-ios-splash-for-topic.js` - Updates iOS storyboard only
- `scripts/update-all-splash-screens.js` - Master script (runs both)

## File Structure

```
src/components/
└── ThemedLoadingScreen.tsx        # Main component with icon functions

scripts/
├── update-splash-for-topic.js     # Updates app.json
├── update-ios-splash-for-topic.js # Updates iOS storyboard  
└── update-all-splash-screens.js   # Master script

assets/images/
├── app-icon-*.png                 # Topic-specific app icons
├── splash-icon-*.png              # Topic-specific splash icons
├── app-icon.png                   # Default app icon
└── splash-icon.png                # Default splash icon

app-topic-config.js                # Topic configuration
app.json                          # Expo configuration (auto-updated)
ios/MusicTrivia/SplashScreen.storyboard  # iOS splash (auto-updated)
```

## Usage Examples

### In Components

```javascript
import { getAppIcon, getSplashIcon } from '@/src/components/ThemedLoadingScreen';

// Use in React Native Image component
<Image source={getAppIcon()} />
<Image source={getSplashIcon()} />
```

### Topic Configuration

Change the active topic in `app-topic-config.js`:

```javascript
module.exports = {
  activeTopic: 'friends',  // Will use app-icon-friends.png
  // ... rest of config
};
```

Then run:

```bash
npm run update-splash
```

## Fallback Behavior

- If a topic-specific icon doesn't exist, the system automatically falls back to the default icon
- No errors are thrown for missing assets
- The app continues to work normally with default branding

## Development Workflow

1. **Changing Topics:**
   ```bash
   # Edit app-topic-config.js
   # Then update all splash screens
   npm run update-splash
   
   # Restart development server
   npm start
   ```

2. **Adding New Icons:**
   ```bash
   # Add assets to assets/images/
   # Update icon functions in ThemedLoadingScreen.tsx
   # Run update script
   npm run update-splash
   ```

3. **Building for Production:**
   ```bash
   # Ensure splash screens are updated for current topic
   npm run update-splash
   
   # Then build as normal
   npm run build
   ```

## Platform-Specific Notes

### iOS
- The storyboard references `SplashScreenLogo-{topic}` images
- You'll need to add these to the iOS asset catalog manually
- Run `npm run update-splash` before iOS builds

### Android
- Uses the Expo splash configuration from app.json
- Automatically updates when you run the update script

### Web
- Uses the favicon setting from app.json
- Automatically updates to use topic-specific app icon

## Troubleshooting

### Icons Not Showing
1. Check that asset files exist with correct naming
2. Verify topic is added to switch statements
3. Run `npm run update-splash`
4. Restart development server

### iOS Splash Not Working
1. Ensure topic is in `topicsWithAssets` array
2. Add corresponding assets to iOS project
3. Clean and rebuild iOS project

### Script Errors
1. Check that `app-topic-config.js` is valid
2. Ensure file paths are correct
3. Verify write permissions on config files 