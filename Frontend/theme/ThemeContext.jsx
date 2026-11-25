import React, { createContext, useContext, useMemo } from 'react';
import { createTheme } from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const colorScheme = 'light';
  const theme = useMemo(() => createTheme(colorScheme), [colorScheme]);
  const value = useMemo(() => ({ theme, colorScheme }), [theme, colorScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
