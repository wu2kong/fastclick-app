import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutGrid, List, Search, Play, 
  Edit2, Trash2, ExternalLink, Terminal, AlertTriangle, GripVertical, LayoutPanelLeft
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { ClickAction } from '../types';
import { ExecuteModal } from './ExecuteModal';
import { readFile } from '@tauri-apps/plugin-fs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActionListProps {
  onEdit: (action: ClickAction) => void;
}

const iconCache = new Map<string, string>();

const ActionIcon: React.FC<{ action: ClickAction; size: number }> = ({ action, size }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const iconValue = action.icon?.value;
  const isFilePath = iconValue && iconValue.startsWith('/');

  useEffect(() => {
    if (!isFilePath || !iconValue) return;

    if (iconCache.has(iconValue)) {
      setBlobUrl(iconCache.get(iconValue)!);
      return;
    }

    let cancelled = false;
    const loadIcon = async () => {
      try {
        const data = await readFile(iconValue);
        const blob = new Blob([data], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        if (!cancelled) {
          iconCache.set(iconValue, url);
          setBlobUrl(url);
        }
      } catch (err) {
        console.error('Failed to load icon:', err);
      }
    };
    loadIcon();
    return () => { cancelled = true; };
  }, [iconValue, isFilePath]);

  if (action.icon?.type === 'emoji') {
    return <span style={{ fontSize: size }}>{action.icon.value}</span>;
  }
  if (action.icon?.type === 'image') {
    const src = isFilePath ? blobUrl : iconValue;
    if (!src) return null;
    return (
      <img 
        src={src} 
        alt="" 
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }
  
  switch (action.action.type) {
    case 'open_app': return <ExternalLink size={size} />;
    case 'execute_script': return <Terminal size={size} />;
    default: return <Play size={size} />;
  }
};

const getActionIcon = (action: ClickAction, size: number = 48) => {
  if (action.icon) {
    if (action.icon.type === 'emoji') {
      return <span style={{ fontSize: size }}>{action.icon.value}</span>;
    }
    if (action.icon.type === 'image') {
      const isFilePath = action.icon.value.startsWith('/');
      if (isFilePath) {
        return <ActionIcon action={action} size={size} />;
      }
      return (
        <img 
          src={action.icon.value} 
          alt="" 
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      );
    }
  }
  
  switch (action.action.type) {
    case 'open_app': return <ExternalLink size={size} />;
    case 'execute_script': return <Terminal size={size} />;
    default: return <Play size={size} />;
  }
};

interface SortableActionCardProps {
  action: ClickAction;
  onEdit: (action: ClickAction) => void;
  onDelete: (action: ClickAction) => void;
  onExecute: (action: ClickAction) => void;
  getCategoryName: (categoryId: string) => string;
  getTagNames: (tagIds: string[]) => string;
}

const SortableActionCard: React.FC<SortableActionCardProps> = ({
  action,
  onEdit,
  onDelete,
  onExecute,
  getCategoryName,
  getTagNames,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="action-card sortable-action-card">
      <div className="card-header">
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
        <div className="icon-wrapper">
          {getActionIcon(action)}
        </div>
        <div className="card-content">
          <div className="card-title-row">
            <h3>{action.name}</h3>
            <div className="card-actions">
              <button
                className="execute-btn"
                onClick={() => onExecute(action)}
                title="执行"
              >
                <Play size={16} />
              </button>
              <button
                className="edit-btn"
                onClick={() => onEdit(action)}
                title="编辑"
              >
                <Edit2 size={16} />
              </button>
              <button
                className="delete-btn"
                onClick={() => onDelete(action)}
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <p className="description">{action.description || <em className="no-desc">无描述</em>}</p>
          <div className="card-meta">
            <span className="category">{getCategoryName(action.categoryId)}</span>
            {action.tagIds.length > 0 && (
              <span className="tags">{getTagNames(action.tagIds)}</span>
            )}
            <span className="stats">执行 {action.executionCount} 次</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ContextMenuProps {
  x: number;
  y: number;
  onExecute: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onExecute, onEdit, onDelete, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      <button onClick={() => { onExecute(); onClose(); }} className="menu-item execute">
        <Play size={14} />
        <span>运行</span>
      </button>
      <button onClick={() => { onEdit(); onClose(); }} className="menu-item edit">
        <Edit2 size={14} />
        <span>编辑</span>
      </button>
      <button onClick={() => { onDelete(); onClose(); }} className="menu-item delete">
        <Trash2 size={14} />
        <span>删除</span>
      </button>
    </div>
  );
};

interface GalleryCardProps {
  action: ClickAction;
  onEdit: (action: ClickAction) => void;
  onDelete: (action: ClickAction) => void;
  onExecute: (action: ClickAction) => void;
}

const GalleryCard: React.FC<GalleryCardProps> = ({
  action,
  onEdit,
  onDelete,
  onExecute,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!contextMenu && e.button === 0) {
      onExecute(action);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="gallery-card"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        {...attributes}
        {...listeners}
      >
        <div className="gallery-icon">
          {getActionIcon(action, 48)}
        </div>
        <div className="gallery-name">{action.name}</div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onExecute={() => onExecute(action)}
          onEdit={() => onEdit(action)}
          onDelete={() => onDelete(action)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};

export const ActionList: React.FC<ActionListProps> = ({ onEdit }) => {
  const {
    viewMode,
    searchQuery,
    setViewMode,
    setSearchQuery,
    getFilteredActions,
    categories,
    tags,
    incrementExecutionCount,
    deleteClickAction,
    selectedCategoryId,
    selectedTagId,
    reorderActions,
  } = useAppStore();

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; action: ClickAction | null }>({
    isOpen: false,
    action: null,
  });

  const [executeModal, setExecuteModal] = useState<{ isOpen: boolean; action: ClickAction | null }>({
    isOpen: false,
    action: null,
  });

  const filteredActions = getFilteredActions();
  const canDragSort = !selectedCategoryId && !selectedTagId;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '未分类';
  };

  const getTagNames = (tagIds: string[]) => {
    return tagIds
      .map((id) => tags.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const handleExecute = (action: ClickAction) => {
    setExecuteModal({ isOpen: true, action });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sortedActions = [...filteredActions].sort((a, b) => a.order - b.order);
      const oldIndex = sortedActions.findIndex((a) => a.id === active.id);
      const newIndex = sortedActions.findIndex((a) => a.id === over.id);
      reorderActions(oldIndex, newIndex);
    }
  };

  const renderActionCard = (action: ClickAction) => {
    if (canDragSort) {
      return (
        <SortableActionCard
          key={action.id}
          action={action}
          onEdit={onEdit}
          onDelete={(a) => setDeleteConfirm({ isOpen: true, action: a })}
          onExecute={handleExecute}
          getCategoryName={getCategoryName}
          getTagNames={getTagNames}
        />
      );
    }

    return (
      <div key={action.id} className="action-card">
        <div className="card-header">
          <div className="icon-wrapper">
            {getActionIcon(action)}
          </div>
          <div className="card-content">
            <div className="card-title-row">
              <h3>{action.name}</h3>
              <div className="card-actions">
                <button
                  className="execute-btn"
                  onClick={() => handleExecute(action)}
                  title="执行"
                >
                  <Play size={16} />
                </button>
                <button
                  className="edit-btn"
                  onClick={() => onEdit(action)}
                  title="编辑"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="delete-btn"
                  onClick={() => setDeleteConfirm({ isOpen: true, action })}
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="description">{action.description || <em className="no-desc">无描述</em>}</p>
            <div className="card-meta">
              <span className="category">{getCategoryName(action.categoryId)}</span>
              {action.tagIds.length > 0 && (
                <span className="tags">{getTagNames(action.tagIds)}</span>
              )}
              <span className="stats">执行 {action.executionCount} 次</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (filteredActions.length === 0) {
      return (
        <div className="empty-state">
          <p>没有找到小程序</p>
          <p className="sub">点击左侧"添加小程序"按钮创建</p>
        </div>
      );
    }

    if (viewMode === 'gallery') {
      if (canDragSort) {
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredActions.map((a) => a.id)}
              strategy={horizontalListSortingStrategy}
            >
              {filteredActions.map((action) => (
                <GalleryCard
                  key={action.id}
                  action={action}
                  onEdit={onEdit}
                  onDelete={(a) => setDeleteConfirm({ isOpen: true, action: a })}
                  onExecute={handleExecute}
                />
              ))}
            </SortableContext>
          </DndContext>
        );
      }
      return filteredActions.map((action) => (
        <GalleryCard
          key={action.id}
          action={action}
          onEdit={onEdit}
          onDelete={(a) => setDeleteConfirm({ isOpen: true, action: a })}
          onExecute={handleExecute}
        />
      ));
    }

    if (canDragSort) {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredActions.map((a) => a.id)}
            strategy={viewMode === 'grid' ? horizontalListSortingStrategy : verticalListSortingStrategy}
          >
            {filteredActions.map(renderActionCard)}
          </SortableContext>
        </DndContext>
      );
    }

    return filteredActions.map(renderActionCard);
  };

  return (
    <div className="action-list-container">
      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="搜索小程序..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="view-toggle">
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </button>
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            <LayoutPanelLeft size={18} />
          </button>
          <button
            className={viewMode === 'gallery' ? 'active' : ''}
            onClick={() => setViewMode('gallery')}
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      <div className={`content ${viewMode}`}>
        {renderContent()}
      </div>

      {deleteConfirm.isOpen && deleteConfirm.action && (
        <div className="delete-modal-overlay" onClick={() => setDeleteConfirm({ isOpen: false, action: null })}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>确认删除</h3>
            <p>确定要删除 "{deleteConfirm.action.name}" 吗？此操作无法撤销。</p>
            <div className="delete-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setDeleteConfirm({ isOpen: false, action: null })}
              >
                取消
              </button>
              <button
                className="btn-delete"
                onClick={() => {
                  deleteClickAction(deleteConfirm.action!.id);
                  setDeleteConfirm({ isOpen: false, action: null });
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <ExecuteModal
        isOpen={executeModal.isOpen}
        action={executeModal.action}
        onClose={() => setExecuteModal({ isOpen: false, action: null })}
        onSuccess={() => {
          if (executeModal.action) {
            incrementExecutionCount(executeModal.action.id);
          }
        }}
      />

      <style>{`
        .action-list-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f9fafb;
        }
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f3f4f6;
          padding: 8px 14px;
          border-radius: 8px;
          width: 320px;
          color: #6b7280;
        }
        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          width: 100%;
          color: #374151;
        }
        .view-toggle {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 6px;
        }
        .view-toggle button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          color: #6b7280;
          transition: all 0.15s;
        }
        .view-toggle button.active {
          background: #ffffff;
          color: #2563eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .view-toggle button:hover:not(.active) {
          color: #374151;
        }
        .content {
          // flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .content.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .content.list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .content.gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
          padding: 16px;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #9ca3af;
        }
        .empty-state p {
          font-size: 16px;
          margin: 0;
        }
        .empty-state .sub {
          font-size: 14px;
          margin-top: 8px;
        }
        .action-card {
          background: #ffffff;
          border-radius: 10px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.15s;
        }
        .action-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px -1px rgba(0,0,0,0.1);
        }
        .sortable-action-card {
          cursor: grab;
        }
        .sortable-action-card:active {
          cursor: grabbing;
        }
        .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d1d5db;
          cursor: grab;
          padding: 4px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .drag-handle:hover {
          color: #9ca3af;
          background: #f3f4f6;
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .icon-wrapper {
          width: 36px;
          height: 36px;
          background: #eff6ff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          flex-shrink: 0;
          padding: 6px;
        }
        .card-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .card-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .card-title-row h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .action-card:hover .card-actions {
          opacity: 1;
        }
        .card-actions button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          color: #9ca3af;
          transition: all 0.15s;
        }
        .card-actions button:hover {
          background: #f3f4f6;
          color: #374151;
        }
        .card-actions .execute-btn:hover {
          background: #dcfce7;
          color: #16a34a;
        }
        .card-actions .delete-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        .description {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-style: italic;
        }
        .no-desc {
          color: #9ca3af;
        }
        .card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
        }
        .category {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .tags {
          color: #9ca3af;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .stats {
          margin-left: auto;
          flex-shrink: 0;
        }
        .delete-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .delete-modal {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          width: 360px;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .delete-modal-icon {
          width: 56px;
          height: 56px;
          background: #fef2f2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: #dc2626;
        }
        .delete-modal h3 {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        .delete-modal p {
          margin: 0 0 24px;
          font-size: 14px;
          color: #6b7280;
        }
        .delete-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .delete-modal-actions button {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-cancel {
          background: #f3f4f6;
          border: none;
          color: #374151;
        }
        .btn-cancel:hover {
          background: #e5e7eb;
        }
        .btn-delete {
          background: #dc2626;
          border: none;
          color: #ffffff;
        }
        .btn-delete:hover {
          background: #b91c1c;
        }
        .gallery-card {
          background: #ffffff;
          border-radius: 10px;
          padding: 16px 12px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.15s;
          min-height: 100px;
        }
        .gallery-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px -1px rgba(0,0,0,0.1);
        }
        .gallery-card:active {
          cursor: grabbing;
        }
        .gallery-icon {
          width: 48px;
          height: 48px;
          background: #eff6ff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
        }
        .gallery-icon svg {
          width: 28px;
          height: 28px;
        }
        .gallery-name {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          text-align: center;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }
        .context-menu {
          position: fixed;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 4px 0;
          z-index: 3000;
          min-width: 120px;
        }
        .context-menu .menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          color: #374151;
          transition: all 0.15s;
        }
        .context-menu .menu-item:hover {
          background: #f3f4f6;
        }
        .context-menu .menu-item.execute:hover {
          background: #dcfce7;
          color: #16a34a;
        }
        .context-menu .menu-item.edit:hover {
          background: #eff6ff;
          color: #2563eb;
        }
        .context-menu .menu-item.delete:hover {
          background: #fee2e2;
          color: #dc2626;
        }
      `}</style>
    </div>
  );
};
