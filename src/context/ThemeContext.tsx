import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useDeviceColorScheme, Platform } from 'react-native';
import { ThemeDefinition, defaultTheme, neonTheme, retroTheme, modernTheme } from '../design/themes';
import { applyThemeVariables, setMetaThemeColor } from '../utils/applyThemeVariables';
import { updateFavicon, updateSocialMetaTags } from '../utils/themeIcons';

// Define available themes
export type ThemeName = 'default' | 'neon' | 'retro' | 'modern';
export type ColorSchemeType = 'light' | 'dark';

interface ThemeContextType {
  currentTheme: ThemeName;
  colorScheme: ColorSchemeType;
  themeDefinition: ThemeDefinition;
  isNeonTheme: boolean; // Maintained for backward compatibility
  setTheme: (themeName: ThemeName) => void;
  toggleColorScheme: () => void;
  toggleTheme: () => void; // Cycles through themes
  getThemeAppIcon: () => string; // Get the theme-appropriate app icon path
}

// Map theme names to their definitions
const themeMap: Record<ThemeName, ThemeDefinition> = {
  default: defaultTheme,
  neon: neonTheme,
  retro: retroTheme,
  modern: modernTheme
};

// Default theme cycling order
const themeCycleOrder: ThemeName[] = ['neon', 'default', 'retro', 'modern'];

// App icon mapping based on theme
const themeAppIconMap: Record<ThemeName, string> = {
  default: '/assets/images/app-icon.png',
  neon: '/assets/images/app-icon-neon.png',
  retro: '/assets/images/app-icon.png',
  modern: '/assets/images/app-icon.png'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme() as ColorSchemeType || 'dark';
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('neon');
  // Always use dark mode, regardless of device theme
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>('dark');
  const [themeDefinition, setThemeDefinition] = useState<ThemeDefinition>(neonTheme);

  // Initialize the theme to neon if no theme is set yet
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme');
        if (!savedTheme) {
          // If no theme is saved, set to neon by default
          await AsyncStorage.setItem('app-theme', 'neon');
          console.log('Initialized default theme to neon');
        }
      } catch (error) {
        console.error('Failed to initialize theme:', error);
      }
    };

    initializeTheme();
  }, []);

  // Load saved theme settings on startup
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme');
        
        if (savedTheme && themeMap[savedTheme as ThemeName]) {
          setCurrentTheme(savedTheme as ThemeName);
          setThemeDefinition(themeMap[savedTheme as ThemeName]);
        }
        
        // Always force dark mode, ignore saved color scheme
        setColorScheme('dark');
        await AsyncStorage.setItem('app-color-scheme', 'dark');
      } catch (error) {
        console.error('Failed to load theme settings from storage:', error);
      }
    };

    loadThemeSettings();
  }, []);

  // Force dark mode, ignore device theme changes
  useEffect(() => {
    // Always use dark mode
    setColorScheme('dark');
    
    // Save dark mode preference
    AsyncStorage.setItem('app-color-scheme', 'dark').catch(error => {
      console.error('Failed to save color scheme to storage:', error);
    });
  }, []);

  // Apply theme variables for web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        applyThemeVariables(themeDefinition, colorScheme);
        
        // Set the theme color for browser UI (mobile)
        setMetaThemeColor(themeDefinition, colorScheme);
        
        // Update the favicon based on the theme
        updateFavicon(currentTheme);
        
        // Update meta tags for social sharing
        updateSocialMetaTags(currentTheme);
        
        // Add data-theme attributes to root elements for CSS targeting
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = currentTheme;
          document.documentElement.dataset.colorScheme = colorScheme;
          document.body.dataset.theme = currentTheme;
          document.body.dataset.colorScheme = colorScheme;
        }
      } catch (error) {
        console.error('Failed to apply theme variables:', error);
      }
    }
  }, [themeDefinition, colorScheme, currentTheme]);

  // Track theme changes for analytics
  useEffect(() => {
    // Log theme changes to analytics
    console.log(`Theme changed to: ${currentTheme}, color scheme: ${colorScheme}`);
    
    // Additional analytics tracking could be added here
  }, [currentTheme, colorScheme]);

  // Set a specific theme
  const setTheme = async (themeName: ThemeName) => {
    if (themeMap[themeName]) {
      setCurrentTheme(themeName);
      setThemeDefinition(themeMap[themeName]);
      
      try {
        await AsyncStorage.setItem('app-theme', themeName);
      } catch (error) {
        console.error('Failed to save theme to storage:', error);
      }
    } else {
      console.error(`Invalid theme name: ${themeName}`);
    }
  };

  // Toggle between light and dark color schemes - now does nothing since we're dark-only
  const toggleColorScheme = async () => {
    // Do nothing - app is dark mode only
    console.log('App is dark mode only');
    return;
  };

  // Cycle through available themes
  const toggleTheme = async () => {
    const currentIndex = themeCycleOrder.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeCycleOrder.length;
    const nextTheme = themeCycleOrder[nextIndex];
    
    console.log(`Cycling theme from ${currentTheme} to ${nextTheme}`);
    
    setCurrentTheme(nextTheme);
    setThemeDefinition(themeMap[nextTheme]);
    
    // Immediately update favicon for web platform
    if (Platform.OS === 'web') {
      console.log('Calling updateFavicon directly from toggleTheme');
      updateFavicon(nextTheme);
    }
    
    try {
      await AsyncStorage.setItem('app-theme', nextTheme);
    } catch (error) {
      console.error('Failed to save theme to storage:', error);
    }
  };
  
  // Get the appropriate app icon based on theme
  const getThemeAppIcon = () => {
    return themeAppIconMap[currentTheme] || themeAppIconMap.default;
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        colorScheme,
        themeDefinition,
        isNeonTheme: currentTheme === 'neon', // For backward compatibility
        setTheme,
        toggleColorScheme,
        toggleTheme,
        getThemeAppIcon,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 