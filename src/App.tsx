import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Sidebar } from './components/Sidebar';
import { ActionList } from './components/ActionList';
import { ActionFormModal } from './components/ActionFormModal';
import { AddActionModal } from './components/AddActionModal';
import { CategoryTagManager } from './components/CategoryTagManager';
import { Settings } from './components/Settings';
import { useAppStore } from './stores/appStore';
import { useTheme } from './hooks/useTheme';
import type { ClickAction } from './types';

interface AppInfo {
  name: string;
  icon_path: string | null;
  app_path: string;
}

function App() {
  useTheme();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ClickAction | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<'categories' | 'tags'>('categories');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const initializeStore = useAppStore((state) => state.initializeStore);
  const isLoading = useAppStore((state) => state.isLoading);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);

  useEffect(() => {
    initializeStore();
    
    const unlisten = listen<void>('menu-settings-click', () => {
      setIsSettingsOpen(true);
    });
    
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [initializeStore]);

  const handleAddClick = () => {
    setIsAddModalOpen(true);
  };

  const handleManualCreate = () => {
    setEditingAction(null);
    setIsFormModalOpen(true);
  };

  const handleFromApp = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'Applications',
            extensions: ['app', 'exe'],
          },
        ],
        defaultPath: '/Applications',
      });

      if (!selectedPath) {
        return;
      }

      const appInfo = await invoke<AppInfo>('extract_app_info', {
        appPath: selectedPath,
      });

      const categories = useAppStore.getState().categories;
      let launchCategoryId = categories.find(c => c.name === '启动应用')?.id;
      
      if (!launchCategoryId) {
        const newCategory = {
          name: '启动应用',
          description: '快速启动应用程序',
          order: 0,
        };
        useAppStore.getState().addCategory(newCategory);
        launchCategoryId = useAppStore.getState().categories.find(c => c.name === '启动应用')?.id || '';
      }

      const newAction = {
        name: `打开 ${appInfo.name}`,
        action: {
          type: 'open_app' as const,
          value: appInfo.app_path,
        },
        icon: appInfo.icon_path 
          ? { type: 'image' as const, value: appInfo.icon_path }
          : null,
        categoryId: launchCategoryId,
        tagIds: [],
        description: `启动 ${appInfo.name}`,
        displayInGallery: true,
        displayInMenu: true,
        displayInCLI: true,
      };

      useAppStore.getState().addClickAction(newAction);
    } catch (error) {
      console.error('Failed to add app:', error);
      alert(`添加应用失败: ${error}`);
    }
  };

  const handleFromFile = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: false,
      });

      if (!selectedPath) {
        return;
      }

      handleFromFileWithPath(selectedPath as string);
    } catch (error) {
      console.error('Failed to select file:', error);
      alert(`选择文件失败: ${error}`);
    }
  };

  const handleFromFileWithPath = async (path: string) => {
    try {
      const fileName = path.split('/').pop() || path.split('\\').pop() || path;
      const categories = useAppStore.getState().categories;
      let fileCategoryId = categories.find(c => c.name === '打开文件')?.id;
      
      if (!fileCategoryId) {
        const newCategory = {
          name: '打开文件',
          description: '快速打开文件',
          order: 1,
        };
        useAppStore.getState().addCategory(newCategory);
        fileCategoryId = useAppStore.getState().categories.find(c => c.name === '打开文件')?.id || '';
      }

      const newAction = {
        name: `打开 ${fileName}`,
        action: {
          type: 'open_file' as const,
          value: path,
        },
        icon: { type: 'emoji' as const, value: '📄' },
        categoryId: fileCategoryId,
        tagIds: [],
        description: `打开文件: ${fileName}`,
        displayInGallery: true,
        displayInMenu: true,
        displayInCLI: true,
      };

      useAppStore.getState().addClickAction(newAction);
    } catch (error) {
      console.error('Failed to add file:', error);
      alert(`添加文件失败: ${error}`);
    }
  };

  const handleFromDirectoryWithPath = async (path: string) => {
    try {
      const dirName = path.split('/').pop() || path.split('\\').pop() || path;
      const categories = useAppStore.getState().categories;
      let fileCategoryId = categories.find(c => c.name === '打开目录')?.id;
      
      if (!fileCategoryId) {
        const newCategory = {
          name: '打开目录',
          description: '快速打开目录',
          order: 1,
        };
        useAppStore.getState().addCategory(newCategory);
        fileCategoryId = useAppStore.getState().categories.find(c => c.name === '打开目录')?.id || '';
      }

      const newAction = {
        name: `打开 ${dirName}`,
        action: {
          type: 'open_directory' as const,
          value: path,
        },
        icon: { type: 'emoji' as const, value: '📁' },
        categoryId: fileCategoryId,
        tagIds: [],
        description: `打开目录: ${dirName}`,
        displayInGallery: true,
        displayInMenu: true,
        displayInCLI: true,
      };

      useAppStore.getState().addClickAction(newAction);
    } catch (error) {
      console.error('Failed to add directory:', error);
      alert(`添加目录失败: ${error}`);
    }
  };

  const handleFromDirectory = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: true,
      });

      if (!selectedPath) {
        return;
      }

      handleFromDirectoryWithPath(selectedPath as string);
    } catch (error) {
      console.error('Failed to select directory:', error);
      alert(`选择目录失败: ${error}`);
    }
  };

  const handleEdit = (action: ClickAction) => {
    setEditingAction(action);
    setIsFormModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingAction(null);
  };

  const handleManageClick = (tab: 'categories' | 'tags') => {
    setManagerTab(tab);
    setIsManagerOpen(true);
  };

  const handleCloseManager = () => {
    setIsManagerOpen(false);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loading-spinner">加载中...</div>
        <style>{`
          .app.loading {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
          }
          .loading-spinner {
            font-size: 16px;
            color: var(--text-tertiary);
          }
        `}</style>
      </div>
    );
  }

  if (isSettingsOpen) {
    return (
      <div className="app">
        <Settings onBack={() => setIsSettingsOpen(false)} />
        <style>{`
          .app {
            height: 100vh;
            overflow: hidden;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app">
      {!sidebarCollapsed && <Sidebar onAddClick={handleAddClick} onManageClick={handleManageClick} onSettingsClick={handleSettingsClick} />}
      <ActionList onEdit={handleEdit} onAddClick={handleAddClick} onSettingsClick={handleSettingsClick} />
      <AddActionModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onManualCreate={handleManualCreate}
        onFromApp={handleFromApp}
        onFromFile={handleFromFile}
        onFromDirectory={handleFromDirectory}
        onFromFileWithPath={handleFromFileWithPath}
        onFromDirectoryWithPath={handleFromDirectoryWithPath}
      />
      <ActionFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        editAction={editingAction}
      />
      <CategoryTagManager
        isOpen={isManagerOpen}
        onClose={handleCloseManager}
        initialTab={managerTab}
      />

      <style>{`
        .app {
          height: 100vh;
          display: flex;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default App;
