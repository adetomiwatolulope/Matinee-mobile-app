import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { createTheme } from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme ?? 'light';
  const theme = useMemo(() => createTheme(colorScheme), [colorScheme]);
  const value = useMemo(() => ({ theme, colorScheme }), [theme, colorScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
