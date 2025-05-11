import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useDeviceColorScheme, Platform } from 'react-native';
import { ThemeDefinition, defaultTheme, neonTheme, retroTheme, modernTheme } from '../design/themes';
import { applyThemeVariables, setMetaThemeColor } from '../utils/applyThemeVariables';

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
}

// Map theme names to their definitions
const themeMap: Record<ThemeName, ThemeDefinition> = {
  default: defaultTheme,
  neon: neonTheme,
  retro: retroTheme,
  modern: modernTheme
};

// Default theme cycling order
const themeCycleOrder: ThemeName[] = ['default', 'neon', 'retro', 'modern'];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme() as ColorSchemeType || 'dark';
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>(deviceColorScheme);
  const [themeDefinition, setThemeDefinition] = useState<ThemeDefinition>(defaultTheme);

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
      // Apply CSS variables to document
      applyThemeVariables(themeDefinition, colorScheme);
      
      // Set theme color meta tag for mobile browsers
      setMetaThemeColor(themeDefinition, colorScheme);
    }
  }, [themeDefinition, colorScheme]);

  // Set theme by name
  const setTheme = async (themeName: ThemeName) => {
    if (themeMap[themeName]) {
      setCurrentTheme(themeName);
      setThemeDefinition(themeMap[themeName]);
      
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
    
    setCurrentTheme(nextTheme);
    setThemeDefinition(themeMap[nextTheme]);
    
    try {
      await AsyncStorage.setItem('app-theme', nextTheme);
    } catch (error) {
      console.error('Failed to save theme to storage:', error);
    }
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