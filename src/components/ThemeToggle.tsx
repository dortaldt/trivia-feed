import React, { useState, useContext, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, ScrollView, Platform, ViewStyle } from 'react-native';
import { FeatherIcon } from '@/components/FeatherIcon';
import { BlurView } from 'expo-blur';

// Import only what's needed
import { useColorScheme } from '@/hooks/useColorScheme';

// Define types for themes
export type ThemeName = 'default' | 'neon' | 'retro' | 'modern';
export type ColorSchemeType = 'light' | 'dark';

// Define the ThemeContext type interface
interface ThemeContextType {
  currentTheme: ThemeName;
  colorScheme: ColorSchemeType;
  themeDefinition: any; // Using 'any' for simplicity
  isNeonTheme: boolean;
  setTheme: (themeName: ThemeName) => void;
  toggleColorScheme: () => void;
  toggleTheme: () => void;
  getThemeAppIcon: () => string;
}

type ThemeOption = {
  id: ThemeName;
  name: string;
  icon: string;
};

type ThemeColorPreviews = {
  [key in ThemeName]: {
    light: string[];
    dark: string[];
  }
};

type ThemeToggleProps = {
  style?: ViewStyle;
  size?: 'small' | 'normal';
};

// Fallback theme options when ThemeContext is not available
const defaultThemeOptions: ThemeOption[] = [
  { id: 'default', name: 'Default', icon: 'circle' },
  { id: 'neon', name: 'Neon', icon: 'zap' },
  { id: 'retro', name: 'Retro', icon: 'hard-drive' },
  { id: 'modern', name: 'Modern', icon: 'smartphone' },
];

