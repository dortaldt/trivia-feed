import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { ThemedText } from '@/components/ThemedText';
import { FeatherIcon } from '@/components/FeatherIcon';
import { Picker } from '@react-native-picker/picker';
import { countries } from '../../data/countries';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { colors } from '../../theme';
import Button from '../../components/ui/Button';

// Add interface for countries
interface Country {
  name: string;
  code: string;
}

const ProfileView: React.FC = () => {
  const { user, signOut, updateProfile, isLoading: authLoading, isGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [country, setCountry] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const [localIsGuest, setLocalIsGuest] = useState(false);
  
  // Add debug log for current auth state
  useEffect(() => {
    console.log('ProfileView - Auth state:', { 
      user: user ? `User ID: ${user.id.substring(0, 5)}...` : 'No user', 
      isGuest, 
      authLoading 
    });
    
    // Check AsyncStorage directly for debugging
    const checkGuestMode = async () => {
      try {
        const guestMode = await AsyncStorage.getItem('guestMode');
        console.log('ProfileView - Guest mode in AsyncStorage:', guestMode);
      } catch (e) {
        console.error('Error checking guest mode in ProfileView:', e);
      }
    };
    
    checkGuestMode();
  }, [user, isGuest, authLoading]);

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      setLoadingProfile(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setProfileData(data);
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
        setCountry(data.country || '');
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsUpdating(true);
      
      await updateProfile({
        username,
        fullName,
        avatarUrl,
        country
      });
      
      setIsEditing(false);
      fetchUserProfile(); // Refresh the profile data
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = () => {
    console.log('Sign out button pressed - showing confirmation dialog');
    if (Platform.OS === 'web') {
      // On web, use direct confirmation instead of Alert.alert which might have issues with bottom sheet
      if (confirm('Are you sure you want to sign out?')) {
        console.log('User confirmed sign out - attempting to sign out');
        signOut()
          .then(success => {
            console.log('Sign out process completed, success:', success);
            // Use a small delay before reload to ensure state is updated
            setTimeout(() => {
              window.location.href = '/';
            }, 100);
          })
          .catch(error => {
            console.error('Sign out failed with error:', error);
            alert('Sign Out Failed: There was a problem signing out. Please try again or restart the app.');
          });
      } else {
        console.log('Sign out canceled by user');
      }
    } else {
      // Original implementation for native platforms
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => console.log('Sign out canceled by user') },
          { 
            text: 'Sign Out', 
            style: 'destructive', 
            onPress: async () => {
              console.log('User confirmed sign out - attempting to sign out');
              try {
                // Use the improved signOut function from AuthContext
                const success = await signOut();
                console.log('Sign out process completed, success:', success);
                
                // If signOut was not successful or we're on a native platform,
                // use more aggressive cleanup
                if (!success) {
                  console.log('Sign out reported failure or on native platform - performing force cleanup');
                  
                  // Force reset of auth state
                  await AsyncStorage.clear();
                  console.log('AsyncStorage cleared');
                  
                  // Show a message to restart the app if needed
                  Alert.alert(
                    'Sign Out Status',
                    'You have been signed out, but the app may need to be restarted to complete the process.',
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('Sign out failed with error:', error);
                Alert.alert(
                  'Sign Out Failed',
                  'There was a problem signing out. Please try again or restart the app.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    }
  };

  // Find country name by code
  const getCountryName = (code: string) => {
    if (!code) return 'Not set';
    const countryObj = countries.find((c: Country) => c.code === code);
    return countryObj ? countryObj.name : code;
  };

  // Generate initials for the avatar placeholder
  const getInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(name => name[0]).join('').toUpperCase();
    }
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    // Use a default fallback instead of email
    return 'ZT';
  };

  // Image picker function
  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web platform: Create a file input element
        console.log('Web platform detected, using file input picker');
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        const pickerPromise = new Promise<boolean>((resolve) => {
          input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) {
              resolve(false);
              return;
            }
            
            console.log('File selected on web:', { 
              name: file.name,
              type: file.type,
              size: file.size
            });
            
            try {
              await uploadAvatar(file);
              resolve(true);
            } catch (error) {
              console.error('Upload error:', error);
              resolve(false);
            } finally {
              document.body.removeChild(input);
            }
          };
        });
        
        document.body.appendChild(input);
        input.click();
        return pickerPromise;
      } else {
        // Native platforms: Use standard expo-image-picker
        console.log('Launching standard image picker');
        
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant photo library permissions to upload images');
          return;
        }
        
        // Launch the image picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7, // Reduced quality to ensure smaller file size
        });
        
        console.log('Image picker result:', {
          canceled: result.canceled,
          hasAssets: !!result.assets,
          assetsCount: result.assets?.length || 0
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedImage = result.assets[0];
          console.log('Selected image:', {
            uri: selectedImage.uri.substring(0, 50) + '...',
            width: selectedImage.width,
            height: selectedImage.height,
            fileSize: selectedImage.fileSize || 'unknown'
          });
          
          // Compress the image if needed
          try {
            // Always compress to ensure consistent size and format
            const compressedImage = await compressImage(selectedImage.uri);
            console.log('Compressed image:', {
              uri: compressedImage.uri.substring(0, 50) + '...',
              width: compressedImage.width,
              height: compressedImage.height
            });
            
            await uploadAvatar(compressedImage.uri);
          } catch (error) {
            console.error('Compression/upload error:', error);
            Alert.alert('Error', 'Could not process the image. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Compress image for native platforms
  const compressImage = async (uri: string) => {
    console.log('Compressing image...');
    
    // Use standard image manipulator to resize and compress
    return await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
  };

  // Upload avatar to Supabase Storage
  const uploadAvatar = async (uriOrFile: string | File) => {
    try {
      setUploadingImage(true);
      console.log('Starting avatar upload...');
      
      // Store the old avatar URL for deletion after successful upload
      const oldAvatarUrl = avatarUrl;
      
      // Create a unique file name
      const fileExt = typeof uriOrFile === 'string' 
        ? uriOrFile.split('.').pop()?.toLowerCase() || 'jpg'
        : (uriOrFile as File).name.split('.').pop()?.toLowerCase() || 'jpg';
      
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;
      
      console.log('Upload details:', { fileName, fileExt });
      
      let newAvatarUrl = '';
      
      // Web platform
      if (Platform.OS === 'web' && typeof uriOrFile !== 'string') {
        const file = uriOrFile as File;
        
        // Upload directly with Supabase client
        const { data, error } = await supabase
          .storage
          .from('userimages')
          .upload(filePath, file, {
            contentType: file.type || `image/${fileExt}`,
            upsert: true
          });
        
        if (error) {
          throw error;
        }
        
        // Get the public URL
        const { data: publicUrlData } = supabase
          .storage
          .from('userimages')
          .getPublicUrl(filePath);
        
        newAvatarUrl = publicUrlData.publicUrl;
      }
      
      // Native platforms - iOS and Android
      if (typeof uriOrFile === 'string') {
        // Get current session for authentication
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        
        if (!session) {
          throw new Error('No authenticated session available');
        }
        
        // Get the Supabase URL and endpoints
        const supabaseUrl = 'https://vdrmtsifivvpioonpqqc.supabase.co';
        const endpoint = `${supabaseUrl}/storage/v1/object/userimages/${filePath}`;
        
        console.log('Using FormData approach for direct upload');
        
        // For iOS/Android, use FormData which is more reliable
        const formData = new FormData();
        
        // Format depends on platform
        if (Platform.OS === 'ios') {
          // iOS typically needs this format
          const fileInfo = {
            uri: uriOrFile,
            type: `image/${fileExt}`,
            name: fileName
          };
          
          // @ts-ignore - This is the standard approach for React Native
          formData.append('file', fileInfo);
        } else {
          // Android format
          const fileInfo = {
            uri: uriOrFile,
            type: `image/${fileExt}`,
            name: fileName
          };
          
          // @ts-ignore - Type checking doesn't fully support FormData in React Native
          formData.append('file', fileInfo);
        }
        
        // Make a direct fetch request for reliability
        const uploadResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': session.access_token,
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }
        
        // Generate the public URL
        const { data: publicUrlData } = supabase
          .storage
          .from('userimages')
          .getPublicUrl(filePath);
        
        newAvatarUrl = publicUrlData.publicUrl;
        
        // Verify the image has content
        try {
          const checkResponse = await fetch(newAvatarUrl, { method: 'HEAD' });
          if (checkResponse.status !== 200 || parseInt(checkResponse.headers.get('content-length') || '0') === 0) {
            console.warn('Image may be empty or not accessible yet');
          }
        } catch (verifyError) {
          console.warn('Error verifying image:', verifyError);
        }
      }
      
      if (newAvatarUrl) {
        // Just update the avatar URL in the UI without refreshing the entire profile
        setAvatarUrl(newAvatarUrl);
        
        // Silently update the database without refreshing the profile view
        updateAvatarUrlInDatabase(newAvatarUrl);
        
        // Delete the old avatar file if it exists
        if (oldAvatarUrl) {
          deleteOldAvatar(oldAvatarUrl).catch(error => {
            console.error('Failed to delete old avatar:', error);
          });
        }
        
        // Success message without refreshing the view
        Alert.alert('Success', 'Avatar updated');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error uploading avatar', error.message);
    } finally {
      setUploadingImage(false);
    }
  };
  
  // Delete the old avatar file from storage
  const deleteOldAvatar = async (oldAvatarUrl: string) => {
    try {
      // Extract the file name from the URL
      // Example URL: https://vdrmtsifivvpioonpqqc.supabase.co/storage/v1/object/public/userimages/filename.jpg
      const urlParts = oldAvatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (!fileName) {
        throw new Error('Could not extract file name from URL');
      }
      
      console.log('Deleting old avatar file:', fileName);
      
      // Delete the file from Supabase storage
      const { error } = await supabase
        .storage
        .from('userimages')
        .remove([fileName]);
      
      if (error) {
        console.error('Error deleting old avatar:', error);
      } else {
        console.log('Old avatar deleted successfully');
      }
    } catch (error) {
      console.error('Error in deleteOldAvatar:', error);
      // Don't throw so this doesn't disrupt the main flow
    }
  };
  
  // Silently update just the avatar URL in the database without refreshing the profile
  const updateAvatarUrlInDatabase = async (newAvatarUrl: string) => {
    try {
      console.log('Silently updating avatar URL in database');
      
      // Only update the avatar_url field directly using supabase client
      // This avoids triggering any navigation or screen refreshes
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user?.id);
      
      if (error) {
        console.error('Error updating avatar URL in database:', error);
      } else {
        console.log('Avatar URL updated successfully in database');
        
        // Update profileData state without triggering full refresh
        if (profileData) {
          // Create a new object to maintain immutability but only update the avatar_url
          setProfileData({
            ...profileData,
            avatar_url: newAvatarUrl
          });
        }
      }
    } catch (error) {
      console.error('Silent update error:', error);
    }
  };

  // Remove avatar from Supabase Storage
  const removeAvatar = async () => {
    try {
      if (!avatarUrl) return;
      
      setUploadingImage(true);
      
      // Extract file name from URL
      const fileName = avatarUrl.split('/').pop();
      
      if (fileName) {
        // Delete from Supabase Storage
        const { error } = await supabase
          .storage
          .from('userimages')
          .remove([fileName]);
        
        if (error) {
          throw error;
        }
      }
      
      // Update state and profile
      setAvatarUrl('');
      
      Alert.alert('Success', 'Avatar removed successfully');
    } catch (error: any) {
      console.error('Error removing avatar:', error.message);
      Alert.alert('Error', 'Failed to remove avatar. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const profileStyles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
    scrollView: {
      flex: 1,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
    },
    userInfoSection: {
      alignItems: 'center',
      marginBottom: 20,
    },
    avatarContainer: {
      marginBottom: 10,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: 'white',
      fontSize: 36,
      fontWeight: 'bold',
    },
    emailText: {
      fontSize: 16,
      marginBottom: 20,
      opacity: 0.7,
    },
    detailsSection: {
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    },
    detailLabel: {
      fontSize: 16,
      opacity: 0.7,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    editButton: {
      backgroundColor: '#0a7ea4',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignSelf: 'center',
      marginTop: 20,
    },
    editButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    formContainer: {
      marginTop: 10,
    },
    inputContainer: {
      marginBottom: 15,
    },
    inputLabel: {
      fontSize: 14,
      marginBottom: 6,
      opacity: 0.7,
    },
    input: {
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 8,
      fontSize: 16,
      borderWidth: 1,
      borderColor: 'rgba(150, 150, 150, 0.2)',
      color: isDark ? 'white' : 'black',
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    },
    countryPickerButton: {
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(150, 150, 150, 0.2)',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    },
    countryPickerButtonText: {
      fontSize: 16,
      color: isDark ? 'white' : 'black',
    },
    accountSection: {
      marginTop: 20,
    },
    accountSectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    signOutButton: {
      backgroundColor: '#ff3b30',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    signOutButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    modalContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      zIndex: 1000,
    },
    pickerModalContent: {
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    pickerTitle: {
      fontSize: 18,
      color: 'white',
      fontWeight: '600',
    },
    pickerCancel: {
      color: '#ff5c5c',
      fontSize: 16,
    },
    pickerDone: {
      color: '#007aff',
      fontSize: 16,
    },
    pickerIOS: {
      height: 215,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 5,
    },
    cancelButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    cancelButtonText: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 16,
    },
    saveButton: {
      backgroundColor: '#ffc107',
    },
    saveButtonText: {
      color: 'black',
      fontSize: 16,
      fontWeight: '600',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarTipContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      padding: 10,
      backgroundColor: 'rgba(10, 126, 164, 0.1)',
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#0a7ea4',
    },
    avatarTip: {
      marginLeft: 10,
      fontSize: 14,
      color: '#0a7ea4',
      flex: 1,
    },
    avatarButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    avatarButton: {
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
      marginHorizontal: 5,
      flexDirection: 'row',
    },
    uploadButton: {
      backgroundColor: '#0a7ea4',
    },
    removeButton: {
      backgroundColor: '#e74c3c',
    },
    avatarButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 8,
    },
    addPhotoHint: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      backgroundColor: 'rgba(10, 126, 164, 0.1)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    addPhotoText: {
      color: '#0a7ea4',
      fontSize: 14,
      marginLeft: 6,
    },
    editAvatarButton: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: '#0a7ea4',
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#fff',
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    guestModeContainer: {
      alignItems: 'center',
      padding: 20,
      borderRadius: 12,
      width: '100%',
      maxWidth: 500,
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      borderColor: 'rgba(150, 150, 150, 0.2)',
    },
    guestModeTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#ffc107',
    },
    guestModeMessage: {
      fontSize: 16,
      marginBottom: 20,
      textAlign: 'center',
    },
    guestModeBenefits: {
      alignSelf: 'stretch',
      marginBottom: 20,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    benefitText: {
      fontSize: 16,
    },
  });

  if (isGuest || localIsGuest) {
    return (
      <View style={[profileStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={profileStyles.guestModeContainer}>
          <Image 
            source={require('../../../assets/images/guest-avatar.png')}
            style={{ width: 80, height: 80, marginBottom: 16, borderRadius: 40 }}
            resizeMode="cover"
          />
          
          <ThemedText style={profileStyles.guestModeTitle}>
            You're in Guest Mode
          </ThemedText>
          
          <ThemedText style={profileStyles.guestModeMessage}>
            Sign in or create an account to:
          </ThemedText>
          
          <View style={profileStyles.guestModeBenefits}>
            <View style={profileStyles.benefitRow}>
              <FeatherIcon name="check-circle" size={18} color="#4caf50" style={{ marginRight: 8 }} />
              <ThemedText style={profileStyles.benefitText}>Save your game progress</ThemedText>
            </View>
            <View style={profileStyles.benefitRow}>
              <FeatherIcon name="check-circle" size={18} color="#4caf50" style={{ marginRight: 8 }} />
              <ThemedText style={profileStyles.benefitText}>Join the leaderboard</ThemedText>
            </View>
            <View style={profileStyles.benefitRow}>
              <FeatherIcon name="check-circle" size={18} color="#4caf50" style={{ marginRight: 8 }} />
              <ThemedText style={profileStyles.benefitText}>Personalize your profile</ThemedText>
            </View>
          </View>
          
          <Button
            variant="accent"
            fullWidth
            leftIcon={<FeatherIcon name="log-in" size={18} color="#000" style={{ marginRight: 8 }} />}
            onPress={() => {
              // Navigate to login screen
              if (Platform.OS === 'web') {
                window.location.href = '/auth/login?direct=true';
              } else {
                // Use Expo Router for iOS/Android navigation
                router.push({
                  pathname: '/auth/login',
                  params: { direct: 'true' }
                });
              }
            }}
          >
            Sign In
          </Button>
        </View>
      </View>
    );
  }

  if (!user) {
    // Check AsyncStorage directly to decide whether to show guest UI
    const [localIsGuest, setLocalIsGuest] = useState(false);
    
    useEffect(() => {
      const checkGuestMode = async () => {
        try {
          const guestMode = await AsyncStorage.getItem('guestMode');
          console.log('ProfileView fallback - Direct AsyncStorage check for guest mode:', guestMode);
          setLocalIsGuest(guestMode === 'true');
        } catch (e) {
          console.error('Error in local guest mode check in ProfileView:', e);
        }
      };
      
      checkGuestMode();
    }, []);
    
    // If guest mode is detected in AsyncStorage, show guest UI even if context isGuest is false
    if (localIsGuest) {
      return (
        <View style={[profileStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={profileStyles.guestModeContainer}>
            <Image 
              source={require('../../../assets/images/guest-avatar.png')}
              style={{ width: 80, height: 80, marginBottom: 16, borderRadius: 40 }}
              resizeMode="cover"
            />
            
            <ThemedText style={profileStyles.guestModeTitle}>
              You're in Guest Mode
            </ThemedText>
            
            <ThemedText style={profileStyles.guestModeMessage}>
              Sign in or create an account to:
            </ThemedText>
            
            <View style={profileStyles.guestModeBenefits}>
              <View style={profileStyles.benefitRow}>
                <FeatherIcon name="check-circle" size={18} color="#4caf50" style={{ marginRight: 8 }} />
                <ThemedText style={profileStyles.benefitText}>Save your game progress</ThemedText>
              </View>
              <View style={profileStyles.benefitRow}>
                <FeatherIcon name="check-circle" size={18} color="#4caf50" style={{ marginRight: 8 }} />
                <ThemedText style={profileStyles.benefitText}>Join the leaderboard</ThemedText>
              </View>
              <View style={profileStyles.benefitRow}>
                <FeatherIcon name="check-circle" size={18} color="#4caf50" style={{ marginRight: 8 }} />
                <ThemedText style={profileStyles.benefitText}>Personalize your profile</ThemedText>
              </View>
            </View>
            
            <Button
              variant="accent"
              fullWidth
              leftIcon={<FeatherIcon name="log-in" size={18} color="#000" style={{ marginRight: 8 }} />}
              onPress={() => {
                // Navigate to login screen
                if (Platform.OS === 'web') {
                  window.location.href = '/auth/login?direct=true';
                } else {
                  // Use Expo Router for iOS/Android navigation
                  router.push({
                    pathname: '/auth/login',
                    params: { direct: 'true' }
                  });
                }
              }}
            >
              Sign In
            </Button>
          </View>
        </View>
      );
    }
    
    // Normal case for non-guest users who are not logged in
    return (
      <View style={profileStyles.emptyState}>
        <ThemedText style={profileStyles.emptyText}>
          You need to sign in to view your profile
        </ThemedText>
      </View>
    );
  }

  if (authLoading || loadingProfile) {
    return (
      <View style={[profileStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ffc107" />
      </View>
    );
  }

  return (
    <View style={profileStyles.container}>
      {/* User avatar and email */}
      <View style={profileStyles.userInfoSection}>
        <View style={profileStyles.avatarContainer}>
          {uploadingImage ? (
            <View style={profileStyles.avatarPlaceholder}>
              <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
          ) : avatarUrl ? (
            <View>
              <Image 
                source={{ uri: avatarUrl }} 
                style={profileStyles.avatarImage} 
                resizeMode="cover"
                onLoad={() => console.log('Image loaded successfully')}
                onError={(e) => console.error('Image loading error:', e.nativeEvent)}
              />
              {!isEditing && (
                <TouchableOpacity 
                  style={profileStyles.editAvatarButton}
                  onPress={() => setIsEditing(true)}
                >
                  <FeatherIcon name="camera" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              <View style={profileStyles.avatarPlaceholder}>
                <ThemedText style={profileStyles.avatarText}>{getInitials()}</ThemedText>
              </View>
              {!isEditing && (
                <TouchableOpacity 
                  style={profileStyles.editAvatarButton}
                  onPress={() => setIsEditing(true)}
                >
                  <FeatherIcon name="camera" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {!isEditing && !avatarUrl && (
          <TouchableOpacity 
            onPress={() => setIsEditing(true)}
            style={profileStyles.addPhotoHint}
          >
            <FeatherIcon name="camera" size={14} color="#0a7ea4" />
            <ThemedText style={profileStyles.addPhotoText}>Add a profile photo</ThemedText>
          </TouchableOpacity>
        )}
        
        <ThemedText style={profileStyles.emailText}>{user?.email}</ThemedText>
      </View>

      {!isEditing ? (
        <View>
          {/* User details section */}
          <View style={profileStyles.detailsSection}>
            <View style={profileStyles.detailRow}>
              <ThemedText style={profileStyles.detailLabel}>Username</ThemedText>
              <ThemedText style={profileStyles.detailValue}>{username || 'Not set'}</ThemedText>
            </View>
            
            <View style={profileStyles.detailRow}>
              <ThemedText style={profileStyles.detailLabel}>Full Name</ThemedText>
              <ThemedText style={profileStyles.detailValue}>{fullName || 'Not set'}</ThemedText>
            </View>
            
            <View style={profileStyles.detailRow}>
              <ThemedText style={profileStyles.detailLabel}>Country</ThemedText>
              <ThemedText style={profileStyles.detailValue}>{getCountryName(country)}</ThemedText>
            </View>
          </View>

          {/* Edit Profile button */}
          <Button 
            variant="accent"
            size="md"
            fullWidth
            leftIcon={<FeatherIcon name="edit-2" size={18} color="#000" style={{ marginRight: 8 }} />}
            onPress={() => setIsEditing(true)}
            style={{ marginTop: 20 }}
          >
            Edit Profile
          </Button>

          {/* Account section */}
          <View style={profileStyles.accountSection}>
            <ThemedText style={profileStyles.accountSectionTitle}>Account</ThemedText>
            
            {/* Sign Out button - Using proper Button component for web and native */}
            <Button 
              variant="destructive"
              size="md"
              fullWidth
              leftIcon={<FeatherIcon name="log-out" size={18} color="#fff" style={{ marginRight: 8 }} />}
              onPress={handleSignOut}
              accessibilityLabel="Sign out from your account"
              accessibilityHint="Double-tap to sign out from your account"
            >
              Sign Out
            </Button>
          </View>
        </View>
      ) : (
        <View style={profileStyles.formContainer}>
          {/* Edit form */}
          <View style={profileStyles.inputContainer}>
            <ThemedText style={profileStyles.inputLabel}>Username</ThemedText>
            <TextInput
              style={profileStyles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'}
            />
          </View>
          
          <View style={profileStyles.inputContainer}>
            <ThemedText style={profileStyles.inputLabel}>Full Name</ThemedText>
            <TextInput
              style={profileStyles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter full name"
              placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'}
            />
          </View>
          
          <View style={profileStyles.inputContainer}>
            <ThemedText style={profileStyles.inputLabel}>Profile Picture</ThemedText>
            <View style={profileStyles.avatarTipContainer}>
              <FeatherIcon name="info" size={16} color="#0a7ea4" />
              <ThemedText style={profileStyles.avatarTip}>
                Upload a profile picture to personalize your account
              </ThemedText>
            </View>
            <View style={profileStyles.avatarButtonsContainer}>
              <Button
                variant="accent"
                size="sm"
                style={{ flex: 1, marginRight: avatarUrl ? 5 : 0 }}
                leftIcon={<FeatherIcon name="upload" size={16} color="#000" />}
                onPress={pickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
              </Button>
              
              {avatarUrl ? (
                <Button
                  variant="destructive"
                  size="sm"
                  style={{ flex: 1, marginLeft: 5 }}
                  leftIcon={<FeatherIcon name="trash-2" size={16} color="#fff" />}
                  onPress={removeAvatar}
                  disabled={uploadingImage}
                >
                  Remove
                </Button>
              ) : null}
            </View>
          </View>
          
          <View style={profileStyles.inputContainer}>
            <ThemedText style={profileStyles.inputLabel}>Country</ThemedText>
            {Platform.OS === 'ios' ? (
              <TouchableOpacity
                style={profileStyles.countryPickerButton}
                onPress={() => setShowCountryPicker(true)}
              >
                <ThemedText style={profileStyles.countryPickerButtonText}>
                  {getCountryName(country)}
                </ThemedText>
                <FeatherIcon name="chevron-down" size={20} color={isDark ? 'white' : 'black'} />
              </TouchableOpacity>
            ) : (
              <View style={[
                profileStyles.input, 
                { padding: 0, paddingHorizontal: 8 }
              ]}>
                <Picker
                  selectedValue={country}
                  onValueChange={(itemValue) => setCountry(itemValue as string)}
                  style={{ color: isDark ? 'white' : 'black' }}
                  dropdownIconColor={isDark ? 'white' : 'black'}
                >
                  <Picker.Item label="Select country" value="" />
                  {countries.map((c) => (
                    <Picker.Item key={c.code} label={c.name} value={c.code} />
                  ))}
                </Picker>
              </View>
            )}
          </View>
          
          <View style={profileStyles.buttonRow}>
            <Button 
              variant="ghost"
              size="md"
              style={{ flex: 1, marginRight: 5 }}
              onPress={() => {
                setIsEditing(false);
                // Reset to original values
                if (profileData) {
                  setUsername(profileData.username || '');
                  setFullName(profileData.full_name || '');
                  setAvatarUrl(profileData.avatar_url || '');
                  setCountry(profileData.country || '');
                }
              }}
            >
              Cancel
            </Button>
            
            <Button 
              variant="accent"
              size="md"
              style={{ flex: 1, marginLeft: 5 }}
              onPress={handleUpdateProfile}
            >
              Save Changes
            </Button>
          </View>
        </View>
      )}
      
      {/* Country Picker Modal for iOS */}
      {Platform.OS === 'ios' && showCountryPicker && (
        <View style={[
          profileStyles.modalContainer,
          { zIndex: 9999 } // Ensure picker appears above bottom sheet
        ]}>
          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={1} 
            onPress={() => setShowCountryPicker(false)}
          >
            <View style={[
              profileStyles.pickerModalContent, 
              { 
                backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                maxHeight: 300 // Constrain height to fit within bottom sheet
              }
            ]}>
              <View style={profileStyles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <ThemedText style={profileStyles.pickerCancel}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={profileStyles.pickerTitle}>Select Country</ThemedText>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <ThemedText style={profileStyles.pickerDone}>Done</ThemedText>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={country}
                onValueChange={(itemValue) => setCountry(itemValue as string)}
                itemStyle={{ 
                  color: isDark ? 'white' : 'black',
                  height: 44
                }}
                style={[
                  profileStyles.pickerIOS,
                  { height: 180 } // Reduced height for picker
                ]}
              >
                <Picker.Item label="Select country" value="" />
                {countries.map((c) => (
                  <Picker.Item key={c.code} label={c.name} value={c.code} />
                ))}
              </Picker>
            </View>
          </TouchableOpacity>
        </View>
      )}
      
      {isUpdating && (
        <View style={profileStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={isDark ? 'white' : '#0a7ea4'} />
        </View>
      )}
    </View>
  );
};

export default ProfileView; 