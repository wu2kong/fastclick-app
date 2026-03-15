export type ThemeMode = 'light' | 'dark' | 'system';

export interface GeneralSettings {
  theme: ThemeMode;
  autoStart: boolean;
  silentStart: boolean;
  minimizeToTray: boolean;
  preferredTerminal: string;
}

export interface ShortcutsSettings {
  globalInvoke: string;
  search: string;
  newAction: string;
  editAction: string;
}

export interface AdvancedSettings {
  autoBackup: boolean;
  backupDir: string;
  cloudSyncEnabled: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  shortcuts: ShortcutsSettings;
  advanced: AdvancedSettings;
}

export const defaultSettings: AppSettings = {
  general: {
    theme: 'system',
    autoStart: false,
    silentStart: false,
    minimizeToTray: false,
    preferredTerminal: 'Terminal',
  },
  shortcuts: {
    globalInvoke: 'CommandOrControl+Shift+Space',
    search: 'CommandOrControl+F',
    newAction: 'CommandOrControl+N',
    editAction: 'CommandOrControl+E',
  },
  advanced: {
    autoBackup: true,
    backupDir: '',
    cloudSyncEnabled: false,
  },
};

export type SettingsTab = 'general' | 'shortcuts' | 'advanced' | 'about';