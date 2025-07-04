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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, isLoading } = useAuth();
  
  // Get topic-specific theming
  const topicTheme = getTopicTheme();
  const topicColors = getTopicColors();
  
  // Get search params to check if we deliberately navigated here
  const params = useLocalSearchParams();
  const isDirectNavigation = params.direct === 'true';
  
  // Prevent auto-redirection when directly navigating to this screen
  useEffect(() => {
    console.log('📱 SignUp screen mounted, direct navigation:', isDirectNavigation);

    // Track this view to prevent unwanted redirects in _layout.tsx
    const trackAuthScreenView = async () => {
      try {
        await AsyncStorage.setItem('currentlyViewingAuthScreen', 'true');
        console.log('📱 Marked user as currently viewing auth screen');
        
        // Track screen view with Mixpanel
        await trackScreenView('Signup Screen', {
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

  const handleSignUp = async () => {
    // Track signup attempt
    await trackEvent('Signup Attempt', {
      platform: Platform.OS,
      topic: topicTheme.displayName,
      email_provided: !!email,
      password_provided: !!password,
      confirm_password_provided: !!confirmPassword
    });

    if (!email || !password || !confirmPassword) {
      await trackEvent('Signup Error', {
        error_type: 'missing_fields',
        platform: Platform.OS,
        topic: topicTheme.displayName
      });
      alert('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      await trackEvent('Signup Error', {
        error_type: 'password_mismatch',
        platform: Platform.OS,
        topic: topicTheme.displayName
      });
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      await trackEvent('Signup Error', {
        error_type: 'password_too_short',
        platform: Platform.OS,
        topic: topicTheme.displayName
      });
      alert('Password must be at least 6 characters long');
      return;
    }
    
    try {
      await trackEvent('Signup Submit', {
        platform: Platform.OS,
        topic: topicTheme.displayName
      });
      
      await signUp(email, password);
      
      await trackEvent('Signup Success', {
        platform: Platform.OS,
        topic: topicTheme.displayName
      });
    } catch (error) {
      await trackEvent('Signup Error', {
        error_type: 'signup_failed',
        platform: Platform.OS,
        topic: topicTheme.displayName,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };

  const navigateToLogin = async () => {
    await trackButtonClick('Navigate to Login', {
      platform: Platform.OS,
      topic: topicTheme.displayName,
      source: 'signup_screen'
    });
    
    router.push({
      pathname: '/auth/login',
      params: { direct: 'true' }
    });
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
                <Text style={styles.welcomeMessage}>{topicTheme.welcomeMessage}</Text>

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
                  placeholder="Min 6 characters"
                  label="Password"
                  secureTextEntry
                  autoComplete="new-password"
                  topicColor={topicColors.primary}
                  required
                />
                
                <NeonAuthInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Same password again"
                  label="Confirm"
                  secureTextEntry
                  autoComplete="new-password"
                  topicColor={topicColors.primary}
                  required
                />

                <Text style={styles.termsText}>
                  By signing up, you agree to our{' '}
                  <Text style={[styles.termsLink, { color: topicColors.primary }]}>Terms of Service</Text> and{' '}
                  <Text style={[styles.termsLink, { color: topicColors.primary }]}>Privacy Policy</Text>
                </Text>

                <NeonAuthButton
                  onPress={handleSignUp}
                  title={topicTheme.signupButtonText}
                  loading={isLoading}
                  variant="primary"
                  topicColor={topicColors.primary}
                />
              </View>

              {/* Footer Section */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <TouchableOpacity onPress={navigateToLogin}>
                  <Text style={[styles.loginLink, { color: topicColors.primary }]}>{topicTheme.loginButtonText}</Text>
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
    paddingTop: 40,
    paddingBottom: 20,
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
  welcomeMessage: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  loginText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
}); 