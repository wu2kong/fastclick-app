import { create } from 'zustand';
import type { AppSettings, GeneralSettings, ShortcutsSettings, AdvancedSettings, ThemeMode } from '../types/settings';
import { defaultSettings } from '../types/settings';
import { storage } from '../services/storage';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  isInitialized: boolean;
  
  initializeSettings: () => Promise<void>;
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => void;
  updateShortcutsSettings: (settings: Partial<ShortcutsSettings>) => void;
  updateAdvancedSettings: (settings: Partial<AdvancedSettings>) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleAutoStart: () => void;
  toggleSilentStart: () => void;
  toggleMinimizeToTray: () => void;
  setPreferredTerminal: (terminal: string) => void;
  toggleAutoBackup: () => void;
  setBackupDir: (dir: string) => void;
  toggleCloudSync: () => void;
  resetToDefaults: () => void;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  isInitialized: false,

  initializeSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await storage.loadSettings();
      set({ settings, isInitialized: true });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ settings: defaultSettings, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  updateGeneralSettings: (generalSettings) => {
    set((state) => ({
      settings: {
        ...state.settings,
        general: { ...state.settings.general, ...generalSettings },
      },
    }));
    setTimeout(() => get().saveSettings(), 0);
  },

  updateShortcutsSettings: (shortcutsSettings) => {
    set((state) => ({
      settings: {
        ...state.settings,
        shortcuts: { ...state.settings.shortcuts, ...shortcutsSettings },
      },
    }));
    setTimeout(() => get().saveSettings(), 0);
  },

  updateAdvancedSettings: (advancedSettings) => {
    set((state) => ({
      settings: {
        ...state.settings,
        advanced: { ...state.settings.advanced, ...advancedSettings },
      },
    }));
    setTimeout(() =>get().saveSettings(), 0);
  },

  setTheme: (theme) => {
    set((state) => ({
      settings: {
        ...state.settings,
        general: { ...state.settings.general, theme },
      },
    }));
    setTimeout(() =>get().saveSettings(), 0);
  },

  toggleAutoStart: () => {set((state) => ({
      settings: {
        ...state.settings,
        general: {...state.settings.general, autoStart: !state.settings.general.autoStart },
      },
    }));
    setTimeout(() =>get().saveSettings(), 0);
  },

  toggleSilentStart: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        general: { ...state.settings.general, silentStart: !state.settings.general.silentStart },
      },
    }));
    setTimeout(() =>get().saveSettings(), 0);
  },

  toggleMinimizeToTray: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        general: { ...state.settings.general, minimizeToTray: !state.settings.general.minimizeToTray },
      },
    }));
    setTimeout(() => get().saveSettings(), 0);
  },

  setPreferredTerminal: (terminal) => {
    set((state) => ({
      settings: {
        ...state.settings,
        general: { ...state.settings.general, preferredTerminal: terminal },
      },
    }));
    setTimeout(() => get().saveSettings(), 0);
  },

  toggleAutoBackup: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        advanced: { ...state.settings.advanced, autoBackup: !state.settings.advanced.autoBackup },
      },
    }));
    setTimeout(() => get().saveSettings(), 0);
  },

  setBackupDir: (dir) => {
    set((state) => ({
      settings: {
        ...state.settings,
        advanced: { ...state.settings.advanced, backupDir: dir },
      },
    }));
    setTimeout(() => get().saveSettings(), 0);
  },

  toggleCloudSync: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        advanced: { ...state.settings.advanced, cloudSyncEnabled: !state.settings.advanced.cloudSyncEnabled },
      },
    }));
    setTimeout(() => get().saveSettings(), 0);
  },

  resetToDefaults: () => {
    set({ settings: defaultSettings });
    setTimeout(() => get().saveSettings(), 0);
  },

  saveSettings: async () => {
    const state = get();
    if (!state.isInitialized) return;
    try {
      await storage.saveSettings(state.settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));