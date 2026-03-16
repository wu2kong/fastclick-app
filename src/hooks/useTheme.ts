import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import type { ThemeMode } from '../types/settings';

export function useTheme() {
  const theme = useSettingsStore((state) => state.settings.general.theme);
  const isInitialized = useSettingsStore((state) => state.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;

    const applyTheme = (mode: ThemeMode) => {
      const root = document.documentElement;
      
      if (mode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', isDark);
        root.classList.toggle('light', !isDark);
      } else {
        root.classList.toggle('dark', mode === 'dark');
        root.classList.toggle('light', mode === 'light');
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (useSettingsStore.getState().settings.general.theme === 'system') {
          applyTheme('system');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, isInitialized]);

  return { theme };
}