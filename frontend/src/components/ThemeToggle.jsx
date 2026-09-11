import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle color theme"
      className={`p-2 rounded-xl transition-all flex items-center justify-center ${
        theme === 'dark'
          ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-slate-700 shadow-sm'
          : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-300 shadow-sm'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
