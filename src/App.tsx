import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ActionList } from './components/ActionList';
import { ActionFormModal } from './components/ActionFormModal';
import { CategoryTagManager } from './components/CategoryTagManager';
import { useAppStore } from './stores/appStore';
import type { ClickAction } from './types';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ClickAction | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<'categories' | 'tags'>('categories');
  
  const initializeStore = useAppStore((state) => state.initializeStore);
  const isLoading = useAppStore((state) => state.isLoading);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const handleAddClick = () => {
    setEditingAction(null);
    setIsModalOpen(true);
  };

  const handleEdit = (action: ClickAction) => {
    setEditingAction(action);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAction(null);
  };

  const handleManageClick = (tab: 'categories' | 'tags') => {
    setManagerTab(tab);
    setIsManagerOpen(true);
  };

  const handleCloseManager = () => {
    setIsManagerOpen(false);
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
            background: #f5f5f5;
          }
          .loading-spinner {
            font-size: 16px;
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar onAddClick={handleAddClick} onManageClick={handleManageClick} />
      <ActionList onEdit={handleEdit} />
      <ActionFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
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
