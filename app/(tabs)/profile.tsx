import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabaseClient';
import { Picker } from '@react-native-picker/picker';
import { countries } from '../../src/data/countries';
import Leaderboard from '../../src/components/Leaderboard';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { FeatherIcon } from '@/components/FeatherIcon';

export default function ProfileScreen() {
  const { user, signOut, updateProfile, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [country, setCountry] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'leaderboard'>('profile');
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

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

  const handleSignOut = async () => {
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
    const countryObj = countries.find(c => c.code === code);
    return countryObj ? countryObj.name : code;
  };

  if (isLoading || loadingProfile) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
      </ThemedView>
    );
  }

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

  return (
    <ThemedView style={styles.outerContainer}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeSection === 'profile' && styles.activeTabButton]} 
          onPress={() => setActiveSection('profile')}
        >
          <FeatherIcon 
            name="user" 
            size={20} 
            color={activeSection === 'profile' ? Colors[colorScheme].tint : Colors[colorScheme].tabIconDefault} 
          />
          <ThemedText style={[styles.tabText, activeSection === 'profile' && styles.activeTabText]}>
            Profile
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeSection === 'leaderboard' && styles.activeTabButton]} 
          onPress={() => setActiveSection('leaderboard')}
        >
          <FeatherIcon 
            name="award" 
            size={20} 
            color={activeSection === 'leaderboard' ? Colors[colorScheme].tint : Colors[colorScheme].tabIconDefault} 
          />
          <ThemedText style={[styles.tabText, activeSection === 'leaderboard' && styles.activeTabText]}>
            Leaderboard
          </ThemedText>
        </TouchableOpacity>
      </View>

      {activeSection === 'profile' ? (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={[styles.innerContainer, isTablet && styles.tabletContainer]}>
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.headerTitle}>Profile</ThemedText>
              <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                <FeatherIcon name="log-out" size={24} color={Colors[colorScheme].text} />
              </TouchableOpacity>
            </View>
            
            <ThemedView style={styles.profileContainer}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <ThemedText style={styles.avatarText}>{getInitials()}</ThemedText>
                  </View>
                )}
                
                {isEditing && (
                  <TouchableOpacity style={styles.editAvatarButton}>
                    <FeatherIcon name="camera" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
              
              <ThemedText style={styles.emailText}>{user?.email}</ThemedText>
              
              {!isEditing ? (
                <View style={styles.profileInfoContainer}>
                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Username</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.infoValue}>{username || 'Not set'}</ThemedText>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Full Name</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.infoValue}>{fullName || 'Not set'}</ThemedText>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <ThemedText style={styles.infoLabel}>Country</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.infoValue}>{getCountryName(country)}</ThemedText>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.editFormContainer}>
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Username</ThemedText>
                    <TextInput
                      style={[styles.input, {color: Colors[colorScheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Enter username"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
                    <TextInput
                      style={[styles.input, {color: Colors[colorScheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter full name"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Country</ThemedText>
                    {Platform.OS === 'ios' ? (
                      <TouchableOpacity
                        style={[styles.countryPickerButton, {backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]}
                        onPress={() => setShowCountryPicker(true)}
                      >
                        <ThemedText style={styles.countryPickerButtonText}>
                          {country ? getCountryName(country) : 'Select a country'}
                        </ThemedText>
                        <FeatherIcon name="chevron-down" size={20} color={Colors[colorScheme].tabIconDefault} />
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.pickerContainer, {backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]}>
                        <Picker
                          selectedValue={country}
                          onValueChange={(itemValue) => setCountry(itemValue)}
                          style={[styles.picker, {color: Colors[colorScheme].text}]}
                          dropdownIconColor={Colors[colorScheme].tabIconDefault}
                        >
                          <Picker.Item label="Select a country" value="" />
                          {countries.map((countryItem) => (
                            <Picker.Item
                              key={countryItem.code}
                              label={countryItem.name}
                              value={countryItem.code}
                              color={isDark ? '#fff' : '#000'}
                            />
                          ))}
                        </Picker>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Avatar URL</ThemedText>
                    <TextInput
                      style={[styles.input, {color: Colors[colorScheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]}
                      value={avatarUrl}
                      onChangeText={setAvatarUrl}
                      placeholder="Enter avatar URL"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
                    />
                  </View>
                  
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.cancelButton, {backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)'}]}
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
                      <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.saveButton]}
                      onPress={handleUpdateProfile}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ThemedView>
            
            <ThemedView style={styles.sectionContainer}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Account</ThemedText>
              
              <TouchableOpacity style={styles.menuItem}>
                <FeatherIcon name="shield" size={24} color={Colors[colorScheme].text} style={styles.menuIcon} />
                <ThemedText style={styles.menuText}>Privacy & Security</ThemedText>
                <FeatherIcon name="chevron-right" size={20} color={Colors[colorScheme].tabIconDefault} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem}>
                <FeatherIcon name="bell" size={24} color={Colors[colorScheme].text} style={styles.menuIcon} />
                <ThemedText style={styles.menuText}>Notification Settings</ThemedText>
                <FeatherIcon name="chevron-right" size={20} color={Colors[colorScheme].tabIconDefault} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem}>
                <FeatherIcon name="key" size={24} color={Colors[colorScheme].text} style={styles.menuIcon} />
                <ThemedText style={styles.menuText}>Change Password</ThemedText>
                <FeatherIcon name="chevron-right" size={20} color={Colors[colorScheme].tabIconDefault} />
              </TouchableOpacity>
            </ThemedView>
          </View>
        </ScrollView>
      ) : (
        <Leaderboard limit={20} />
      )}
      
      {/* Country Picker Modal for iOS */}
      {Platform.OS === 'ios' && showCountryPicker && (
        <View style={styles.modalContainer}>
          <View style={[styles.pickerModalContent, {backgroundColor: isDark ? Colors.dark.background : Colors.light.background}]}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <ThemedText style={styles.pickerCancel}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.pickerTitle}>Select Country</ThemedText>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <ThemedText style={styles.pickerDone}>Done</ThemedText>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={country}
              onValueChange={(itemValue) => setCountry(itemValue)}
              style={[styles.pickerIOS, {color: Colors[colorScheme].text}]}
            >
              <Picker.Item label="Select a country" value="" color={isDark ? '#fff' : '#000'} />
              {countries.map((countryItem) => (
                <Picker.Item
                  key={countryItem.code}
                  label={countryItem.name}
                  value={countryItem.code}
                  color={isDark ? '#fff' : '#000'}
                />
              ))}
            </Picker>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: 60, // Account for safe area
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#0a7ea4',
  },
  tabText: {
    fontSize: 16,
    marginLeft: 6,
  },
  activeTabText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  tabletContainer: {
    maxWidth: 800,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
  },
  signOutButton: {
    padding: 8,
  },
  profileContainer: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
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
  emailText: {
    fontSize: 16,
    marginBottom: 20,
    opacity: 0.7,
  },
  profileInfoContainer: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  infoLabel: {
    fontSize: 16,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 16,
  },
  editButton: {
    marginTop: 20,
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  editFormContainer: {
    width: '100%',
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
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
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
  },
  countryPickerButtonText: {
    fontSize: 16,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    height: '100%',
    justifyContent: 'flex-end',
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
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  pickerCancel: {
    opacity: 0.7,
    fontSize: 16,
  },
  pickerDone: {
    color: '#0a7ea4',
    fontSize: 16,
    fontWeight: '500',
  },
  pickerIOS: {
    height: 200,
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
    justifyContent: 'center',
  },
  cancelButton: {
    marginRight: 10,
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  sectionContainer: {
    marginTop: 20,
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    width: '100%',
  },
  sectionTitle: {
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
  },
}); 