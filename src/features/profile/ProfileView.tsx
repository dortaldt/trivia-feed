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
    }
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
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={profileStyles.avatarPlaceholder} />
          ) : (
            <View style={profileStyles.avatarPlaceholder}>
              <ThemedText style={profileStyles.avatarText}>{getInitials()}</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={profileStyles.emailText}>{user.email}</ThemedText>
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
            <ThemedText style={profileStyles.inputLabel}>Avatar URL</ThemedText>
            <TextInput
              style={profileStyles.input}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="Enter image URL"
              placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'}
            />
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
          <ActivityIndicator size="large" color="#ffc107" />
        </View>
      )}
    </View>
  );
};

export default ProfileView; 