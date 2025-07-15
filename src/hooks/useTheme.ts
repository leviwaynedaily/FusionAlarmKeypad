import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  // Update effective theme based on system preference
  const updateEffectiveTheme = () => {
    if (typeof window === 'undefined') return;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setEffectiveTheme(systemTheme);
    } else {
      setEffectiveTheme(theme);
    }
  };

  // Handle system theme change
  useEffect(() => {
    const handleChange = () => updateEffectiveTheme();
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Update effective theme when theme changes
  useEffect(() => {
    updateEffectiveTheme();
  }, [theme]);

  // Apply theme classes to document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      if (effectiveTheme === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }

    }
  }, [effectiveTheme]);

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('fusion_theme') as 'light' | 'dark' | 'system';
      const themeToUse = savedTheme || 'system';
      
      if (!savedTheme) {
        localStorage.setItem('fusion_theme', 'system');
      }
      
      setTheme(themeToUse);
      
      // Set initial effective theme
      if (themeToUse === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setEffectiveTheme(systemTheme);
      } else {
        setEffectiveTheme(themeToUse);
      }
    }
  }, []);

  // Save theme to localStorage
  const saveTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fusion_theme', newTheme);
    }
  };

  return {
    theme,
    effectiveTheme,
    setTheme: saveTheme,
  };
} 