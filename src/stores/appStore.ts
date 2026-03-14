import { create } from 'zustand';
import type { ClickAction, Category, Tag, ViewMode } from '../types';
import { storage } from '../services/storage';

interface AppState {
  clickActions: ClickAction[];
  categories: Category[];
  tags: Tag[];
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  sidebarCollapsed: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  setClickActions: (actions: ClickAction[]) => void;
  addClickAction: (action: Omit<ClickAction, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>) => void;
  updateClickAction: (id: string, action: Partial<ClickAction>) => void;
  deleteClickAction: (id: string) => void;
  incrementExecutionCount: (id: string) => void;
  
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Omit<Tag, 'id' | 'createdAt'>) => void;
  updateTag: (id: string, tag: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  reorderCategories: (fromIndex: number, toIndex: number) => void;
  reorderTags: (fromIndex: number, toIndex: number) => void;
  
  setSelectedCategory: (id: string | null) => void;
  setSelectedTag: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  clickActions: [],
  categories: [],
  tags: [],
  selectedCategoryId: null,
  selectedTagId: null,
  viewMode: 'grid',
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
    };
    set((state) => ({ clickActions: [...state.clickActions, newAction] }));
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  updateClickAction: (id, action) => {
    set((state) => ({
      clickActions: state.clickActions.map((a) =>
        a.id === id ? { ...a, ...action, updatedAt: Date.now() } : a
      ),
    }));
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  deleteClickAction: (id) => {
    set((state) => ({
      clickActions: state.clickActions.filter((a) => a.id !== id),
    }));
    setTimeout(() => get().saveToStorage(), 0);
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
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  addCategory: (category) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
      createdAt: Date.now(),
      order: category.order ?? get().categories.length,
    };
    set((state) => ({ categories: [...state.categories, newCategory] }));
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  updateCategory: (id, category) => {
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...category } : c
      ),
    }));
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
      clickActions: state.clickActions.filter((a) => a.categoryId !== id),
    }));
    setTimeout(() => get().saveToStorage(), 0);
  },

  setTags: (tags) => {
    set({ tags });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  addTag: (tag) => {
    const newTag: Tag = {
      ...tag,
      id: generateId(),
      createdAt: Date.now(),
      order: tag.order ?? get().tags.filter(t => t.parentId === tag.parentId).length,
    };
    set((state) => ({ tags: [...state.tags, newTag] }));
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  updateTag: (id, tag) => {
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...tag } : t)),
    }));
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  deleteTag: (id) => {
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
      clickActions: state.clickActions.map((a) => ({
        ...a,
        tagIds: a.tagIds.filter((tid) => tid !== id),
      })),
    }));
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
    setTimeout(() => get().saveToStorage(), 0);
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

  setSelectedCategory: (id) => {
    set({ selectedCategoryId: id, selectedTagId: null });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  setSelectedTag: (id) => {
    set({ selectedTagId: id, selectedCategoryId: null });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  setViewMode: (mode) => {
    set({ viewMode: mode });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    setTimeout(() => get().saveToStorage(), 0);
  },
  
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    setTimeout(() => get().saveToStorage(), 0);
  },

  getFilteredActions: () => {
    const { clickActions, selectedCategoryId, selectedTagId, searchQuery } = get();
    return clickActions.filter((action) => {
      if (selectedCategoryId && action.categoryId !== selectedCategoryId) return false;
      if (selectedTagId && !action.tagIds.includes(selectedTagId)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          action.name.toLowerCase().includes(query) ||
          action.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
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
        isInitialized: true,
      });
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
