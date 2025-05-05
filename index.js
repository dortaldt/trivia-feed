import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

import App from './App';

// Check for updates when the app starts (if running on a device via Expo Go)
async function checkForUpdates() {
  if (Platform.OS !== 'web') {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (error) {
      // Handle error
      console.log('Error checking for updates:', error);
    }
  }
}

// Only check for updates in non-development builds
if (!__DEV__) {
  checkForUpdates();
}

// Register the main component
registerRootComponent(App); 