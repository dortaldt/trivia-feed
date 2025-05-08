import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, TextInput, Text, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { signIn, isLoading, continueAsGuest, isAuthenticated } = useAuth();
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
    // Go back to feed in guest mode
    await continueAsGuest();
    // Use router.replace consistently across platforms
    router.replace('/');
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      
      {/* Back button at the top */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
          accessibilityLabel="Go back to feed"
          accessibilityHint="Returns to the feed in guest mode"
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text style={styles.backButtonText}>Back to Feed</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/app-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Trivia Universe</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.subtitle}>Welcome back</Text>
          <Text style={styles.description}>Sign in to continue your trivia adventure</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#999" 
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity onPress={navigateToForgotPassword} style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLogin} 
            style={[
              styles.signInButton,
              isLoggingIn && styles.signInButtonDisabled
            ]}
            disabled={isLoggingIn}
            activeOpacity={0.7}
          >
            {isLoggingIn ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleGuestMode} style={styles.guestModeButton}>
            <Ionicons name="person-outline" size={18} color="#666" style={{ marginRight: 8 }} />
            <Text style={styles.guestModeButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.createAccountContainer}>
          <Text style={styles.createAccountText}>Don't have an account?</Text>
          <TouchableOpacity onPress={navigateToSignUp}>
            <Text style={styles.createAccountLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    marginLeft: 6,
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestModeButton: {
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  guestModeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  createAccountText: {
    color: '#666',
    fontSize: 14,
  },
  createAccountLink: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  signInButtonDisabled: {
    backgroundColor: '#97c4e3',
  },
}); 