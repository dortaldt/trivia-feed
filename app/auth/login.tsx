import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, TextInput, Text, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTopicTheme, getTopicColors, getTopicAppIcon } from '../../src/utils/topicTheming';
import { NeonAuthContainer } from '../../src/components/auth/NeonAuthContainer';
import { NeonAuthButton } from '../../src/components/auth/NeonAuthButton';
import { NeonAuthInput } from '../../src/components/auth/NeonAuthInput';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { signIn, isLoading, continueAsGuest, isAuthenticated } = useAuth();
  
  // Get topic-specific theming
  const topicTheme = getTopicTheme();
  const topicColors = getTopicColors();
  
  // Get screen dimensions for responsive design
  const { height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenHeight < 700; // Determine if we need compact layout
  
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
    if (!email || !password) {
      alert('Please enter your email and password');
      return;
    }
    
    try {
      console.log('📱 Login attempt with:', { email, passwordProvided: !!password });
      
      // Show loading state immediately for better feedback
      setIsLoggingIn(true);
      
      // Call signIn method from auth context with proper await and error handling
      await signIn(email, password);
      
      console.log('✅ Sign in API call completed');
      
      // If we're on iOS, perform an explicit navigation to ensure the app updates
      if (Platform.OS === 'ios') {
        console.log('📱 iOS platform detected, forcing navigation to home');
        setTimeout(() => {
          router.replace('/');
        }, 500);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Show a user-friendly error message
      alert('Login failed. Please check your email and password and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleGuestMode = async () => {
    await continueAsGuest();
    router.replace('/');
  };
  
  const handleGoBack = async () => {
    // Only available on mobile platforms - web users must sign up/in
    if (Platform.OS !== 'web') {
      // Go back to feed in guest mode
      await continueAsGuest();
      // Use router.replace consistently across platforms
      router.replace('/');
    }
  };

  const navigateToSignUp = () => {
    router.push('/auth/signup');
  };

  const navigateToForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
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
        style={styles.container}
      >
        <View style={[styles.contentContainer, isSmallScreen && styles.contentContainerSmall]}>
          <View style={[styles.logoContainer, isSmallScreen && styles.logoContainerSmall]}>
            <Image 
              source={getTopicAppIcon()}
              style={[styles.logo, isSmallScreen && styles.logoSmall]}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.formContainer, isSmallScreen && styles.formContainerSmall]}>
            <Text style={[styles.subtitle, isSmallScreen && styles.subtitleSmall]}>{topicTheme.authTitle}</Text>
            <Text style={[styles.description, isSmallScreen && styles.descriptionSmall]}>{topicTheme.loginPrompt}</Text>

            <NeonAuthInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              topicColor={topicColors.primary}
            />

            <NeonAuthInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              topicColor={topicColors.primary}
            />
            
            <TouchableOpacity onPress={navigateToForgotPassword} style={[styles.forgotPasswordContainer, isSmallScreen && styles.forgotPasswordContainerSmall]}>
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

          <View style={[styles.createAccountContainer, isSmallScreen && styles.createAccountContainerSmall]}>
            <Text style={styles.createAccountText}>Don't have an account?</Text>
            <TouchableOpacity onPress={navigateToSignUp}>
              <Text style={[styles.createAccountLink, { color: topicColors.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </NeonAuthContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    paddingVertical: 6,
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
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
    minHeight: '100%',
  },
  contentContainerSmall: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainerSmall: {
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20, // Added rounded corners
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // Android shadow
  },
  logoSmall: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainerSmall: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  subtitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitleSmall: {
    fontSize: 22,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 30,
    textAlign: 'center',
  },
  descriptionSmall: {
    fontSize: 14,
    marginBottom: 20,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordContainerSmall: {
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  createAccountContainerSmall: {
    marginTop: 10,
  },
  createAccountText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  createAccountLink: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
}); 