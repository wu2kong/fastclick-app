import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import type { ClickAction, Category, Tag, ViewMode, SortField, SortOrder } from '../types';
import type { AppSettings } from '../types/settings';
import { defaultSettings } from '../types/settings';

const CONFIG_DIR = '.clickpad';

const FILES = {
  app: 'app.json',
  categories: 'app-cates.json',
  tags: 'app-tags.json',
  userData: 'app-user-data.json',
  settings: 'settings.json',
} as const;

export interface AppConfig {
  viewMode: ViewMode;
  sidebarCollapsed: boolean;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  searchQuery: string;
  sortField?: SortField;
  sortOrder?: SortOrder;
}

export interface UserData {
  clickActions: ClickAction[];
}

const defaultAppConfig: AppConfig = {
  viewMode: 'grid',
  sidebarCollapsed: false,
  selectedCategoryId: null,
  selectedTagId: null,
  searchQuery: '',
};

const defaultCategories: Category[] = [
  { id: 'cat-1', name: '打开应用', description: '快速打开应用程序', icon: 'rocket', order: 0, createdAt: Date.now() },
  { id: 'cat-2', name: '执行脚本', description: '运行自定义脚本', icon: 'terminal', order: 1, createdAt: Date.now() },
  { id: 'cat-3', name: '执行操作', description: '执行系统操作', icon: 'zap', order: 2, createdAt: Date.now() },
];

const defaultTags: Tag[] = [
  { id: 'tag-1', name: '工具', parentId: null, description: '实用工具', color: '#3b82f6', order: 0, createdAt: Date.now() },
  { id: 'tag-2', name: '开发', parentId: 'tag-1', description: '开发相关', color: '#10b981', order: 0, createdAt: Date.now() },
  { id: 'tag-3', name: 'App', parentId: null, description: '应用程序', color: '#f59e0b', order: 1, createdAt: Date.now() },
  { id: 'tag-4', name: '财经', parentId: null, description: '金融财经', color: '#ef4444', order: 2, createdAt: Date.now() },
];

const defaultActions: ClickAction[] = [
  {
    id: 'action-1',
    name: '打开 VS Code',
    action: { type: 'open_app', value: 'Visual Studio Code' },
    icon: { type: 'emoji', value: '💻' },
    categoryId: 'cat-1',
    tagIds: ['tag-3'],
    description: '快速启动代码编辑器',
    displayInGallery: true,
    displayInMenu: true,
    displayInCLI: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    executionCount: 0,
    order: 0,
  },
  {
    id: 'action-2',
    name: '清理缓存',
    action: { type: 'execute_script', value: 'rm -rf ~/Library/Caches/*' },
    icon: { type: 'emoji', value: '🗑️' },
    categoryId: 'cat-3',
    tagIds: ['tag-1'],
    description: '清理系统缓存文件',
    displayInGallery: true,
    displayInMenu: true,
    displayInCLI: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    executionCount: 0,
    order: 1,
  },
];

async function ensureConfigDir(): Promise<void> {
  const dirExists = await exists(CONFIG_DIR, { baseDir: BaseDirectory.Home });
  if (!dirExists) {
    await mkdir(CONFIG_DIR, { baseDir: BaseDirectory.Home });
  }
}

async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    await ensureConfigDir();
    const content = await readTextFile(`${CONFIG_DIR}/${filename}`, { baseDir: BaseDirectory.Home });
    return JSON.parse(content) as T;
  } catch (error) {
    console.warn(`Failed to read ${filename}, using default value:`, error);
    return defaultValue;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  try {
    await ensureConfigDir();
    const content = JSON.stringify(data, null, 2);
    await writeTextFile(`${CONFIG_DIR}/${filename}`, content, { baseDir: BaseDirectory.Home });
  } catch (error) {
    console.error(`Failed to write ${filename}:`, error);
    throw error;
  }
}
async function ensureSiteIconsDir(): Promise<void> {
  const dirExists = await exists(`${CONFIG_DIR}/site-icons`, { baseDir: BaseDirectory.Home });
  if(!dirExists) {
    await mkdir(`${CONFIG_DIR}/site-icons`, { baseDir: BaseDirectory.Home });
  }
}

export const storage = {
  async downloadFavicon(domain: string): Promise<string | null> {
    try {
      await ensureSiteIconsDir();
      const localPath = await invoke<string>('download_favicon', { domain });
      return localPath;
    } catch (error) {
      console.error('Failed to download favicon:', error);
      return null;
    }
  },

  async loadAppConfig(): Promise<AppConfig> {
    return readJsonFile<AppConfig>(FILES.app, defaultAppConfig);
  },

  async saveAppConfig(config: AppConfig): Promise<void> {
    await writeJsonFile(FILES.app, config);
  },

  async loadCategories(): Promise<Category[]> {
    return readJsonFile<Category[]>(FILES.categories, defaultCategories);
  },

  async saveCategories(categories: Category[]): Promise<void> {
    await writeJsonFile(FILES.categories, categories);
  },

  async loadTags(): Promise<Tag[]> {
    return readJsonFile<Tag[]>(FILES.tags, defaultTags);
  },

  async saveTags(tags: Tag[]): Promise<void> {
    await writeJsonFile(FILES.tags, tags);
  },

  async loadUserData(): Promise<UserData> {
    const data = await readJsonFile<UserData>(FILES.userData, { clickActions: defaultActions });
    data.clickActions = data.clickActions.map((action, index) => ({
      ...action,
      order: action.order ?? index,
    }));
    return data;
  },

  async saveUserData(data: UserData): Promise<void> {
    await writeJsonFile(FILES.userData, data);
  },

  async loadSettings(): Promise<AppSettings> {
    return readJsonFile<AppSettings>(FILES.settings, defaultSettings);
  },

  async saveSettings(settings: AppSettings): Promise<void> {await writeJsonFile(FILES.settings, settings);
  },

  async loadAll(): Promise<{ appConfig: AppConfig; categories: Category[]; tags: Tag[]; userData: UserData }> {
    const [appConfig, categories, tags, userData] = await Promise.all([
      this.loadAppConfig(),
      this.loadCategories(),
      this.loadTags(),
      this.loadUserData(),
    ]);
    return { appConfig, categories, tags, userData };
  },

  async saveAll(
    appConfig: AppConfig,
    categories: Category[],
    tags: Tag[],
    userData: UserData
  ): Promise<void> {
    await Promise.all([
      this.saveAppConfig(appConfig),
      this.saveCategories(categories),
      this.saveTags(tags),
      this.saveUserData(userData),
    ]);
  },
};
