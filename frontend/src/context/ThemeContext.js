import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

const themes = {
  dark: {
    '--bg': '#0f0f1a',
    '--surface': '#1a1a2e',
    '--accent': '#6c63ff',
    '--text': '#e0e0e0',
    '--border': '#2a2a3e',
    '--text-secondary': '#94a3b8',
    '--surface-hover': '#222244',
    '--shadow': 'rgba(0,0,0,0.4)',
    '--gradient': 'linear-gradient(135deg, #6c63ff, #a78bfa)',
    '--danger': '#ef4444',
    '--success': '#22c55e',
    '--warning': '#f59e0b',
  },
  light: {
    '--bg': '#f0f2f5',
    '--surface': '#ffffff',
    '--accent': '#4f46e5',
    '--text': '#1a1a2e',
    '--border': '#d1d5db',
    '--text-secondary': '#6b7280',
    '--surface-hover': '#f3f4f6',
    '--shadow': 'rgba(0,0,0,0.1)',
    '--gradient': 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    '--danger': '#dc2626',
    '--success': '#16a34a',
    '--warning': '#d97706',
  },
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const root = document.documentElement;
  const theme = themes[isDark ? 'dark' : 'light'];
  Object.entries(theme).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
