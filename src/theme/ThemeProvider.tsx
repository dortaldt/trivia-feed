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
  const [theme, setTheme] = useState<'dark' | 'light'>(
    initialTheme === 'system'
      ? deviceTheme === 'dark'
        ? 'dark'
        : 'light'
      : initialTheme as 'dark' | 'light'
  );

  // Listen for device theme changes if using system theme
  useEffect(() => {
    if (initialTheme === 'system' && deviceTheme) {
      setTheme(deviceTheme === 'dark' ? 'dark' : 'light');
    }
  }, [deviceTheme, initialTheme]);

  const toggleTheme = () => {
    setTheme(current => (current === 'dark' ? 'light' : 'dark'));
  };

  const isDarkMode = theme === 'dark';
  const paperTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode }}>
      <PaperProvider theme={paperTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 