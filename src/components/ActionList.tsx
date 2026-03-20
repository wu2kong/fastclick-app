import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, List, Search, Play, 
  Edit2, Trash2, ExternalLink, Terminal, AlertTriangle, GripVertical, LayoutPanelLeft,
  ArrowDownUp, ArrowUpDown, ArrowDownAZ, ArrowUpZA, Clock, ArrowDownWideNarrow, ArrowUpWideNarrow,
  Menu, Settings, Plus, ChevronDown, ChevronUp, CheckSquare, Square, FolderOpen, Tag
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { ClickAction, SortField } from '../types';
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
  onAddClick?: () => void;
  onSettingsClick?: () => void;
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
  batchMode?: boolean;
  selectedActionIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

const SortableActionCard: React.FC<SortableActionCardProps> = ({
  action,
  onEdit,
  onDelete,
  onExecute,
  getCategoryName,
  getTagNames,
  batchMode,
  selectedActionIds,
  onToggleSelection,
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

  const isSelected = selectedActionIds?.has(action.id);

  return (
    <div ref={setNodeRef} style={style} className={`action-card sortable-action-card ${isSelected ? 'selected' : ''}`} onClick={() => {
      if (batchMode && onToggleSelection) {
        onToggleSelection(action.id);
      } else {
        onExecute(action);
      }
    }}>
      <div className="card-header">
        {batchMode && (
          <div className="batch-checkbox" onClick={(e) => e.stopPropagation()}>
            {isSelected ? <CheckSquare size={20} className="checkbox-icon checked" /> : <Square size={20} className="checkbox-icon" />}
          </div>
        )}
        <div className="drag-handle" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
          <GripVertical size={16} />
        </div>
        <div className="icon-wrapper">
          {getActionIcon(action)}
        </div>
        <div className="card-content">
          <div className="card-title-row" onClick={(e) => e.stopPropagation()}>
            <h3>{action.name}</h3>
            <div className="card-actions">
              <button
                className="execute-btn"
                onClick={(e) => { e.stopPropagation(); onExecute(action); }}
                title="执行"
              >
                <Play size={16} />
              </button>
              <button
                className="edit-btn"
                onClick={(e) => { e.stopPropagation(); onEdit(action); }}
                title="编辑"
              >
                <Edit2 size={16} />
              </button>
              <button
                className="delete-btn"
                onClick={(e) => { e.stopPropagation(); onDelete(action); }}
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
  batchMode?: boolean;
  selectedActionIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

const GalleryCard: React.FC<GalleryCardProps> = ({
  action,
  onEdit,
  onDelete,
  onExecute,
  batchMode,
  selectedActionIds,
  onToggleSelection,
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

  const isSelected = selectedActionIds?.has(action.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (batchMode && onToggleSelection) {
      onToggleSelection(action.id);
    } else if (!contextMenu && e.button === 0) {
      onExecute(action);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`gallery-card ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        {...attributes}
        {...listeners}
      >
        {batchMode && (
          <div className="gallery-checkbox">
            {isSelected ? <CheckSquare size={16} className="checkbox-icon checked" /> : <Square size={16} className="checkbox-icon" />}
          </div>
        )}
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

export const ActionList: React.FC<ActionListProps> = ({ onEdit, onAddClick, onSettingsClick }) => {
  const {
    viewMode,
    searchQuery,
    sortField,
    sortOrder,
    setViewMode,
    setSearchQuery,
    setSortField,
    setSortOrder,
    getFilteredActions,
    categories,
    tags,
    incrementExecutionCount,
    deleteClickAction,
    selectedCategoryId,
    selectedTagId,
    reorderActions,
    sidebarCollapsed,
    toggleSidebar,
    selectedFilterTagId,
    setSelectedFilterTagId,
    tagFilterExpanded,
    setTagFilterExpanded,
    clickActions,
    batchMode,
    selectedActionIds,
    setBatchMode,
    toggleActionSelection,
    selectAllActions,
    invertSelection,
    batchDeleteActions,
    batchUpdateCategory,
    batchAddTags,
  } = useAppStore();

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: false; action: ClickAction | null } | { isOpen: true; action: ClickAction }>({
    isOpen: false,
    action: null,
  });

  const [executeModal, setExecuteModal] = useState<{ isOpen: false; action: ClickAction | null } | { isOpen: true; action: ClickAction }>({
    isOpen: false,
    action: null,
  });

  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');

  const { addTag } = useAppStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortMenu]);

  const filteredActions = getFilteredActions();
  const canDragSort = !selectedCategoryId && !selectedTagId && sortField === 'custom';

  const categoryTagStats = useMemo(() => {
    if (!selectedCategoryId) return [];
    
    const categoryActions = clickActions.filter(a => a.categoryId === selectedCategoryId);
    const tagCounts = new Map<string | 'none', number>();
    
    let noTagCount = 0;
    categoryActions.forEach(action => {
      if (action.tagIds.length === 0) {
        noTagCount++;
      } else {
        action.tagIds.forEach(tagId => {
          tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
        });
      }
    });
    
    const stats = Array.from(tagCounts.entries())
      .map(([tagId, count]) => {
        const tag = tags.find(t => t.id === tagId);
        return tag ? { tagId, tagName: tag.name, count } : null;
      })
      .filter((item): item is { tagId: string; tagName: string; count: number } => item !== null)
      .sort((a, b) => b.count - a.count);
    
    const totalCount = categoryActions.length;
    const result = [{ tagId: null, tagName: '全部', count: totalCount }, ...stats];
    if (noTagCount > 0) {
      result.push({ tagId: 'none', tagName: '无标签', count: noTagCount });
    }
    return result;
  }, [selectedCategoryId, clickActions, tags]);

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

  const getSortIcon = (field: SortField, order: 'asc' | 'desc', size: number = 18) => {
    if (field === 'custom') {
      return order === 'asc' ? <ArrowUpDown size={size} /> : <ArrowDownUp size={size} />;
    } else if (field === 'name') {
      return order === 'asc' ? <ArrowDownAZ size={size} /> : <ArrowUpZA size={size} />;
    } else if (field === 'category') {
      return order === 'asc' ? <ArrowDownWideNarrow size={size} /> : <ArrowUpWideNarrow size={size} />;
    } else {
      return order === 'asc' ? <Clock size={size} /> : <Clock size={size} />;
    }
  };

  const sortFieldOptions: { field: SortField; label: string }[] = [
    { field: 'custom', label: '自定义' },
    { field: 'createdAt', label: '添加时间' },
    { field: 'updatedAt', label: '更新时间' },
    { field: 'category', label: '类别' },
    { field: 'name', label: '名称' },
  ];

  const renderActionCard = (action: ClickAction) => {
    const isSelected = selectedActionIds.has(action.id);

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
          batchMode={batchMode}
          selectedActionIds={selectedActionIds}
          onToggleSelection={toggleActionSelection}
        />
      );
    }

    return (
      <div key={action.id} className={`action-card ${isSelected ? 'selected' : ''}`} onClick={() => {
        if (batchMode) {
          toggleActionSelection(action.id);
        } else {
          handleExecute(action);
        }
      }}>
        <div className="card-header">
          {batchMode && (
            <div className="batch-checkbox" onClick={(e) => e.stopPropagation()}>
              {isSelected ? <CheckSquare size={20} className="checkbox-icon checked" /> : <Square size={20} className="checkbox-icon" />}
            </div>
          )}
          <div className="icon-wrapper">
            {getActionIcon(action)}
          </div>
          <div className="card-content">
            <div className="card-title-row" onClick={(e) => e.stopPropagation()}>
              <h3>{action.name}</h3>
              <div className="card-actions">
                <button
                  className="execute-btn"
                  onClick={(e) => { e.stopPropagation(); handleExecute(action); }}
                  title="执行"
                >
                  <Play size={16} />
                </button>
                <button
                  className="edit-btn"
                  onClick={(e) => { e.stopPropagation(); onEdit(action); }}
                  title="编辑"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, action }); }}
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
      if (canDragSort && !batchMode) {
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
                  batchMode={batchMode}
                  selectedActionIds={selectedActionIds}
                  onToggleSelection={toggleActionSelection}
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
          batchMode={batchMode}
          selectedActionIds={selectedActionIds}
          onToggleSelection={toggleActionSelection}
        />
      ));
    }

    if (canDragSort && !batchMode) {
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
        <div className="toolbar-left">
          {sidebarCollapsed && (
            <>
              <button className="toolbar-icon-btn" onClick={toggleSidebar} title="展开侧边栏">
                <Menu size={18} />
              </button>
              {onSettingsClick && (
                <button className="toolbar-icon-btn" onClick={onSettingsClick} title="设置">
                  <Settings size={18} />
                </button>
              )}
              {onAddClick && (
                <button className="toolbar-icon-btn add-btn-toolbar" onClick={onAddClick} title="添加小程序">
                  <Plus size={18} />
                </button>
              )}
            </>
          )}
        </div>
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="搜索小程序..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-right">
          {!batchMode && (
            <>
              <button
                className="batch-mode-btn"
                onClick={() => setBatchMode(true)}
                title="批量管理"
              >
                <CheckSquare size={18} />
              </button>
              <div className="sort-control" ref={sortMenuRef}>
                <button
                  className="sort-toggle-btn"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  title={`${sortFieldOptions.find(o => o.field === sortField)?.label} - ${sortOrder === 'asc' ? '升序' : '降序'}`}
                >
                  {getSortIcon(sortField, sortOrder)}
                </button>
                {showSortMenu && (
                  <div className="sort-menu">
                    <div className="sort-menu-header">
                      <span>排序方式</span>
                    </div>
                    {sortFieldOptions.map((option) => (
                      <button
                        key={option.field}
                        className={`sort-menu-item ${sortField === option.field ? 'active' : ''}`}
                        onClick={() => {
                          if (sortField === option.field) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField(option.field);
                          }
                          setShowSortMenu(false);
                        }}
                      >
                        <div className="sort-menu-item-content">
                          {getSortIcon(option.field, 'asc', 16)}
                          <span>{option.label}</span>
                        </div>
                        {sortField === option.field && (
                          <span className="check-icon">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="view-toggle">
                <button
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  title="列表视图"
                >
                  <List size={18} />
                </button>
                <button
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  title="网格视图"
                >
                  <LayoutPanelLeft size={18} />
                </button>
                <button
                  className={viewMode === 'gallery' ? 'active' : ''}
                  onClick={() => setViewMode('gallery')}
                  title="画廊视图"
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
              {selectedCategoryId && categoryTagStats.length > 1 && (
                <button
                  className="tag-filter-toggle-btn"
                  onClick={() => setTagFilterExpanded(!tagFilterExpanded)}
                  title={tagFilterExpanded ? '收起标签筛选' : '展开标签筛选'}
                >
                  {tagFilterExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              )}
            </>
          )}
          {batchMode && (
            <div className="batch-mode-controls">
              <span className="batch-count">已选中 {selectedActionIds.size} 个</span>
              <button className="batch-action-btn" onClick={selectAllActions}>全选</button>
              <button className="batch-action-btn" onClick={invertSelection}>反选</button>
              <button className="batch-action-btn cancel" onClick={() => setBatchMode(false)}>取消</button>
            </div>
          )}
        </div>
      </div>

      {selectedCategoryId && tagFilterExpanded && categoryTagStats.length > 1 && (
        <div className="tag-filter-bar">
          <div className="tag-filter-container">
            {categoryTagStats.map(({ tagId, tagName, count }) => (
              <button
                key={tagId || 'all'}
                className={`tag-filter-item ${selectedFilterTagId === tagId ? 'active' : ''}`}
                onClick={() => setSelectedFilterTagId(tagId)}
              >
                <span className="tag-name">{tagName}</span>
                <span className="tag-count">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {batchMode && (
        <div className="batch-operations-bar">
          <div className="batch-operations-left">
            <span className="batch-operations-label">批量操作：</span>
          </div>
          <div className="batch-operations-right">
            <button
              className="batch-operation-btn delete"
              onClick={() => setBatchDeleteConfirm(true)}
              disabled={selectedActionIds.size === 0}
            >
              <Trash2 size={16} />
              <span>批量删除</span>
            </button>
            <button
              className="batch-operation-btn"
              onClick={() => setShowCategoryModal(true)}
              disabled={selectedActionIds.size === 0}
            >
              <FolderOpen size={16} />
              <span>修改分类</span>
            </button>
            <button
              className="batch-operation-btn"
              onClick={() => setShowTagsModal(true)}
              disabled={selectedActionIds.size === 0}
            >
              <Tag size={16} />
              <span>添加标签</span>
            </button>
          </div>
        </div>
      )}

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

      {batchDeleteConfirm && (
        <div className="delete-modal-overlay" onClick={() => setBatchDeleteConfirm(false)}>
          <div className="delete-modal batch-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>确认批量删除</h3>
            <p>确定要删除选中的 {selectedActionIds.size} 个小程序吗？此操作无法撤销。</p>
            <p className="batch-delete-warning">删除后，相关数据将被永久移除，包括：</p>
            <ul className="batch-delete-list">
              <li>小程序配置信息</li>
              <li>执行次数统计数据</li>
              <li>分类和标签关联</li>
            </ul>
            <div className="delete-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setBatchDeleteConfirm(false)}
              >
                取消
              </button>
              <button
                className="btn-delete"
                onClick={() => {
                  batchDeleteActions();
                  setBatchDeleteConfirm(false);
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="delete-modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <h3>修改分类</h3>
            <p>选择要将选中的 {selectedActionIds.size} 个小程序移动到的分类：</p>
            <div className="category-list">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-option ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <div className="delete-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowCategoryModal(false);
                  setSelectedCategory('');
                }}
              >
                取消
              </button>
              <button
                className="btn-delete"
                onClick={() => {
                  if (selectedCategory) {
                    batchUpdateCategory(selectedCategory);
                    setShowCategoryModal(false);
                    setSelectedCategory('');
                  }
                }}
                disabled={!selectedCategory}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {showTagsModal && (
        <div className="delete-modal-overlay" onClick={() => {
          setShowTagsModal(false);
          setSelectedTags([]);
          setNewTagName('');
        }}>
          <div className="tags-modal" onClick={(e) => e.stopPropagation()}>
            <h3>添加标签</h3>
            <p>为选中的 {selectedActionIds.size} 个小程序添加标签：</p>
            <div className="tags-list">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={`tag-option ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag.id) 
                        ? prev.filter(id => id !== tag.id)
                        : [...prev, tag.id]
                    );
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="new-tag-input"
              placeholder="+新标签，按回车添加"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const trimmedName = newTagName.trim();
                  if (trimmedName) {
                    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    const newTagId = addTag({
                      name: trimmedName,
                      parentId: null,
                      description: '',
                      color: randomColor,
                      order: 0,
                    });
                    setSelectedTags(prev => [...prev, newTagId]);
                    setNewTagName('');
                  }
                }
              }}
            />
            <div className="delete-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowTagsModal(false);
                  setSelectedTags([]);
                  setNewTagName('');
                }}
              >
                取消
              </button>
              <button
                className="btn-delete"
                onClick={() => {
                  if (selectedTags.length > 0) {
                    batchAddTags(selectedTags);
                    setShowTagsModal(false);
                    setSelectedTags([]);
                    setNewTagName('');
                  }
                }}
                disabled={selectedTags.length === 0}
              >
                确定
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
          background: var(--bg-primary);
        }
.toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: var(--bg-primary);
          border-bottom: none;
          gap: 16px;
        }
        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 120px;
        }
        .toolbar-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 6px;
          color: var(--text-tertiary);
          transition: all 0.15s;
        }
        .toolbar-icon-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        .toolbar-icon-btn.add-btn-toolbar {
          background: var(--accent-primary);
          color: white;
        }
        .toolbar-icon-btn.add-btn-toolbar:hover {
          background: var(--accent-secondary);
        }
.toolbar-right {
            display: flex;
            align-items: center;
            gap: 12px;
           min-width: 120px;
           justify-content: flex-end;
         }
         .batch-mode-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          color: var(--text-tertiary);
          transition: all 0.15s;
        }
        .batch-mode-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        .batch-mode-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .batch-count {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .batch-action-btn {
          padding: 6px 12px;
          border: 1px solid var(--border-primary);
          background: var(--bg-primary);
          color: var(--text-secondary);
          font-size: 13px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .batch-action-btn:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-secondary);
        }
        .batch-action-btn.cancel {
          background: var(--danger-text);
          color: white;
          border-color: var(--danger-text);
        }
        .batch-action-btn.cancel:hover {
          background: #b91c1c;
        }
         .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-tertiary);
          padding: 12px 14px;
          border-radius: 8px;
          flex: 1;
          max-width: 400px;
          color: var(--text-tertiary);
        }
        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          width: 100%;
          color: var(--text-secondary);
        }
        .sort-control {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sort-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          color: var(--text-tertiary);
          transition: all 0.15s;
        }
        .sort-toggle-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        .sort-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--bg-primary);
          border-radius: 8px;
          box-shadow: var(--shadow-md);
          padding: 4px 0;
          min-width: 160px;
          z-index: 1000;
        }
        .sort-menu-header {
          padding: 8px 12px;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 500;
        }
        .sort-menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-secondary);
          transition: all 0.15s;
        }
        .sort-menu-item:hover {
          background: var(--bg-tertiary);
        }
        .sort-menu-item.active {
          background: var(--accent-bg);
          color: var(--accent-primary);
        }
        .sort-menu-item-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .check-icon {
          color: var(--accent-primary);
          font-weight: 600;
        }
        .view-toggle {
          display: flex;
          gap: 4px;
          background: var(--bg-tertiary);
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
          color: var(--text-tertiary);
          transition: all 0.15s;
        }
        .view-toggle button.active {
          background: var(--bg-primary);
          color: var(--accent-primary);
          box-shadow: var(--shadow-sm);
        }
