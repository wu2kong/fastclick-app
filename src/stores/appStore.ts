import { create } from 'zustand';
import type { ClickAction, Category, Tag, ViewMode, SortField, SortOrder } from '../types';
import { storage } from '../services/storage';
import { invoke } from '@tauri-apps/api/core';

interface AppState {
  clickActions: ClickAction[];
  categories: Category[];
  tags: Tag[];
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  selectedFilterTagId: string | null;
  tagFilterExpanded: boolean;
  viewMode: ViewMode;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  sidebarCollapsed: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  setClickActions: (actions: ClickAction[]) => void;
  addClickAction: (action: Omit<ClickAction, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'order'> & { order?: number }) => void;
  updateClickAction: (id: string, action: Partial<ClickAction>) => void;
  deleteClickAction: (id: string) => void;
  incrementExecutionCount: (id: string) => void;
  
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Omit<Tag, 'id' | 'createdAt'>) => string;
  updateTag: (id: string, tag: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  reorderCategories: (fromIndex: number, toIndex: number) => void;
  reorderTags: (fromIndex: number, toIndex: number) => void;
  reorderActions: (fromIndex: number, toIndex: number) => void;
  
  setSelectedCategory: (id: string | null) => void;
  setSelectedTag: (id: string | null) => void;
  setSelectedFilterTagId: (id: string | null) => void;
  setTagFilterExpanded: (expanded: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSidebar: () => void;
  
  getFilteredActions: () => ClickAction[];
  getTagStats: (tagId: string) => number;
  getCategoryStats: (categoryId: string) => number;
  getChildTags: (parentId: string) => Tag[];
  getTagHierarchy: () => { tag: Tag; level: number }[];
  
  initializeStore: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

async function refreshTrayMenu() {
  try {
    await invoke('refresh_tray_menu');
  } catch (error) {
    console.error('Failed to refresh tray menu:', error);
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  clickActions: [],
  categories: [],
  tags: [],
  selectedCategoryId: null,
  selectedTagId: null,
  selectedFilterTagId: null,
  tagFilterExpanded: true,
  viewMode: 'grid',
  sortField: 'custom',
  sortOrder: 'asc',
  searchQuery: '',
  sidebarCollapsed: false,
  isLoading: false,
  isInitialized: false,

  setClickActions: (actions) => {
    set({ clickActions: actions });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  addClickAction: (action) => {
    const newAction: ClickAction = {
      ...action,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executionCount: 0,
      order: action.order ?? get().clickActions.length,
    };
    set((state) => ({ clickActions: [...state.clickActions, newAction] }));
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },
  
  updateClickAction: (id, action) => {
    set((state) => ({
      clickActions: state.clickActions.map((a) =>
        a.id === id ? { ...a, ...action, updatedAt: Date.now() } : a
      ),
    }));
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },
  
  deleteClickAction: (id) => {
    set((state) => ({
      clickActions: state.clickActions.filter((a) => a.id !== id),
    }));
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },
  
  incrementExecutionCount: (id) => {
    set((state) => ({
      clickActions: state.clickActions.map((a) =>
        a.id === id ? { ...a, executionCount: a.executionCount + 1 } : a
      ),
    }));
    setTimeout(() => get().saveToStorage(), 0);
  },

  setCategories: (categories) => {
    set({ categories });
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },
  
  addCategory: (category) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
      createdAt: Date.now(),
      order: category.order ?? get().categories.length,
    };
    set((state) => ({ categories: [...state.categories, newCategory] }));
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },
  
  updateCategory: (id, category) => {
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...category } : c
      ),
    }));
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },
  
  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
      clickActions: state.clickActions.map((a) =>
        a.categoryId === id ? { ...a, categoryId: '' } : a
      ),
    }));
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },

  setTags: (tags) => {
    set({ tags });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  addTag: (tag) => {
    const id = generateId();
    const newTag: Tag = {
      ...tag,
      id,
      createdAt: Date.now(),
      order: tag.order ?? get().tags.filter(t => t.parentId === tag.parentId).length,
    };
    set((state) => ({ tags: [...state.tags, newTag] }));
    setTimeout(() => get().saveToStorage(), 0);
    return id;
  },
  
  updateTag: (id, tag) => {
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...tag } : t)),
    }));
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  deleteTag: (id) => {
    const deleteTagRecursive = (tagId: string, tags: Tag[]): Tag[] => {
      const childTags = tags.filter((t) => t.parentId === tagId);
      let remainingTags = tags.filter((t) => t.id !== tagId);
      for (const child of childTags) {
        remainingTags = deleteTagRecursive(child.id, remainingTags);
      }
      return remainingTags;
    };

    set((state) => {
      const remainingTags = deleteTagRecursive(id, state.tags);
      const deletedTagIds = state.tags
        .filter((t) => !remainingTags.some((rt) => rt.id === t.id))
        .map((t) => t.id);

      return {
        tags: remainingTags,
        clickActions: state.clickActions.map((a) => ({
          ...a,
          tagIds: a.tagIds.filter((tid) => !deletedTagIds.includes(tid)),
        })),
      };
    });
    setTimeout(() => get().saveToStorage(), 0);
  },

  reorderCategories: (fromIndex, toIndex) => {
    set((state) => {
      const sortedCategories = [...state.categories].sort((a, b) => a.order - b.order);
      const [movedItem] = sortedCategories.splice(fromIndex, 1);
      sortedCategories.splice(toIndex, 0, movedItem);
      const updatedCategories = sortedCategories.map((cat, index) => ({
        ...cat,
        order: index,
      }));
      return { categories: updatedCategories };
    });
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },

  reorderTags: (fromIndex, toIndex) => {
    set((state) => {
      const sortedTags = [...state.tags].sort((a, b) => a.order - b.order);
      const [movedItem] = sortedTags.splice(fromIndex, 1);
      sortedTags.splice(toIndex, 0, movedItem);
      const updatedTags = sortedTags.map((tag, index) => ({
        ...tag,
        order: index,
      }));
      return { tags: updatedTags };
    });
    setTimeout(() => get().saveToStorage(), 0);
  },

  reorderActions: (fromIndex, toIndex) => {
    set((state) => {
      const sortedActions = [...state.clickActions].sort((a, b) => a.order - b.order);
      const [movedItem] = sortedActions.splice(fromIndex, 1);
      sortedActions.splice(toIndex, 0, movedItem);
      const updatedActions = sortedActions.map((action, index) => ({
        ...action,
        order: index,
      }));
      return { clickActions: updatedActions };
    });
    setTimeout(async () => {
      await get().saveToStorage();
      await refreshTrayMenu();
    }, 0);
  },

  setSelectedCategory: (id) => {
    set({ selectedCategoryId: id, selectedTagId: null, selectedFilterTagId: null });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  setSelectedTag: (id) => {
    set({ selectedTagId: id, selectedCategoryId: null });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  setSelectedFilterTagId: (id) => {
    set({ selectedFilterTagId: id });
  },
  
  setTagFilterExpanded: (expanded) => {
    set({ tagFilterExpanded: expanded });
  },
  
  setViewMode: (mode) => {
    set({ viewMode: mode });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  setSortField: (field) => {
    set({ sortField: field });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  setSortOrder: (order) => {
    set({ sortOrder: order });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    setTimeout(() => get().saveToStorage(), 0);
  },

  getFilteredActions: () => {
    const { clickActions, selectedCategoryId, selectedTagId, selectedFilterTagId, searchQuery, sortField, sortOrder } = get();
    const filtered = clickActions.filter((action) => {
      if (selectedCategoryId && action.categoryId !== selectedCategoryId) return false;
      if (selectedTagId && !action.tagIds.includes(selectedTagId)) return false;
      if (selectedFilterTagId === 'none' && action.tagIds.length > 0) return false;
      if (selectedFilterTagId && selectedFilterTagId !== 'none' && !action.tagIds.includes(selectedFilterTagId)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          action.name.toLowerCase().includes(query) ||
          action.description.toLowerCase().includes(query)
        );
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'custom':
          comparison = a.order - b.order;
          break;
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'updatedAt':
          comparison = a.updatedAt - b.updatedAt;
          break;
        case 'category': {
          const categoryA = get().categories.find(c => c.id === a.categoryId);
          const categoryB = get().categories.find(c => c.id === b.categoryId);
          comparison = (categoryA?.name || '').localeCompare(categoryB?.name || '');
          break;
        }
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = a.order - b.order;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  },
  
  getTagStats: (tagId) => {
    return get().clickActions.filter((a) => a.tagIds.includes(tagId)).length;
  },
  
  getCategoryStats: (categoryId) => {
    return get().clickActions.filter((a) => a.categoryId === categoryId).length;
  },
  
  getChildTags: (parentId) => {
    return get().tags.filter((t) => t.parentId === parentId);
  },
  
  getTagHierarchy: () => {
    const { tags } = get();
    const result: { tag: Tag; level: number }[] = [];
    
    const addTagWithLevel = (tag: Tag, level: number) => {
      result.push({ tag, level });
      const children = tags
        .filter((t) => t.parentId === tag.id)
        .sort((a, b) => a.order - b.order);
      children.forEach((child) => addTagWithLevel(child, level + 1));
    };
    
    const rootTags = tags
      .filter((t) => t.parentId === null)
      .sort((a, b) => a.order - b.order);
    rootTags.forEach((tag) => addTagWithLevel(tag, 0));
    
    return result;
  },

  initializeStore: async () => {
    set({ isLoading: true });
    try {
      const { appConfig, categories, tags, userData } = await storage.loadAll();
      
      set({
        clickActions: userData.clickActions,
        categories,
        tags,
        viewMode: appConfig.viewMode,
        sidebarCollapsed: appConfig.sidebarCollapsed,
        selectedCategoryId: appConfig.selectedCategoryId,
        selectedTagId: appConfig.selectedTagId,
        searchQuery: appConfig.searchQuery,
        sortField: appConfig.sortField || 'custom',
        sortOrder: appConfig.sortOrder || 'asc',
        isInitialized: true,
      });
      
      await refreshTrayMenu();
    } catch (error) {
      console.error('Failed to initialize store:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveToStorage: async () => {
    const state = get();
    if (!state.isInitialized) {
      console.log('Store not initialized, skipping save');
      return;
    }
    
    try {
      console.log('Saving to storage:', { tags: state.tags.length, categories: state.categories.length });
      await storage.saveAll(
        {
          viewMode: state.viewMode,
          sidebarCollapsed: state.sidebarCollapsed,
          selectedCategoryId: state.selectedCategoryId,
          selectedTagId: state.selectedTagId,
          searchQuery: state.searchQuery,
          sortField: state.sortField,
          sortOrder: state.sortOrder,
        },
        state.categories,
        state.tags,
        { clickActions: state.clickActions }
      );
      console.log('Save successful');
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  },
}));
