export type ClickActionType = 'app' | 'script' | 'action';

export interface ClickAction {
  id: string;
  name: string;
  action: {
    type: 'open_app' | 'execute_script' | 'other';
    value: string;
  };
  icon?: string | null;
  categoryId: string;
  tagIds: string[];
  description: string;
  displayInGallery: boolean;
  displayInMenu: boolean;
  displayInCLI: boolean;
  createdAt: number;
  updatedAt: number;
  executionCount: number;
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

export type ViewMode = 'list' | 'grid';

export interface FilterState {
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
}
