import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { store } from '@/src/store';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  console.log('Attempting to load fonts...');
  
  // Load all required fonts including PlayfairDisplay
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Inter-Regular': require('../assets/fonts/inter/Inter-Regular.ttf'),
    'Inter-Bold': require('../assets/fonts/inter/Inter-Bold.ttf'),
    'PlayfairDisplay-Regular': require('../assets/fonts/trivia-universe-feed/assets/fonts/playfair/PlayfairDisplay-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      console.log('Fonts loaded successfully');
      SplashScreen.hideAsync().catch(err => console.error('Error hiding splash screen:', err));
    }
    if (error) {
      console.error('Error loading fonts:', error);
      // Still hide the splash screen even if fonts fail to load
      SplashScreen.hideAsync().catch(err => console.error('Error hiding splash screen:', err));
    }
  }, [loaded, error]);

  // Add web-specific styles to document if on web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Add CSS variables and styles for web
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
        
        :root {
          --trivia-app-background-color: #f5f5f5;
          --trivia-app-serif-font: 'Playfair Display', Georgia, serif;
          --trivia-app-sans-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        body {
          margin: 0;
          padding: 0;
          background-color: var(--trivia-app-background-color);
          height: 100%;
          width: 100%;
          overflow-x: hidden;
          font-family: var(--trivia-app-sans-font);
        }
        #root {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
        }
        /* Fix for tab content display issues */
        div[role="main"] {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Always proceed with system fonts if custom fonts fail to load
  if (!loaded && !error) {
    console.log('Still loading fonts...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading app resources...</Text>
      </View>
    );
  }

  // Proceed with the app whether fonts loaded or not
  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={styles.container}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </View>
      </ThemeProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Ensure content takes full height on web using platform-specific code
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - Web-specific styles
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
    } : {}),
  },
});
