import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Analytics } from '@vercel/analytics/react';
import { initMixpanel } from '../src/lib/mixpanelAnalytics';
import { suppressWebWarnings } from '../src/utils/webCompatibility';

// Import icons - use default imports instead of named imports
// This can help resolve some naming conflicts
import AntDesignIcon from '@expo/vector-icons/AntDesign';
import FeatherIcon from '@expo/vector-icons/Feather';
import FontAwesomeIcon from '@expo/vector-icons/FontAwesome';
import MaterialIconsIcon from '@expo/vector-icons/MaterialIcons';

import { useColorScheme } from '@/hooks/useColorScheme';
import { store } from '@/src/store';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { ThemeProvider as UIThemeProvider } from '@/src/theme/ThemeProvider';
import { Colors } from '@/constants/Colors';
import { SimplifiedSyncManager } from '@/src/components/SimplifiedSyncManager';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Initialize web compatibility fixes
suppressWebWarnings();

// Auth protection component to redirect users based on auth state
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { user, session, isLoading, isGuest, continueAsGuest } = useAuth();
  // Track if the user explicitly navigated to the auth pages
  const [explicitAuthNavigation, setExplicitAuthNavigation] = useState(false);

  // Detect explicit navigation to auth pages
  useEffect(() => {
    const inAuthGroup = segments[0] === 'auth';
    if (inAuthGroup && !explicitAuthNavigation) {
      console.log('🔐 User explicitly navigated to auth page');
      setExplicitAuthNavigation(true);
    }
  }, [segments, explicitAuthNavigation]);

  // Separate useEffect for debugging the current auth state
  useEffect(() => {
    const currentPath = segments.join('/');
    console.log('📱 Current path:', currentPath);
    console.log('🔑 Auth state:', { 
      user: user ? `User: ${user.id} (${user.email})` : 'No user',
      session: session ? `Valid until: ${new Date(session.expires_at! * 1000).toLocaleString()}` : 'No session',
      isLoading,
      isGuest: isGuest ? 'In guest mode' : 'Not in guest mode',
      explicitAuthNavigation
    });
  }, [user, session, segments, isLoading, isGuest, explicitAuthNavigation]);

  // Effect to automatically put users in guest mode when not logged in
  useEffect(() => {
    // Only run this logic once when initially determining auth state
    if (!isLoading && !user && !isGuest) {
      const inAuthGroup = segments[0] === 'auth';
      
      // If user is actively trying to log in, don't force guest mode
      if (!inAuthGroup && !explicitAuthNavigation) {
        console.log('🧪 No authenticated user detected - automatically enabling guest mode');
        
        // Special handling for web platform
        if (Platform.OS === 'web') {
          console.log('🌐 Web platform detected - using web-specific guest mode activation');
          
          // Directly set guest mode in localStorage for immediate effect
          localStorage.setItem('guestMode', 'true');
          
          // For web, use a more direct approach
          (async () => {
            try {
              // Directly set in AsyncStorage too for consistency
              await AsyncStorage.setItem('guestMode', 'true');
              
              // Call the context method
              await continueAsGuest();
              
              console.log('🏠 Guest mode activated on web - forcing navigation');
              
              // Force an immediate hard navigation for web
              window.location.href = '/';
            } catch (error) {
              console.error('Error during web guest mode activation:', error);
            }
          })();
        } else {
          // Mobile platforms - use the router approach
          (async () => {
            await continueAsGuest();
            console.log('🏠 Guest mode activated - forcing navigation to home');
            router.replace('/');
          })();
        }
      }
    }
  }, [isLoading, user, isGuest, segments, explicitAuthNavigation]);

  // Main effect for handling redirections
  useEffect(() => {
    // Skip redirection logic during loading
    if (isLoading) {
      console.log('⏳ Auth state is still loading - deferring redirection');
      return;
    }

    // Define a function to check if user is currently on an auth screen
    const checkAuthScreenViewing = async () => {
      try {
        const viewingAuthScreen = await AsyncStorage.getItem('currentlyViewingAuthScreen');
        return viewingAuthScreen === 'true';
      } catch (e) {
        console.error('Error checking auth screen marker:', e);
        return false;
      }
    };

    // Special check for web platform - check localStorage directly
    if (Platform.OS === 'web' && !user && !isGuest) {
      const directGuestCheck = localStorage.getItem('guestMode') === 'true';
      if (directGuestCheck) {
        console.log('🌐 Found guest mode in localStorage but not in state yet - deferring');
        return;
      }
    }

    // If we're in the process of setting up guest mode, don't do other redirects
    if (!user && !isGuest && !segments.join('/').startsWith('auth')) {
      console.log('⏳ Waiting for guest mode setup - deferring standard redirection');
      return;
    }

    const currentPath = segments.join('/');
    const inAuthGroup = segments[0] === 'auth';
    
    console.log('🧭 Evaluating redirection:', {
      isAuthenticated: !!user,
      hasSession: !!session,
      isGuest,
      inAuthGroup,
      currentPath,
      explicitAuthNavigation
    });

    // Force a small delay to ensure our redirection happens after any state updates
    setTimeout(async () => {
      // Check if user deliberately wants to stay on auth screen
      const isViewingAuthScreen = await checkAuthScreenViewing();
      
      // If user is currently viewing auth screen or explicitly navigated there, let them stay
      if ((inAuthGroup && explicitAuthNavigation) || isViewingAuthScreen) {
        console.log('✋ User explicitly viewing auth screen - allowing them to stay');
        return;
      }
      
      // Only redirect if not logged in AND not in guest mode AND not already on auth page
      if (!user && !isGuest && !inAuthGroup) {
        console.log('🔄 Redirecting unauthenticated user to login');
        
        // For web, use direct location change for more reliable redirect
        if (Platform.OS === 'web') {
          window.location.href = '/auth/login';
        } else {
          router.replace('/auth/login');
        }
      } else if ((user || isGuest) && inAuthGroup && !explicitAuthNavigation && !isViewingAuthScreen) {
        console.log('🔄 Redirecting user to home (authenticated or guest)');
        
        // For web, use direct location change for more reliable redirect
        if (Platform.OS === 'web') {
          window.location.href = '/';
        } else {
          router.replace('/');
        }
      } else {
        console.log('✅ No redirection needed - correct route for auth state');
      }
    }, 100);
  }, [user, session, isGuest, segments, isLoading, explicitAuthNavigation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading authentication state...</Text>
      </View>
    );
  }

  return (
    <>
      <SimplifiedSyncManager>
        {children}
      </SimplifiedSyncManager>
    </>
  );
}

