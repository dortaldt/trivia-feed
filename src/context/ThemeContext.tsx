import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

// Define theme types
export type ThemeType = 'default' | 'neon';
type ColorSchemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  colorScheme: ColorSchemeType;
  isNeonTheme: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme() as ColorSchemeType || 'dark';
  const [theme, setTheme] = useState<ThemeType>('default');
  const [colorScheme, setColorScheme] = useState<ColorSchemeType>(deviceColorScheme);

  // Load saved theme on startup
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme');
        if (savedTheme) {
          setTheme(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Failed to load theme from storage:', error);
      }
    };

    loadTheme();
  }, []);

  // Update colorScheme when device theme changes
  useEffect(() => {
    setColorScheme(deviceColorScheme);
  }, [deviceColorScheme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'default' ? 'neon' : 'default';
    setTheme(newTheme);
    
    try {
      await AsyncStorage.setItem('app-theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme to storage:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorScheme,
        isNeonTheme: theme === 'neon',
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