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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, isLoading } = useAuth();
  
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
    console.log('📱 SignUp screen mounted, direct navigation:', isDirectNavigation);

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

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    await signUp(email, password);
  };

  const navigateToLogin = () => {
    router.push({
      pathname: '/auth/login',
      params: { direct: 'true' }
    });
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
            <Text style={[styles.welcomeMessage, isSmallScreen && styles.welcomeMessageSmall]}>{topicTheme.welcomeMessage}</Text>

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
            
            <NeonAuthInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              secureTextEntry={!showConfirmPassword}
              topicColor={topicColors.primary}
            />

            <Text style={[styles.termsText, isSmallScreen && styles.termsTextSmall]}>
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

          <View style={[styles.loginContainer, isSmallScreen && styles.loginContainerSmall]}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={[styles.loginLink, { color: topicColors.primary }]}>{topicTheme.loginButtonText}</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
    minHeight: '100%',
  },
  contentContainerSmall: {
    paddingTop: 40,
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
  welcomeMessage: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  welcomeMessageSmall: {
    fontSize: 12,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 24,
    textAlign: 'center',
  },
  termsTextSmall: {
    fontSize: 11,
    marginBottom: 16,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginContainerSmall: {
    marginTop: 10,
  },
  loginText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
}); 