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
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>(deviceColorScheme);
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
        const savedColorScheme = await AsyncStorage.getItem('app-color-scheme');
        
        if (savedTheme && themeMap[savedTheme as ThemeName]) {
          setCurrentTheme(savedTheme as ThemeName);
          setThemeDefinition(themeMap[savedTheme as ThemeName]);
        }
        
        if (savedColorScheme && (savedColorScheme === 'light' || savedColorScheme === 'dark')) {
          setColorScheme(savedColorScheme as ColorSchemeType);
        }
      } catch (error) {
        console.error('Failed to load theme settings from storage:', error);
      }
    };

    loadThemeSettings();
  }, []);

  // Update colorScheme when device theme changes, unless user has explicitly set it
  useEffect(() => {
    const checkUserSetColorScheme = async () => {
      try {
        const userSet = await AsyncStorage.getItem('user-set-color-scheme');
        if (userSet !== 'true') {
          setColorScheme(deviceColorScheme);
        }
      } catch (error) {
        console.error('Failed to check user color scheme setting:', error);
        setColorScheme(deviceColorScheme);
      }
    };
    
    checkUserSetColorScheme();
  }, [deviceColorScheme]);
  
  // Apply theme CSS variables for web when theme or colorScheme changes
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('Theme or colorScheme changed. Updating theme variables...', { 
        theme: currentTheme, 
        colorScheme
      });
      
      // Apply CSS variables to document
      applyThemeVariables(themeDefinition, colorScheme);
      
      // Set theme color meta tag for mobile browsers
      setMetaThemeColor(themeDefinition, colorScheme);
      
      // Update favicon and social media tags based on theme
      console.log('Calling updateFavicon from ThemeContext useEffect');
      updateFavicon(currentTheme);
      updateSocialMetaTags('TriviaFeed');
      
      // Add theme-specific body class for CSS selectors
      document.body.className = document.body.className
        .replace(/theme-\w+/g, '')
        .trim();
      document.body.classList.add(`theme-${currentTheme}`);
      
      // Force re-render by applying a small styling change
      document.documentElement.style.transition = 'all 0.3s ease';
      // Force DOM reflow
      const reflow = document.documentElement.offsetHeight;
      
      // Debug output for theme variables
      console.log('Current theme state:');
      console.log(`- Theme: ${currentTheme}`);
      console.log(`- Color scheme: ${colorScheme}`);
      console.log(`- CSS Theme ID variable: ${getComputedStyle(document.documentElement).getPropertyValue('--theme-id')}`);
      console.log(`- Body classes: ${document.body.className}`);
      console.log(`- HTML data-theme: ${document.documentElement.dataset.theme}`);
    }
  }, [themeDefinition, colorScheme, currentTheme]);

  // Set theme by name
  const setTheme = async (themeName: ThemeName) => {
    console.log(`Setting theme to: ${themeName}`);
    
    if (themeMap[themeName]) {
      setCurrentTheme(themeName);
      setThemeDefinition(themeMap[themeName]);
      
      // Web-specific theme changes
      if (Platform.OS === 'web') {
        console.log('Calling updateFavicon directly from setTheme');
        updateFavicon(themeName);
        
        // Immediately apply theme variables for faster visual feedback
        applyThemeVariables(themeMap[themeName], colorScheme);
        setMetaThemeColor(themeMap[themeName], colorScheme);
        
        // Add theme-specific body class for CSS selectors
        document.body.className = document.body.className
          .replace(/theme-\w+/g, '')
          .trim();
        document.body.classList.add(`theme-${themeName}`);
        
        // Force a subtle visual change to trigger re-renders
        document.documentElement.style.outline = '1px solid transparent';
        // Force DOM reflow
        const reflow = document.documentElement.offsetHeight;
        document.documentElement.style.outline = '';
        
        // In case of extensive changes needed, consider a delayed refresh
        // Only do this for major theme changes like switching to/from neon theme
        if (themeName === 'neon' || currentTheme === 'neon') {
          console.log('Major theme change detected. Will apply full refresh in 500ms');
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      }
      
      try {
        await AsyncStorage.setItem('app-theme', themeName);
      } catch (error) {
        console.error('Failed to save theme to storage:', error);
      }
    }
  };

  // Toggle between light and dark color schemes
  const toggleColorScheme = async () => {
    const newColorScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorScheme(newColorScheme);
    
    try {
      await AsyncStorage.setItem('app-color-scheme', newColorScheme);
      await AsyncStorage.setItem('user-set-color-scheme', 'true');
    } catch (error) {
      console.error('Failed to save color scheme to storage:', error);
    }
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

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 