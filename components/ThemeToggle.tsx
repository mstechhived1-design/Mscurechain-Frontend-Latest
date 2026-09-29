'use client';

import React, { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  // Theme is handled by themeStore and root layout script
  useEffect(() => {
    // Sync theme on mount if needed
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 relative group"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label="Toggle theme"
    >
      <div className="relative w-6 h-6">
        {/* Sun icon for light mode */}
        <Sun
          size={20}
          className={`absolute inset-0 ${
            theme === 'light'
              ? 'opacity-100 rotate-0 scale-100 text-amber-500'
              : 'opacity-0 rotate-90 scale-0 text-gray-400'
          }`}
        />
        {/* Moon icon for dark mode */}
        <Moon
          size={20}
          className={`absolute inset-0 ${
            theme === 'dark'
              ? 'opacity-100 rotate-0 scale-100 text-indigo-400'
              : 'opacity-0 -rotate-90 scale-0 text-gray-400'
          }`}
        />
      </div>
      
      {/* Tooltip */}
      <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
        {theme === 'light' ? 'Dark mode' : 'Light mode'}
      </span>
    </button>
  );
};
