import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

// Define the shape of our auth context
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (userData: { username?: string; fullName?: string; avatarUrl?: string; country?: string }) => Promise<void>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state when the provider mounts
  useEffect(() => {
    // Check for an existing session
    supabase.auth.getSession().then((response: { data: { session: Session | null } }) => {
      const currentSession = response.data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
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
      console.log('Attempting to sign in with email/password', { email });
      
      // Proceed with sign in attempt
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Sign in error:', error.message, error.status);
        
        // Special handling for unconfirmed emails
        if (error.message.includes('Email not confirmed')) {
          console.log('Email not confirmed for user');
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
                    console.log('User requested to resend confirmation email');
                    const { error: resendError } = await supabase.auth.resend({
                      type: 'signup',
                      email: email,
                    });
                    
                    if (resendError) {
                      console.error('Failed to resend confirmation email:', resendError);
                      
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
                      console.log('Confirmation email resent successfully');
                      Alert.alert(
                        'Confirmation Email Sent',
                        'Please check your email and click the confirmation link to complete your registration.',
                        [{ text: 'OK' }]
                      );
                    }
                  } catch (resendError: any) {
                    console.error('Error in resend flow:', resendError.message);
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
      
      console.log('Sign in successful - Response:', {
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
      
      // Explicitly update the state to ensure immediate response
      setSession(data.session);
      setUser(data.user);
      
      // Force a delay to ensure state update is processed
      setTimeout(() => {
        console.log('Forced state check after delay:', {
          userSet: data.user?.id,
          sessionSet: data.session?.access_token ? 'Present' : 'Missing'
        });
      }, 500);
      
    } catch (error: any) {
      console.error('Sign in error:', error.message, error.status || '');
      
      let errorMessage = error.message;
      // Make error messages more user-friendly
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Incorrect email or password. Please try again.';
      }
      
      Alert.alert('Sign In Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
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

  // Provide the auth context to children components
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        updateProfile
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