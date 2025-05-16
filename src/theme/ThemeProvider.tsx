import React, { ReactNode, createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { darkTheme, lightTheme } from './index';

type ThemeContextType = {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isDarkMode: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  isDarkMode: true,
});

export const useTheme = () => useContext(ThemeContext);

type ThemeProviderProps = {
  children: ReactNode;
  initialTheme?: 'dark' | 'light' | 'system';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'system',
}) => {
  const deviceTheme = useColorScheme();
  // Always use dark theme, regardless of initialTheme or system settings
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Force dark theme, ignore device theme changes
  useEffect(() => {
    // Always set to dark, regardless of system theme
    setTheme('dark');
  }, []);

  // Toggle theme function - does nothing since we're always in dark mode
  const toggleTheme = () => {
    // Do nothing - app is dark mode only
    console.log('App is dark mode only');
  };

  const isDarkMode = true; // Always dark mode
  const paperTheme = darkTheme; // Always use dark theme

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode }}>
      <PaperProvider theme={paperTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 