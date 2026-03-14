import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ActionList } from './components/ActionList';
import { ActionFormModal } from './components/ActionFormModal';
import { CategoryTagManager } from './components/CategoryTagManager';
import type { ClickAction } from './types';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ClickAction | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<'categories' | 'tags'>('categories');

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