const ThemeToggle: React.FC<ThemeToggleProps> = ({ style, size = 'normal' }) => {
  // Use a try/catch to safely attempt to import the theme context
  let themeContext: ThemeContextType | null = null;
  let currentTheme: ThemeName = 'neon';
  let colorScheme: ColorSchemeType = useColorScheme() as ColorSchemeType || 'dark';
  
  // Add effect to check theme status on mount
  useEffect(() => {
    const checkThemeStatus = async () => {
      try {
        // Check AsyncStorage
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const storedTheme = await AsyncStorage.getItem('app-theme');
        const storedColorScheme = await AsyncStorage.getItem('app-color-scheme');
        
        // console.log('ThemeToggle diagnostics:');
        // console.log('- Stored theme:', storedTheme);
        // console.log('- Stored color scheme:', storedColorScheme);
        
        // For web, check CSS variables
        if (Platform.OS === 'web') {
          const themeId = getComputedStyle(document.documentElement).getPropertyValue('--theme-id').trim();
          const dataTheme = document.documentElement.dataset.theme;
          
          // console.log('- CSS theme variable:', themeId);
          // console.log('- HTML data-theme attribute:', dataTheme);
        }
      } catch (error) {
        console.error('Error checking theme status:', error);
      }
    };
    
    checkThemeStatus();
  }, []);
  
  try {
    // First, try to get the context from src/context/ThemeContext
    try {
      const { useTheme } = require('@/src/context/ThemeContext');
      themeContext = useTheme();
      if (themeContext) {
        currentTheme = themeContext.currentTheme;
        colorScheme = themeContext.colorScheme;
        
        // console.log('Successfully connected to ThemeContext:');
        // console.log('- Current theme:', currentTheme);
        // console.log('- Color scheme:', colorScheme);
        // console.log('- Is neon theme:', themeContext.isNeonTheme);
      }
    } catch (error) {
      console.warn('ThemeToggle: Could not access context/ThemeContext, trying theme/ThemeProvider', error);
      
      // If that fails, try the ThemeProvider from src/theme/ThemeProvider
      try {
        const { useTheme } = require('@/src/theme/ThemeProvider');
        const simpleThemeContext = useTheme();
        
        if (simpleThemeContext) {
          // Map the simple theme provider to our interface
          themeContext = {
            currentTheme: 'default', // The simple provider doesn't have themes, just light/dark
            colorScheme: simpleThemeContext.theme as ColorSchemeType,
            themeDefinition: {},
            isNeonTheme: false,
            setTheme: () => console.warn('ThemeToggle: setTheme not supported with simple theme provider'),
            toggleColorScheme: simpleThemeContext.toggleTheme,
            toggleTheme: () => console.warn('ThemeToggle: toggleTheme not supported with simple theme provider'),
            getThemeAppIcon: () => '/assets/images/app-icon.png'
          };
          
          // Update current values
          colorScheme = simpleThemeContext.theme as ColorSchemeType;
          
          // console.log('Using fallback UIThemeProvider:');
          // console.log('- UI theme:', simpleThemeContext.theme);
          // console.log('- Is dark mode:', simpleThemeContext.isDarkMode);
        }
      } catch (secondError) {
        console.warn('ThemeToggle: Could not access theme/ThemeProvider either', secondError);
        // Continue with defaults
      }
    }
  } catch (error) {
    console.warn('ThemeToggle: Error setting up theming', error);
    // Continue with defaults, button will be non-functional
  }
  
  const [modalVisible, setModalVisible] = useState(false);
  
  // Available theme options
  const themeOptions: ThemeOption[] = defaultThemeOptions;
  
  // Simplified color preview for each theme
  const themeColorPreviews: ThemeColorPreviews = {
    default: {
      light: ['#ffc107', '#03a9f4', '#ff5722'],
      dark: ['#ffc107', '#03a9f4', '#ff5722'],
    },
    neon: {
      light: ['#00FFFF', '#FF00FF', '#FFFF00'],
      dark: ['#00FFFF', '#FF00FF', '#FFFF00'],
    },
    retro: {
      light: ['#FF6B6B', '#4ECDC4', '#FFE66D'],
      dark: ['#FF6B6B', '#4ECDC4', '#FFE66D'],
    },
    modern: {
      light: ['#6200EE', '#03DAC6', '#FF7597'],
      dark: ['#BB86FC', '#03DAC6', '#CF6679'],
    },
  };
  
  // Toggle the theme selector modal
  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };
  
  // Select a theme and close the modal
  const selectTheme = (themeId: ThemeName) => {
    if (themeContext && themeContext.setTheme) {
      // console.log(`ThemeToggle: Setting theme to ${themeId}`);
      themeContext.setTheme(themeId);
      
      // Direct application for web platform
      if (Platform.OS === 'web') {
        try {
          // Try to directly apply the theme
          const { 
            applyThemeVariables, 
            setMetaThemeColor 
          } = require('@/src/utils/applyThemeVariables');
          
          const { 
            defaultTheme, 
            neonTheme, 
            retroTheme, 
            modernTheme 
          } = require('@/src/design/themes');
          
          // Map of theme IDs to definitions
          const themeMap = {
            default: defaultTheme,
            neon: neonTheme,
            retro: retroTheme,
            modern: modernTheme
          };
          
          // Force apply theme variables
          const themeDefinition = themeMap[themeId];
          if (themeDefinition) {
            // console.log(`ThemeToggle: Directly applying ${themeId} theme variables`);
            applyThemeVariables(themeDefinition, colorScheme);
            setMetaThemeColor(themeDefinition, colorScheme);
            
            // Add class to body for theme-specific styling
            document.body.dataset.theme = themeId;
            document.documentElement.dataset.theme = themeId;
            
            // Force page refresh after a short delay to ensure all components pick up the theme
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
        } catch (error) {
          console.warn('ThemeToggle: Could not directly apply theme variables', error);
        }
      }
    } else {
      console.warn('ThemeToggle: Cannot set theme, ThemeContext unavailable');
    }
    setModalVisible(false);
  };
  
  // Get background color based on theme
  const getBackgroundColor = () => {
    if (colorScheme === 'dark') {
      return currentTheme === 'neon' ? '#000000' : '#121212';
    } else {
      return currentTheme === 'neon' ? '#F0F0F0' : '#FFFFFF';
    }
  };
  
  // Get icon color based on theme 
  const getIconColor = () => {
    if (currentTheme === 'neon') {
      return colorScheme === 'dark' ? '#00FFFF' : '#00CCFF';
    } else if (currentTheme === 'retro') {
      return colorScheme === 'dark' ? '#FF6B6B' : '#FF6B6B';
    } else if (currentTheme === 'modern') {
      return colorScheme === 'dark' ? '#BB86FC' : '#6200EE';
    } else {
      return colorScheme === 'dark' ? '#ffc107' : '#ffc107';
    }
  };
  
  return (
    <View style={style}>
      {/* Theme Toggle Button */}
      <TouchableOpacity 
        onPress={toggleModal}
        style={[
          styles.themeButton,
          size === 'small' && styles.themeButtonSmall,
          { backgroundColor: getBackgroundColor() }
        ]}
      >
        <FeatherIcon name="droplet" size={size === 'small' ? 18 : 24} color={getIconColor()} />
      </TouchableOpacity>
      
      {/* Theme Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={90}
            tint={colorScheme}
            style={styles.modalBlur}
          >
            <View 
              style={[
                styles.modalContent,
                { backgroundColor: colorScheme === 'dark' ? 'rgba(18, 18, 18, 0.9)' : 'rgba(255, 255, 255, 0.9)' }
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                  Choose Theme
                </Text>
                <TouchableOpacity onPress={toggleModal} style={styles.closeButton}>
                  <FeatherIcon name="x" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.themesContainer}>
                {themeOptions.map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeOption,
                      currentTheme === theme.id && styles.selectedTheme,
                      { borderColor: colorScheme === 'dark' ? '#333' : '#ddd' }
                    ]}
                    onPress={() => selectTheme(theme.id)}
                  >
                    <View style={styles.themeHeader}>
                      <FeatherIcon 
                        name={theme.icon as any} 
                        size={20} 
                        color={
                          themeColorPreviews[theme.id][colorScheme][0]
                        } 
                      />
                      <Text style={[
                        styles.themeName, 
                        { color: colorScheme === 'dark' ? '#fff' : '#000' }
                      ]}>
                        {theme.name}
                      </Text>
                      {currentTheme === theme.id && (
                        <FeatherIcon name="check" size={20} color={getIconColor()} />
                      )}
                    </View>
                    
                    <View style={styles.colorPreview}>
                      {themeColorPreviews[theme.id][colorScheme].map((color: string, index: number) => (
                        <View 
                          key={index} 
                          style={[styles.colorSwatch, { backgroundColor: color }]} 
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.colorSchemeToggleContainer}>
                <Text style={[styles.colorSchemeLabel, { color: '#fff' }]}>
                  Dark Mode Only
                </Text>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
      ':hover': {
        transform: 'scale(1.1)',
      },
    } as any : {})
  },
  themeButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBlur: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  themesContainer: {
    maxHeight: 400,
  },
  themeOption: {
    padding: 15,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
      ':hover': {
        transform: 'scale(1.02)',
      },
    } as any : {})
  },
  selectedTheme: {
    borderWidth: 2,
    borderColor: 'transparent', // Will be set by theme color
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  colorPreview: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  colorSchemeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.3)',
  },
  colorSchemeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  colorSchemeToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 4,
  },
  colorSchemeIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    ...(Platform.OS === 'web' ? {
      transition: 'transform 0.2s ease, background-color 0.2s ease',
    } as any : {})
  },
});

export default ThemeToggle; 