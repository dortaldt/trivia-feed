import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { View, Text, StyleSheet, Platform } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { store } from '@/src/store';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Auth protection component to redirect users based on auth state
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { user, session, isLoading } = useAuth();

  // Separate useEffect for debugging the current auth state
  useEffect(() => {
    const currentPath = segments.join('/');
    console.log('📱 Current path:', currentPath);
    console.log('🔑 Auth state:', { 
      user: user ? `User: ${user.id} (${user.email})` : 'No user',
      session: session ? `Valid until: ${new Date(session.expires_at! * 1000).toLocaleString()}` : 'No session',
      isLoading
    });
  }, [user, session, segments, isLoading]);

  // Main effect for handling redirections
  useEffect(() => {
    // Skip redirection logic during loading
    if (isLoading) {
      console.log('⏳ Auth state is still loading - deferring redirection');
      return;
    }

    const currentPath = segments.join('/');
    const inAuthGroup = segments[0] === 'auth';
    
    console.log('🧭 Evaluating redirection:', {
      isAuthenticated: !!user,
      hasSession: !!session,
      inAuthGroup,
      currentPath,
    });

    // Force a small delay to ensure our redirection happens after any state updates
    setTimeout(() => {
      if (!user && !inAuthGroup) {
        console.log('🔄 Redirecting unauthenticated user to login');
        router.replace('/auth/login');
      } else if (user && inAuthGroup) {
        console.log('🔄 Redirecting authenticated user to home');
        router.replace('/');
      } else {
        console.log('✅ No redirection needed - correct route for auth state');
      }
    }, 100);
  }, [user, session, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading authentication state...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

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
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthWrapper>
            <View style={styles.container}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
                <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </View>
          </AuthWrapper>
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Apply web-specific styles only for web platform
    ...(Platform.OS === 'web' 
      ? {
          // Use type assertions for web-specific CSS properties
          height: '100vh' as any,
          display: 'flex' as any,
          flexDirection: 'column' as any,
        } 
      : {}
    ),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 10,
  },
});
