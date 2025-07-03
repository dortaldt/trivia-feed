import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, TextInput, Text, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTopicTheme, getTopicColors, getTopicAppIcon } from '../../src/utils/topicTheming';
import { NeonAuthContainer } from '../../src/components/auth/NeonAuthContainer';
import { NeonAuthButton } from '../../src/components/auth/NeonAuthButton';
import { NeonAuthInput } from '../../src/components/auth/NeonAuthInput';
import { trackEvent, trackScreenView, trackButtonClick } from '../../src/lib/mixpanelAnalytics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { signIn, isLoading, continueAsGuest, isAuthenticated } = useAuth();
  
  // Get topic-specific theming
  const topicTheme = getTopicTheme();
  const topicColors = getTopicColors();
  
  // Get search params to check if we deliberately navigated here
  const params = useLocalSearchParams();
  const isDirectNavigation = params.direct === 'true';
  
  // Prevent auto-redirection when directly navigating to this screen
  useEffect(() => {
    console.log('📱 Login screen mounted, direct navigation:', isDirectNavigation);

    // Track this view to prevent unwanted redirects in _layout.tsx
    const trackAuthScreenView = async () => {
      try {
        await AsyncStorage.setItem('currentlyViewingAuthScreen', 'true');
        console.log('📱 Marked user as currently viewing auth screen');
        
        // Track screen view with Mixpanel
        await trackScreenView('Login Screen', {
          direct_navigation: isDirectNavigation,
          platform: Platform.OS,
          topic: topicTheme.displayName
        });
      } catch (e) {
        console.error('Error setting auth screen marker:', e);
      }
    };
    
    trackAuthScreenView();
    
    // Cleanup function to remove the marker when leaving the screen
    return () => {
      AsyncStorage.removeItem('currentlyViewingAuthScreen')
        .then(() => console.log('📱 Cleared auth screen viewing marker'))
        .catch(e => console.error('Error clearing auth screen marker:', e));
    };
  }, [isDirectNavigation]);

  const handleLogin = async () => {
    // Track login attempt
    await trackEvent('Login Attempt', {
      platform: Platform.OS,
      topic: topicTheme.displayName,
      email_provided: !!email,
      password_provided: !!password
    });

    if (!email || !password) {
      await trackEvent('Login Error', {
        error_type: 'missing_credentials',
        platform: Platform.OS,
        topic: topicTheme.displayName
      });
      alert('Please enter your email and password');
      return;
    }
    
    try {
      console.log('📱 Login attempt with:', { email, passwordProvided: !!password });
      
      // Show loading state immediately for better feedback
      setIsLoggingIn(true);
      
      await trackEvent('Login Submit', {
        platform: Platform.OS,
        topic: topicTheme.displayName
      });
      
      // Call signIn method from auth context with proper await and error handling
      await signIn(email, password);
      
      console.log('✅ Sign in API call completed');
      
      await trackEvent('Login Success', {
        platform: Platform.OS,
        topic: topicTheme.displayName
      });
      
      // If we're on iOS, perform an explicit navigation to ensure the app updates
      if (Platform.OS === 'ios') {
        console.log('📱 iOS platform detected, forcing navigation to home');
        setTimeout(() => {
          router.replace('/');
        }, 500);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      await trackEvent('Login Error', {
        error_type: 'login_failed',
        platform: Platform.OS,
        topic: topicTheme.displayName,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Show a user-friendly error message
      alert('Login failed. Please check your email and password and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleGuestMode = async () => {
    await trackButtonClick('Continue as Guest', {
      platform: Platform.OS,
      topic: topicTheme.displayName,
      source: 'login_screen'
    });
    
    await continueAsGuest();
    router.replace('/');
  };
  
  const handleGoBack = async () => {
    // Only available on mobile platforms - web users must sign up/in
    if (Platform.OS !== 'web') {
      await trackButtonClick('Back to Feed', {
        platform: Platform.OS,
        topic: topicTheme.displayName,
        source: 'login_screen'
      });
      
      // Go back to feed in guest mode
      await continueAsGuest();
      // Use router.replace consistently across platforms
      router.replace('/');
    }
  };

  const navigateToSignUp = async () => {
    await trackButtonClick('Navigate to Signup', {
      platform: Platform.OS,
      topic: topicTheme.displayName,
      source: 'login_screen'
    });
    
    router.push('/auth/signup');
  };

  const navigateToForgotPassword = async () => {
    await trackButtonClick('Forgot Password', {
      platform: Platform.OS,
      topic: topicTheme.displayName,
      source: 'login_screen'
    });
    
    router.push('/auth/forgot-password');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <NeonAuthContainer topicColor={topicColors.primary}>
        <StatusBar style="light" />
        
        {/* Back button only on mobile platforms */}
        {Platform.OS !== 'web' && (
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleGoBack}
              accessibilityLabel="Go back to feed"
              accessibilityHint="Returns to the feed in guest mode"
            >
              <Ionicons name="arrow-back" size={24} color={topicColors.primary} />
              <Text style={[styles.backButtonText, { color: topicColors.primary }]}>Back to Feed</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentContainer}>
              {/* Logo Section */}
              <View style={styles.logoContainer}>
                <View style={styles.logoWrapper}>
                  <Image 
                    source={getTopicAppIcon()}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Form Section */}
              <View style={styles.formContainer}>
                <Text style={styles.subtitle}>{topicTheme.authTitle}</Text>
                <Text style={styles.description}>{topicTheme.loginPrompt}</Text>

                <NeonAuthInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  label="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  inputMode="email"
                  topicColor={topicColors.primary}
                  required
                />

                <NeonAuthInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  label="Password"
                  secureTextEntry
                  autoComplete="current-password"
                  topicColor={topicColors.primary}
                  required
                />
                
                <TouchableOpacity onPress={navigateToForgotPassword} style={styles.forgotPasswordContainer}>
                  <Text style={[styles.forgotPasswordText, { color: topicColors.primary }]}>Forgot Password?</Text>
                </TouchableOpacity>

                <NeonAuthButton
                  onPress={handleLogin}
                  title={topicTheme.loginButtonText}
                  loading={isLoggingIn}
                  variant="primary"
                  topicColor={topicColors.primary}
                />
                
                {/* Guest mode button - only show on mobile platforms */}
                {Platform.OS !== 'web' && (
                  <NeonAuthButton
                    onPress={handleGuestMode}
                    title="Continue as Guest"
                    variant="secondary"
                    topicColor={topicColors.primary}
                  />
                )}
              </View>

              {/* Footer Section */}
              <View style={styles.createAccountContainer}>
                <Text style={styles.createAccountText}>Don't have an account?</Text>
                <TouchableOpacity onPress={navigateToSignUp}>
                  <Text style={[styles.createAccountLink, { color: topicColors.primary }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </NeonAuthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS !== 'web' ? 80 : 20, // Account for back button on mobile
    paddingBottom: 20,
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  subtitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  createAccountText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  createAccountLink: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
}); 