.view-toggle button:hover:not(.active) {
           color: var(--text-muted);
         }
         .tag-filter-toggle-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           padding: 6px;
           border: none;
           background: transparent;
           cursor: pointer;
           border-radius: 4px;
           color: var(--text-tertiary);
           transition: all 0.15s;
         }
         .tag-filter-toggle-btn:hover {
           background: var(--bg-tertiary);
           color: var(--text-secondary);
         }
         .tag-filter-bar {
           background: var(--bg-primary);
           border-bottom: 1px solid var(--border-primary);
           padding: 10px 24px;
         }
         .tag-filter-container {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: 8px;
           flex-wrap: wrap;
         }
         .tag-filter-item {
           display: flex;
           align-items: center;
           gap: 6px;
           padding: 6px 12px;
           background: var(--bg-tertiary);
           border: 1px solid var(--border-primary);
           border-radius: 16px;
           font-size: 13px;
           color: var(--text-muted);
           cursor: pointer;
           transition: all 0.15s;
         }
         .tag-filter-item:hover {
           background: var(--bg-hover);
           border-color: var(--border-secondary);
         }
         .tag-filter-item.active {
           background: var(--bg-hover);
           border-color: var(--border-secondary);
         }
         .tag-filter-item .tag-name {
           font-weight: 500;
         }
         .tag-filter-item.active .tag-name {
           font-weight: 600;
           color: var(--text-tertiary);
         }
         .tag-filter-item .tag-count {
           font-size: 11px;
           padding: 2px 6px;
           background: var(--bg-muted);
           border-radius: 10px;
           color: var(--text-muted);
         }
         .tag-filter-item.active .tag-count {
           background: var(--bg-tertiary);
           color: var(--text-tertiary);
         }
         .content {
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
          color: var(--text-muted);
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
          background: var(--bg-primary);
          border-radius: 10px;
          padding: 12px;
          border: 1px solid var(--border-primary);
          transition: all 0.15s;
          cursor: pointer;
        }
        .action-card:hover {
          border-color: var(--border-secondary);
          box-shadow: var(--shadow-md);
        }
        .sortable-action-card {
          cursor: pointer;
        }
        .sortable-action-card:active {
          cursor: pointer;
        }
        .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--border-secondary);
          cursor: grab;
          padding: 4px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .drag-handle:hover {
          color: var(--text-muted);
          background: var(--bg-tertiary);
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
          background: var(--accent-bg);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          flex-shrink: 0;
          padding: 9px;
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
          color: var(--text-primary);
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
          color: var(--text-muted);
          transition: all 0.15s;
        }
        .card-actions button:hover {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        .card-actions .execute-btn:hover {
          background: var(--success-bg);
          color: var(--success-text);
        }
        .card-actions .delete-btn:hover {
          background: var(--danger-bg);
          color: var(--danger-text);
        }
        .description {
          font-size: 12px;
          color: var(--text-tertiary);
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-style: italic;
        }
        .no-desc {
          color: var(--text-muted);
        }
        .card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .category {
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .tags {
          color: var(--text-muted);
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
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 24px;
          width: 360px;
          text-align: center;
          box-shadow: var(--shadow-md);
        }
        .delete-modal-icon {
          width: 56px;
          height: 56px;
          background: var(--danger-bg);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: var(--danger-text);
        }
        .delete-modal h3 {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .delete-modal p {
          margin: 0 0 24px;
          font-size: 14px;
          color: var(--text-tertiary);
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
          background: var(--bg-tertiary);
          border: none;
          color: var(--text-secondary);
        }
        .btn-cancel:hover {
          background: var(--bg-hover);
        }
        .btn-delete {
          background: var(--danger-text);
          border: none;
          color: #ffffff;
        }
        .btn-delete:hover {
          background: #b91c1c;
        }
        .gallery-card {
          background: var(--bg-primary);
          border-radius: 10px;
          padding: 14px 12px;
          border: 1px solid var(--border-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.15s;
          // min-height: 100px;
        }
        .gallery-card:hover {
          border-color: var(--border-secondary);
          box-shadow: var(--shadow-md);
        }
        .gallery-card:active {
          cursor: grabbing;
        }
        .gallery-icon {
          width: 48px;
          height: 48px;
          background: var(--accent-bg);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }
        .gallery-icon svg {
          width: 28px;
          height: 28px;
        }
        .gallery-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
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
          background: var(--bg-primary);
          border-radius: 8px;
          box-shadow: var(--shadow-md);
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
          color: var(--text-secondary);
          transition: all 0.15s;
        }
        .context-menu .menu-item:hover {
          background: var(--bg-tertiary);
        }
        .context-menu .menu-item.execute:hover {
          background: var(--success-bg);
          color: var(--success-text);
        }
        .context-menu .menu-item.edit:hover {
          background: var(--accent-bg);
          color: var(--accent-primary);
        }
        .context-menu .menu-item.delete:hover {
          background: var(--danger-bg);
          color: var(--danger-text);
        }
        .batch-operations-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 24px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-primary);
        }
        .batch-operations-left {
          display: flex;
          align-items: center;
        }
        .batch-operations-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .batch-operations-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .batch-operation-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid var(--border-primary);
          background: var(--bg-primary);
          color: var(--text-secondary);
          font-size: 13px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .batch-operation-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--border-secondary);
        }
        .batch-operation-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .batch-operation-btn.delete:hover:not(:disabled) {
          background: var(--danger-bg);
          border-color: var(--danger-text);
          color: var(--danger-text);
        }
        .action-card.selected {
          border-color: var(--accent-primary);
          background: var(--accent-bg);
        }
        .batch-checkbox {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          cursor: pointer;
        }
        .checkbox-icon {
          color: var(--border-secondary);
          transition: color 0.15s;
        }
        .checkbox-icon.checked {
          color: var(--accent-primary);
        }
        .gallery-card.selected {
          border-color: var(--accent-primary);
          background: var(--accent-bg);
        }
        .gallery-checkbox {
          position: absolute;
          top: 4px;
          left: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .batch-delete-modal {
          max-width: 400px;
        }
        .batch-delete-warning {
          font-size: 13px;
          color: var(--text-tertiary);
          margin: 12px 0 8px;
          font-weight: 500;
        }
        .batch-delete-list {
          text-align: left;
          font-size: 12px;
          color: var(--text-muted);
          margin: 0 0 20px;
          padding-left: 20px;
        }
        .batch-delete-list li {
          margin-bottom: 4px;
        }
        .category-modal, .tags-modal {
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 24px;
          width: 360px;
          text-align: center;
          box-shadow: var(--shadow-md);
        }
        .category-modal h3, .tags-modal h3 {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .category-modal p, .tags-modal p {
          margin: 0 0 16px;
          font-size: 14px;
          color: var(--text-tertiary);
        }
        .category-list, .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
          max-height: 200px;
          overflow-y: auto;
        }
        .category-option, .tag-option {
          padding: 8px 16px;
          border: 1px solid var(--border-primary);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-size: 13px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .category-option:hover, .tag-option:hover {
          background: var(--bg-hover);
          border-color: var(--border-secondary);
        }
        .category-option.active, .tag-option.active {
          background: var(--accent-bg);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        .new-tag-input {
          // width: 100%;
          padding: 8px 12px;
          border: 1.5px dashed var(--border-secondary);
          border-radius: 6px;
          font-size: 13px;
          background: transparent;
          color: var(--text-secondary);
          margin-bottom: 20px;
          transition: all 0.15s;
        }
        .new-tag-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }
        .new-tag-input::placeholder {
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};