export default function RootLayout() {
  // Always use dark mode, regardless of device theme
  const colorScheme = 'dark';
  const [appIsReady, setAppIsReady] = useState(false);
  
  console.log('Attempting to load fonts...');
  
  // Use a simpler approach with standard fonts first
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Inter-Regular': require('../assets/fonts/inter/Inter-Regular.ttf'),
    'Inter-Bold': require('../assets/fonts/inter/Inter-Bold.ttf'),
    'PlayfairDisplay-Regular': require('../assets/fonts/trivia-universe-feed/assets/fonts/playfair/PlayfairDisplay-Regular.ttf'),
  });

  // Load icon fonts separately using a direct approach
  useEffect(() => {
    const loadIconFonts = async () => {
      try {
        // Use the correct path structure where the font files actually exist
        await Font.loadAsync({
          // Use the exact paths found in the node_modules directory
          'AntDesign': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf'),
          'Feather': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
          'FontAwesome': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
          'MaterialIcons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
        });
        console.log('Icon fonts loaded successfully');
      } catch (e) {
        console.error('Error loading icon fonts:', e);
      }
    };

    loadIconFonts();
  }, []);

  // Combined initialization function - handles both font loading and other preparations
  useEffect(() => {
    async function prepareApp() {
      try {
        // Wait for font loading or error
        if (loaded || error) {
          console.log(loaded ? 'Custom fonts loaded successfully' : 'Error loading custom fonts, proceeding with system fonts');
          
          // Simulate additional initialization if needed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // App is ready - can hide splash screen
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn('Error preparing app:', e);
        setAppIsReady(true); // Still mark as ready even on error
      }
    }

    prepareApp();
  }, [loaded, error]);

  // Handle splash screen hiding based on app readiness
  useEffect(() => {
    if (appIsReady) {
      // Hide splash screen when everything is ready
      SplashScreen.hideAsync().catch(err => 
        console.warn('Error hiding splash screen:', err)
      );
    }
  }, [appIsReady]);
  
  // Initialize Mixpanel for mobile platforms
  useEffect(() => {
    // Only initialize on native platforms (not web)
    if (Platform.OS !== 'web' && appIsReady) {
      // Initialize Mixpanel
      initMixpanel()
        .then(() => console.log('Mixpanel initialized for mobile platform'))
        .catch(error => console.error('Failed to initialize Mixpanel:', error));
    }
  }, [appIsReady]);

  // Add web-specific styles to document if on web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Load analytics for web platform
      const loadAnalytics = async () => {
        try {
          // Initialize Vercel Analytics
          const { inject } = await import('@vercel/analytics');
          inject();
          console.log('Vercel Analytics loaded successfully');
          
          // Initialize Mixpanel
          await initMixpanel();
          console.log('Mixpanel initialized for web platform');
        } catch (error) {
          console.error('Failed to load analytics:', error);
        }
      };
      
      loadAnalytics();
      
      // Add viewport meta tag for mobile browsers
      const viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0';
      document.head.appendChild(viewportMeta);

      // Add CSS variables and styles for web
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
        
        :root {
          --trivia-app-background-color: #151718;
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
          color: #ECEDEE;
        }
        #root {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-height: 100svh; /* Use small viewport height for iOS Safari */
          width: 100%;
        }
        /* Fix for tab content display issues */
        div[role="main"] {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        /* Fix for iOS Safari navbar issue */
        nav.rn-tab-bar {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 1000 !important;
          padding-bottom: env(safe-area-inset-bottom, 8px) !important;
          height: auto !important;
          min-height: 49px !important;
        }
        /* Fix for tab labels being cut off at bottom */
        nav.rn-tab-bar a[role="tab"] {
          padding-bottom: 8px !important;
          height: auto !important;
          min-height: 49px !important;
          display: flex !important;
          flex-direction: column !important;
        }
        nav.rn-tab-bar a[role="tab"] div:last-child {
          max-width: none !important;
          overflow: visible !important;
          white-space: normal !important;
          padding-bottom: 4px !important;
          margin-top: 2px !important;
        }
      `;
      document.head.appendChild(style);

      // Import our custom dark theme CSS
      const linkElem = document.createElement('link');
      linkElem.rel = 'stylesheet';
      linkElem.href = '/assets/web/styles.css';
      document.head.appendChild(linkElem);

      // Apply dark theme to body
      document.body.classList.add('dark-theme');
    }
  }, []);

  // Show loading indicator if app isn't ready yet
  if (!appIsReady) {
    return null; // Return null while splash screen is still showing
  }

  // Proceed with the app whether fonts loaded or not
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AuthProvider>
          {/* Custom theme provider from context for advanced theme options */}
          <ThemeProvider>
            {/* We removed the UIThemeProvider to avoid conflicts */}
            <NavigationThemeProvider value={DarkTheme}>
              <AuthWrapper>
                <View style={styles.container}>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                    <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
                    <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <StatusBar style="light" />
                </View>
              </AuthWrapper>
            </NavigationThemeProvider>
          </ThemeProvider>
        </AuthProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.dark.text,
    marginTop: 10,
  },
});
