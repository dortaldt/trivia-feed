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

// Add interface for countries
interface Country {
  name: string;
  code: string;
}

const ProfileView: React.FC = () => {
  const { user, signOut, updateProfile, isLoading: authLoading } = useAuth();
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
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
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
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return '?';
  };

  // Image picker function
  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web platform: Create a file input element
        console.log('Web platform detected, using file input picker');
        
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.style.display = 'none';
          
          input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) {
              resolve(false);
              return;
            }
            
            console.log('File selected on web:', { 
              name: file.name,
              type: file.type,
              size: file.size
            });
            
            // Check file size
            if (file.size > 2 * 1024 * 1024) {
              Alert.alert(
                'Image too large', 
                'Please select an image smaller than 2MB.',
                [{ text: 'OK' }]
              );
              resolve(false);
              return;
            }
            
            // For web, pass the file directly
            await uploadAvatar(file);
            resolve(true);
            
            // Remove the input from the DOM
            document.body.removeChild(input);
          };
          
          // Append the input to the body and trigger a click
          document.body.appendChild(input);
          input.click();
        });
      } else {
        // Native platforms: Use expo-image-picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6, // Reduce quality to ensure smaller file size
          allowsMultipleSelection: false,
          exif: false, // Don't include EXIF data to reduce file size
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedImage = result.assets[0];
          console.log('Selected image:', { 
            uri: selectedImage.uri,
            width: selectedImage.width,
            height: selectedImage.height,
            fileSize: selectedImage.fileSize,
            type: selectedImage.type
          });
          
          // Check file size before upload (2MB limit)
          if (selectedImage.fileSize && selectedImage.fileSize > 2 * 1024 * 1024) {
            Alert.alert(
              'Image too large', 
              'Please select an image smaller than 2MB.',
              [{ text: 'OK' }]
            );
            return;
          }
          
          await uploadAvatar(selectedImage.uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  // Upload avatar to Supabase Storage
  const uploadAvatar = async (uriOrFile: string | File, retryCount = 0) => {
    try {
      setUploadingImage(true);
      console.log('Starting avatar upload:', 
        typeof uriOrFile === 'string' ? 'from URI' : 'from File object', 
        'Retry count:', retryCount
      );
      
      // Create a unique file name
      const fileExt = typeof uriOrFile === 'string' 
        ? uriOrFile.split('.').pop()?.toLowerCase() || 'jpg'
        : (uriOrFile as File).name.split('.').pop()?.toLowerCase() || 'jpg';
      
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;
      
      console.log('Preparing to upload file:', { fileName, fileExt, filePath });
      console.log('User ID:', user?.id, 'Auth status:', !!user);
      
      // Log Supabase session status
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Session check before upload:', {
          hasSession: !!sessionData?.session,
          sessionError: sessionError?.message || 'none',
          expiresAt: sessionData?.session?.expires_at ? new Date(sessionData.session.expires_at*1000).toISOString() : 'unknown'
        });
      } catch (sessionCheckError) {
        console.error('Error checking session:', sessionCheckError);
      }
      
      // For native platforms
      if (Platform.OS !== 'web' && typeof uriOrFile === 'string') {
        // Fetch the image data as blob
        try {
          console.log('Fetching image data as blob');
          const response = await fetch(uriOrFile);
          
          console.log('Image fetch response status:', response.status, response.statusText);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          console.log('Blob created successfully:', { 
            size: blob.size, 
            type: blob.type || `image/${fileExt}`,
            emptyBlob: blob.size === 0 ? 'YES-ERROR' : 'no'
          });
          
          // Try direct fetch upload if supabase client has issues
          try {
            // Upload to Supabase Storage
            console.log('Uploading to Supabase storage bucket: userimages');
            console.log('Supabase instance check:', {
              hasClient: !!supabase,
              hasStorage: !!supabase?.storage,
              hasFrom: !!supabase?.storage?.from
            });
            
            const { data, error } = await supabase
              .storage
              .from('userimages')
              .upload(filePath, blob, {
                contentType: blob.type || `image/${fileExt}`,
                upsert: true,
                cacheControl: '3600'
              });
            
            if (error) {
              console.error('Supabase storage upload error:', error);
              console.error('Error details:', {
                message: error.message,
                statusCode: error.statusCode,
                errorType: error.name,
                details: error.details
              });
              
              // Try alternative direct upload method if the supabase client fails
              throw error;
            }
            
            console.log('Upload successful, data:', data);
          } catch (uploadError: any) {
            console.log('Trying alternative upload method via fetch API');
            console.log('Upload error details:', {
              message: uploadError.message,
              name: uploadError.name,
              stack: uploadError.stack?.substring(0, 200) // First 200 chars of stack trace
            });
            
            // Get the current session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            console.log('Session check for direct upload:', {
              hasSession: !!sessionData?.session,
              sessionError: sessionError?.message || 'none',
              tokenLength: sessionData?.session?.access_token?.length || 0
            });
            
            const session = sessionData?.session;
            
            if (!session) {
              throw new Error('No authenticated session available');
            }
            
            // If the Supabase client upload fails, try a direct fetch request
            const supabaseUrl = 'https://vdrmtsifivvpioonpqqc.supabase.co';
            const endpoint = `${supabaseUrl}/storage/v1/object/userimages/${filePath}`;
            
            console.log('Making direct API request to:', endpoint);
            console.log('Request details:', {
              method: 'POST',
              contentType: blob.type || `image/${fileExt}`,
              blobSize: blob.size,
              headers: {
                'Authorization': 'Bearer [REDACTED]',
                'apikey': '[REDACTED]',
                'x-upsert': 'true'
              }
            });
            
            try {
              const uploadResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': session.access_token,
                  'Content-Type': blob.type || `image/${fileExt}`,
                  'x-upsert': 'true'
                },
                body: blob
              });
              
              console.log('Direct fetch response:', {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                ok: uploadResponse.ok,
                headers: Object.fromEntries([...uploadResponse.headers.entries()].map(([key, value]) => [key, value]))
              });
              
              if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('Direct upload failed with status:', uploadResponse.status);
                console.error('Response:', errorText);
                throw new Error(`Direct upload failed: ${uploadResponse.status} - ${errorText}`);
              }
              
              console.log('Direct fetch upload successful');
            } catch (fetchError: any) {
              console.error('Fetch API error during direct upload:', fetchError);
              console.error('Network details:', {
                online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
                error: fetchError.message,
                name: fetchError.name
              });
              throw fetchError;
            }
          }
          
          // Get the public URL
          const { data: publicUrlData } = supabase
            .storage
            .from('userimages')
            .getPublicUrl(filePath);
          
          const newAvatarUrl = publicUrlData.publicUrl;
          console.log('Public URL generated:', newAvatarUrl);
          
          // Update state and profile
          setAvatarUrl(newAvatarUrl);
          
          // Test if the image is accessible by fetching it
          try {
            console.log('Verifying image URL accessibility');
            const testFetch = await fetch(newAvatarUrl, { method: 'HEAD' });
            console.log('Image accessibility check:', {
              status: testFetch.status,
              statusText: testFetch.statusText,
              ok: testFetch.ok,
              contentType: testFetch.headers.get('content-type'),
              contentLength: testFetch.headers.get('content-length')
            });
            
            if (!testFetch.ok) {
              console.warn('Image URL may not be accessible:', testFetch.status);
            } else {
              console.log('Image URL verified as accessible');
            }
          } catch (testError: any) {
            console.warn('Could not verify image URL access:', testError);
            console.warn('Verification error details:', {
              message: testError.message,
              name: testError.name,
              url: newAvatarUrl
            });
          }
          
          Alert.alert('Success', 'Avatar uploaded successfully');
        } catch (fetchError: any) {
          console.error('Error processing image:', fetchError);
          console.error('Fetch error details:', {
            message: fetchError.message,
            name: fetchError.name,
            type: typeof fetchError,
            code: fetchError.code,
            stack: fetchError.stack?.substring(0, 200) // First 200 chars of stack trace
          });
          throw new Error(`Error processing image: ${fetchError.message}`);
        }
      } else {
        // Web platform
        console.log('Web platform upload handling...');
        
        try {
          // Get the file object (directly passed for web)
          const file = uriOrFile as File;
          
          // Upload to Supabase using the file object directly
          console.log('Uploading web file to Supabase storage:', {
            name: file.name,
            size: file.size,
            type: file.type
          });
          
          // Upload the file to Supabase
          const { data, error } = await supabase
            .storage
            .from('userimages')
            .upload(filePath, file, {
              contentType: file.type || `image/${fileExt}`,
              upsert: true,
              cacheControl: '3600'
            });
          
          if (error) {
            console.error('Supabase storage web upload error:', error);
            throw error;
          }
          
          console.log('Web upload successful, data:', data);
          
          // Get the public URL
          const { data: publicUrlData } = supabase
            .storage
            .from('userimages')
            .getPublicUrl(filePath);
          
          const newAvatarUrl = publicUrlData.publicUrl;
          console.log('Web upload - Public URL generated:', newAvatarUrl);
          
          // Update state and profile
          setAvatarUrl(newAvatarUrl);
          
          // Test the URL accessibility
          try {
            const testFetch = await fetch(newAvatarUrl, { method: 'HEAD' });
            if (!testFetch.ok) {
              console.warn('Web upload - Image URL may not be accessible:', testFetch.status);
            } else {
              console.log('Web upload - Image URL verified as accessible');
            }
          } catch (testError) {
            console.warn('Web upload - Could not verify image URL access:', testError);
          }
          
          Alert.alert('Success', 'Avatar uploaded successfully');
        } catch (webError: any) {
          console.error('Web upload error:', webError);
          console.error('Web error details:', {
            message: webError.message || 'Unknown error',
            name: webError.name,
            stack: webError.stack?.substring(0, 200)
          });
          
          // Try alternative direct upload method if needed
          try {
            console.log('Trying alternative web upload method');
            
            // Get current session
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData?.session;
            
            if (!session) {
              throw new Error('No authenticated session available for web upload');
            }
            
            const file = uriOrFile as File;
            const formData = new FormData();
            formData.append('file', file);
            
            // Direct fetch upload
            const supabaseUrl = 'https://vdrmtsifivvpioonpqqc.supabase.co';
            const endpoint = `${supabaseUrl}/storage/v1/object/userimages/${filePath}`;
            
            const uploadResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': session.access_token,
                // Note: Do not set Content-Type header with FormData
              },
              body: file  // Send file directly
            });
            
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error('Alternative web upload failed:', uploadResponse.status);
              console.error('Response:', errorText);
              throw new Error(`Alternative web upload failed: ${uploadResponse.status}`);
            }
            
            console.log('Alternative web upload successful');
            
            // Get the public URL
            const { data: publicUrlData } = supabase
              .storage
              .from('userimages')
              .getPublicUrl(filePath);
            
            const newAvatarUrl = publicUrlData.publicUrl;
            console.log('Alternative web upload - URL generated:', newAvatarUrl);
            
            // Update state and profile
            setAvatarUrl(newAvatarUrl);
            
            Alert.alert('Success', 'Avatar uploaded successfully');
          } catch (altWebError: any) {
            console.error('Alternative web upload failed:', altWebError);
            throw altWebError;
          }
        }
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error.message, error);
      console.error('Full error object:', {
        message: error.message,
        name: error.name, 
        code: error.code,
        cause: error.cause?.message,
        stack: error.stack?.substring(0, 200) // First 200 chars of stack trace
      });
      
      // Retry logic - try up to 2 times with a small delay
      if (retryCount < 2) {
        console.log(`Retrying upload (attempt ${retryCount + 1})...`);
        
        // Show retry message
        Alert.alert(
          'Upload Failed',
          'Retrying upload automatically...',
          [{ text: 'OK' }]
        );
        
        // Wait a bit before retrying
        setTimeout(() => {
          uploadAvatar(uriOrFile, retryCount + 1);
        }, 1000);
        return;
      }
      
      Alert.alert('Error uploading avatar', 
        `Failed to upload image after ${retryCount + 1} attempts. ${error.message || 'Please check your connection and try again.'}`,
        [{ text: 'OK' }]
      );
    } finally {
      if (retryCount === 0) {
        setUploadingImage(false);
      }
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
  });

  if (!user) {
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
          <TouchableOpacity 
            style={profileStyles.editButton} 
            onPress={() => setIsEditing(true)}
          >
            <ThemedText style={profileStyles.editButtonText}>Edit Profile</ThemedText>
          </TouchableOpacity>

          {/* Account section */}
          <View style={profileStyles.accountSection}>
            <ThemedText style={profileStyles.accountSectionTitle}>Account</ThemedText>
            <TouchableOpacity 
              style={profileStyles.signOutButton}
              onPress={handleSignOut}
            >
              <ThemedText style={profileStyles.signOutButtonText}>Sign Out</ThemedText>
            </TouchableOpacity>
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
              <TouchableOpacity
                style={[profileStyles.avatarButton, profileStyles.uploadButton]}
                onPress={pickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <FeatherIcon name="upload" size={16} color="#fff" />
                    <ThemedText style={profileStyles.avatarButtonText}>
                      Upload Image
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
              
              {avatarUrl ? (
                <TouchableOpacity
                  style={[profileStyles.avatarButton, profileStyles.removeButton]}
                  onPress={removeAvatar}
                  disabled={uploadingImage}
                >
                  <FeatherIcon name="trash-2" size={16} color="#fff" />
                  <ThemedText style={profileStyles.avatarButtonText}>Remove</ThemedText>
                </TouchableOpacity>
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
            <TouchableOpacity 
              style={[profileStyles.actionButton, profileStyles.cancelButton]}
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
              <ThemedText style={profileStyles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[profileStyles.actionButton, profileStyles.saveButton]}
              onPress={handleUpdateProfile}
            >
              <ThemedText style={profileStyles.saveButtonText}>Save</ThemedText>
            </TouchableOpacity>
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