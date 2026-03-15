export type ClickActionType = 'app' | 'script' | 'action';

export interface ScriptExecutionParams {
  args?: string[];
  env?: Record<string, string>;
  workingDir?: string;
  timeoutMs?: number;
}

export interface ActionIcon {
  type: 'emoji' | 'image';
  value: string;
}

export interface ClickAction {
  id: string;
  name: string;
  action: {
    type: 'open_app' | 'execute_script' | 'other';
    value: string;
    params?: ScriptExecutionParams;
  };
  icon?: ActionIcon | null;
  categoryId: string;
  tagIds: string[];
  description: string;
  displayInGallery: boolean;
  displayInMenu: boolean;
  displayInCLI: boolean;
  createdAt: number;
  updatedAt: number;
  executionCount: number;
  order: number;
}

export interface ExecuteResult {
  success: boolean;
  message: string;
  output?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  order: number;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  parentId: string | null;
  description: string;
  color: string;
  order: number;
  createdAt: number;
}

export type ViewMode = 'list' | 'grid' | 'gallery';

export interface FilterState {
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
}

export * from './settings';
