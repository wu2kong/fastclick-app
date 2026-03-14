import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { ClickAction, Category, Tag, ViewMode } from '../types';

const CONFIG_DIR = '.fastclick';

const FILES = {
  app: 'app.json',
  categories: 'app-cates.json',
  tags: 'app-tags.json',
  userData: 'app-user-data.json',
} as const;

export interface AppConfig {
  viewMode: ViewMode;
  sidebarCollapsed: boolean;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  searchQuery: string;
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
  { id: 'cat-1', name: '启动应用', description: '快速启动应用程序', icon: 'rocket', order: 0, createdAt: Date.now() },
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
    icon: 'code',
    categoryId: 'cat-1',
    tagIds: ['tag-3'],
    description: '快速启动代码编辑器',
    displayInGallery: true,
    displayInMenu: true,
    displayInCLI: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    executionCount: 0,
  },
  {
    id: 'action-2',
    name: '清理缓存',
    action: { type: 'execute_script', value: 'rm -rf ~/Library/Caches/*' },
    icon: 'trash',
    categoryId: 'cat-3',
    tagIds: ['tag-1'],
    description: '清理系统缓存文件',
    displayInGallery: true,
    displayInMenu: true,
    displayInCLI: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    executionCount: 0,
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

export const storage = {
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
    return readJsonFile<UserData>(FILES.userData, { clickActions: defaultActions });
  },

  async saveUserData(data: UserData): Promise<void> {
    await writeJsonFile(FILES.userData, data);
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
