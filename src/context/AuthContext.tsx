import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Define the shape of our auth context
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean | void>;
  signOut: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (userData: { username?: string; fullName?: string; avatarUrl?: string; country?: string }) => Promise<void>;
  continueAsGuest: () => Promise<void>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Initialize auth state when the provider mounts
  useEffect(() => {
    const initAuth = async () => {
      // Check if user is in guest mode from AsyncStorage
      try {
        console.log('Checking for guest mode in AsyncStorage...');
        const guestMode = await AsyncStorage.getItem('guestMode');
        console.log('Guest mode AsyncStorage value:', guestMode);
        
        if (guestMode === 'true') {
          console.log('Found guest mode flag, initializing as guest');
          setIsGuest(true);
          setIsLoading(false);
          return; // Skip Supabase auth check for guest users
        }
      } catch (error) {
        console.error('Error checking guest mode:', error);
      }
      
      // Normal auth flow for non-guest users
      console.log('Checking for existing Supabase session...');
      supabase.auth.getSession().then((response: { data: { session: Session | null } }) => {
        const currentSession = response.data.session;
        console.log('Session check result:', currentSession ? 'Session found' : 'No session found');
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // If no session, set guest mode automatically
        if (!currentSession) {
          console.log('No active session found, enabling guest mode');
          setIsGuest(true);
          AsyncStorage.setItem('guestMode', 'true')
            .then(() => console.log('Guest mode flag set in AsyncStorage'))
            .catch(err => console.error('Failed to set guest mode flag:', err));
        }
        
        setIsLoading(false);
      });
    };
    
    initAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
      console.log('Auth state changed:', _event, newSession ? 'New session' : 'No session');
      
      // If user logs in, clear guest mode
      if (newSession) {
        console.log('User logged in, clearing guest mode');
        setIsGuest(false);
        AsyncStorage.removeItem('guestMode')
          .then(() => console.log('Guest mode flag cleared'))
          .catch(err => console.error('Failed to clear guest mode flag:', err));
      }
      // If user logs out, enable guest mode
      else if (_event === 'SIGNED_OUT') {
        console.log('User signed out, enabling guest mode');
        setIsGuest(true);
        AsyncStorage.setItem('guestMode', 'true')
          .then(() => console.log('Guest mode flag set on sign out'))
          .catch(err => console.error('Failed to set guest mode flag on sign out:', err));
      }
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    // Clean up the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting sign up with email:', email);
      
      // Check if user with this email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', email)
        .maybeSingle();
        
      if (checkError) {
        console.warn('Error checking for existing user:', checkError.message);
      }
      
      if (existingUsers) {
        console.log('User with this email already exists');
        throw new Error('A user with this email already exists. Please try signing in instead.');
      }
      
      // Proceed with sign up
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) {
        console.error('Sign up error:', error.message, error.status);
        throw error;
      }
      
      console.log('Sign up response:', {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          identities: data.user.identities?.length || 0
        } : 'No user data',
        session: data.session ? 'Session created' : 'No session',
        userConfirmed: data.user?.email_confirmed_at ? 'Yes' : 'No',
      });
      
      if (!data.session) {
        // Email confirmation is required
        console.log('Email confirmation required for new user');
        Alert.alert(
          'Confirmation Email Sent',
          'Please check your email and click the confirmation link to complete your registration. Check your spam folder if you don\'t see it.',
          [{ text: 'OK', onPress: () => console.log('Email confirmation alert closed') }]
        );
      } else {
        // User was created and auto-confirmed
        console.log('User created and auto-confirmed (no email verification needed)');
        setSession(data.session);
        setUser(data.user);
        Alert.alert('Account Created', 'Your account has been created successfully.');
      }
    } catch (error: any) {
      console.error('Sign up error:', error.message);
      
      let errorMessage = error.message;
      if (error.message.includes('already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('AuthContext: Attempting to sign in with email/password', { email });
      
      // Clear any previous guest mode when signing in
      if (isGuest) {
        console.log('AuthContext: Clearing guest mode before sign in');
        await AsyncStorage.removeItem('guestMode');
        setIsGuest(false);
      }
      
      // Proceed with sign in attempt
      console.log('AuthContext: Calling Supabase signInWithPassword');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('AuthContext: Sign in error:', error.message, error.status);
        
        // Special handling for unconfirmed emails
        if (error.message.includes('Email not confirmed')) {
          console.log('AuthContext: Email not confirmed for user');
          Alert.alert(
            'Email Not Confirmed',
            'Your email address has not been confirmed. Would you like to resend the confirmation email?',
            [
              {
                text: 'Cancel',
                style: 'cancel'
              },
              {
                text: 'Resend Email',
                onPress: async () => {
                  try {
                    console.log('AuthContext: User requested to resend confirmation email');
                    const { error: resendError } = await supabase.auth.resend({
                      type: 'signup',
                      email: email,
                    });
                    
                    if (resendError) {
                      console.error('AuthContext: Failed to resend confirmation email:', resendError);
                      
                      // Handle rate limiting errors specifically
                      if (resendError.message.includes('after')) {
                        Alert.alert(
                          'Too Many Requests',
                          'Please wait a minute before requesting another confirmation email.',
                          [{ text: 'OK' }]
                        );
                      } else {
                        Alert.alert('Error', resendError.message);
                      }
                    } else {
                      console.log('AuthContext: Confirmation email resent successfully');
                      Alert.alert(
                        'Confirmation Email Sent',
                        'Please check your email and click the confirmation link to complete your registration.',
                        [{ text: 'OK' }]
                      );
                    }
                  } catch (resendError: any) {
                    console.error('AuthContext: Error in resend flow:', resendError.message);
                    Alert.alert('Error', 'Failed to resend confirmation email. Please try again later.');
                  }
                }
              }
            ]
          );
          return; // Exit the function early
        }
        
        throw error;
      }
      
      if (!data.user || !data.session) {
        console.error('AuthContext: Sign in succeeded but no user or session data returned');
        throw new Error('Authentication succeeded but no user data returned. Please try again.');
      }
      
      console.log('AuthContext: Sign in successful - Response:', {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at,
          createdAt: data.user.created_at
        } : 'No user',
        session: data.session ? {
          expiresAt: data.session.expires_at,
          refreshToken: data.session.refresh_token ? 'Present' : 'Missing',
          accessToken: data.session.access_token ? 'Present' : 'Missing',
        } : 'No session'
      });
      
      // Platform-specific post-sign-in handling
      if (Platform.OS === 'ios') {
        console.log('AuthContext: Applying iOS-specific sign-in handling');
        
        // On iOS, we make sure to enforce state updates sequentially with small delays
        // This helps with state synchronization issues that can occur on iOS
        setTimeout(() => {
          setSession(data.session);
          setTimeout(() => {
            setUser(data.user);
            setTimeout(() => {
              console.log('AuthContext: iOS state update sequence completed');
            }, 100);
          }, 100);
        }, 100);
      } else {
        // Standard flow for other platforms
        setSession(data.session);
        setUser(data.user);
      }
      
      // Force a delay to ensure state update is processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('AuthContext: Forced state check after delay:', {
        userSet: data.user?.id,
        sessionSet: data.session?.access_token ? 'Present' : 'Missing'
      });
      
      return true;
    } catch (error: any) {
      console.error('AuthContext: Sign in error:', error.message, error.status || '');
      
      let errorMessage = error.message;
      // Make error messages more user-friendly
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Incorrect email or password. Please try again.';
      }
      
      Alert.alert('Sign In Failed', errorMessage);
      
      // Important: Re-throw the error so calling code can handle it
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log('AuthContext: Starting signOut process');
      setIsLoading(true);
      
      // If already in guest mode, just clear it and return
      if (isGuest) {
        console.log('AuthContext: Clearing guest mode');
        await AsyncStorage.removeItem('guestMode');
        setIsGuest(false);
        setIsLoading(false);
        return true;
      }
      
      // First attempt - Standard signOut with global scope
      console.log('AuthContext: Attempting signOut with global scope');
      const { error: error1 } = await supabase.auth.signOut({ scope: 'global' });
      if (error1) {
        console.warn('AuthContext: First signOut attempt failed:', error1.message);
        // Continue with next approach rather than throwing
      } else {
        console.log('AuthContext: First signOut attempt successful');
      }

      // Second attempt - Forcefully kill the session if first attempt doesn't work
      try {
        console.log('AuthContext: Manually killing session in Supabase');
        await supabase.auth.killSession();
      } catch (killError) {
        console.warn('AuthContext: killSession attempt failed:', killError);
      }

      // Directly manipulate the internal state of the Supabase instance
      try {
        console.log('AuthContext: Manually clearing auth state in Supabase instance');
        // @ts-ignore - Accessing internal methods
        if (supabase.auth.setAuth) {
          // @ts-ignore
          supabase.auth.setAuth(null);
        }
        // @ts-ignore
        if (supabase.auth.clearStore) {
          // @ts-ignore
          await supabase.auth.clearStore();
        }
      } catch (clearError) {
        console.warn('AuthContext: Error clearing auth store:', clearError);
      }

      // Force clear AsyncStorage
      try {
        console.log('AuthContext: Clearing auth from AsyncStorage');
        const keys = await AsyncStorage.getAllKeys();
        const authKeys = keys.filter(key => 
          key.startsWith('supabase.auth') || 
          key.includes('token') || 
          key.includes('session')
        );
        
        if (authKeys.length > 0) {
          console.log('AuthContext: Found auth keys to remove:', authKeys);
          await AsyncStorage.multiRemove(authKeys);
        } else {
          console.log('AuthContext: No auth keys found in AsyncStorage');
        }
      } catch (storageError) {
        console.warn('AuthContext: Error clearing AsyncStorage:', storageError);
      }

      // After signing out, enable guest mode automatically
      console.log('AuthContext: Enabling guest mode after sign out');
      setIsGuest(true);
      await AsyncStorage.setItem('guestMode', 'true');
      
      // Explicitly reset the React state
      console.log('AuthContext: Resetting auth state in React context');
      setUser(null);
      setSession(null);

      console.log('AuthContext: SignOut process completed');
      
      // Force a small delay to ensure all async operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error: any) {
      console.error('AuthContext: Error during signOut process:', error.message);
      
      // Even if there was an error, try to enable guest mode
      try {
        console.log('AuthContext: Attempting to enable guest mode after error');
        setIsGuest(true);
        await AsyncStorage.setItem('guestMode', 'true');
      } catch (guestError) {
        console.error('AuthContext: Failed to enable guest mode after error:', guestError);
      }
      
      Alert.alert('Error', 'Failed to sign out properly. Please restart the app.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting to sign in with Google');
      
      const redirectUri = makeRedirectUri({
        scheme: 'trivia-universe-feed'
      });
      
      console.log('Redirect URI:', redirectUri);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true
        }
      });
      
      if (error) {
        console.error('Google OAuth error:', error.message);
        throw error;
      }
      
      if (data?.url) {
        console.log('Opening browser for OAuth flow');
        // Open the URL in a browser
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        
        if (result.type === 'success') {
          console.log('OAuth successful, exchanging code for session');
          // The user was redirected back to our app
          // Exchange the code for a session
          const { url } = result;
          const { data, error } = await supabase.auth.exchangeCodeForSession(url);
          
          if (error) {
            console.error('Code exchange error:', error.message);
            throw error;
          }
          
          console.log('Session obtained:', data.session ? 'Valid session' : 'No session');
          
          // Explicitly update the state to ensure immediate response
          setSession(data.session);
          setUser(data.user);
        } else {
          console.warn('OAuth flow was not successful:', result.type);
        }
      }
    } catch (error: any) {
      console.error('Google sign in error:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting to sign in with Apple');
      
      const redirectUri = makeRedirectUri({
        scheme: 'trivia-universe-feed'
      });
      
      console.log('Redirect URI:', redirectUri);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true
        }
      });
      
      if (error) {
        console.error('Apple OAuth error:', error.message);
        throw error;
      }
      
      if (data?.url) {
        console.log('Opening browser for Apple OAuth flow');
        // Open the URL in a browser
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        
        if (result.type === 'success') {
          console.log('Apple OAuth successful, exchanging code for session');
          // The user was redirected back to our app
          // Exchange the code for a session
          const { url } = result;
          const { data, error } = await supabase.auth.exchangeCodeForSession(url);
          
          if (error) {
            console.error('Code exchange error:', error.message);
            throw error;
          }
          
          console.log('Session obtained:', data.session ? 'Valid session' : 'No session');
          
          // Explicitly update the state to ensure immediate response
          setSession(data.session);
          setUser(data.user);
        } else {
          console.warn('Apple OAuth flow was not successful:', result.type);
        }
      }
    } catch (error: any) {
      console.error('Apple sign in error:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: makeRedirectUri({
          scheme: 'trivia-universe-feed',
          path: 'reset-password'
        }),
      });
      
      if (error) {
        throw error;
      }
      
      Alert.alert('Success', 'Check your email for the password reset link');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData: { username?: string; fullName?: string; avatarUrl?: string; country?: string }) => {
    try {
      setIsLoading(true);

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update the profile in our user_profiles table
      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: userData.username,
          full_name: userData.fullName,
          avatar_url: userData.avatarUrl,
          country: userData.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error updating profile', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Continue as guest function
  const continueAsGuest = async () => {
    try {
      setIsLoading(true);
      console.log('Setting up guest mode');
      
      // Only sign out if we're authenticated to avoid unnecessary operations
      if (user || session) {
        console.log('Clearing existing auth session before enabling guest mode');
        await signOut();
      }
      
      // Set guest mode flag in AsyncStorage - do this before state updates to ensure it's saved
      await AsyncStorage.setItem('guestMode', 'true');
      console.log('Guest mode flag saved in AsyncStorage');
      
      // Update state
      setIsGuest(true);
      setUser(null);
      setSession(null);
      
      // On iOS, ensure changes are applied sequentially with small delays
      if (Platform.OS === 'ios') {
        console.log('iOS platform: applying sequential state updates with delays');
        // Force a small delay to ensure state updates are processed
        return new Promise<void>(resolve => {
          setTimeout(() => {
            console.log('Guest mode activation complete on iOS');
            setIsLoading(false);
            resolve();
          }, 100);
        });
      }
      
      console.log('Guest mode activated successfully');
    } catch (error) {
      console.error('Error setting up guest mode:', error);
      
      // Try one more time directly
      try {
        console.log('Retrying guest mode activation directly');
        setIsGuest(true);
        await AsyncStorage.setItem('guestMode', 'true');
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
        Alert.alert('Error', 'Failed to continue as guest. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Provide the auth context to children components
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isGuest,
        isAuthenticated: !!user,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        updateProfile,
        continueAsGuest
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Create a hook for easy context consumption
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 