import React, { useState } from 'react';
import { 
  Folder, Tag, ChevronRight, ChevronDown, Plus, 
  Menu, ArrowLeftToLine, Settings
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
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
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarProps {
  onAddClick: () => void;
  onManageClick?: (tab: 'categories' | 'tags') => void;
  onSettingsClick?: () => void;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ onAddClick, onManageClick, onSettingsClick }) => {
  const {
    categories,
    tags,
    selectedCategoryId,
    selectedTagId,
    sidebarCollapsed,
    setSelectedCategory,
    setSelectedTag,
    toggleSidebar,
    getCategoryStats,
    getTagStats,
    getTagHierarchy,
    reorderCategories,
    reorderTags,
  } = useAppStore();

  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const tagHierarchy = getTagHierarchy();
  const allTags = tags;

  const isTagVisible = (tagId: string): boolean => {
    const tag = allTags.find((t) => t.id === tagId);
    if (!tag || !tag.parentId) return true;
    if (!expandedTags.has(tag.parentId)) return false;
    return isTagVisible(tag.parentId);
  };

  const visibleTagHierarchy = tagHierarchy.filter(({ tag }) => isTagVisible(tag.id));

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

  const toggleTagExpand = (tagId: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
      const oldIndex = sortedCategories.findIndex((c) => c.id === active.id);
      const newIndex = sortedCategories.findIndex((c) => c.id === over.id);
      reorderCategories(oldIndex, newIndex);
    }
  };

  const handleTagDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sortedTags = [...tags].sort((a, b) => a.order - b.order);
      const oldIndex = sortedTags.findIndex((t) => t.id === active.id);
      const newIndex = sortedTags.findIndex((t) => t.id === over.id);
      reorderTags(oldIndex, newIndex);
    }
  };

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  if (sidebarCollapsed) {
    return (
      <div className="sidebar-collapsed">
        <button className="toggle-btn" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="app-title">ClickPad</h2>
        <div className="header-actions">
          {onSettingsClick && (
            <button className="settings-btn" onClick={onSettingsClick} title="设置">
              <Settings size={18} />
            </button>
          )}
          <button className="toggle-btn" onClick={toggleSidebar}>
            <ArrowLeftToLine size={20} />
          </button>
        </div>
      </div>

      <div className="sidebar-content">
        {/* Categories Section */}
        <div className="section">
          <div className="section-header">
            <Folder size={16} />
            <span>类别</span>
            {onManageClick && (
              <button
                className="manage-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick('categories');
                }}
                title="管理分类"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={sortedCategories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="section-items">
                <div
                  className={`item ${!selectedCategoryId && !selectedTagId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedTag(null);
                  }}
                >
                  <span style={{ width: '3px' }}></span>
                  <span>全部</span>
                </div>
                {sortedCategories.map((category) => (
                  <SortableItem key={category.id} id={category.id}>
                    <div
                      className={`item sortable-item ${selectedCategoryId === category.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <span className="drag-indicator" />
                      <span className="item-name">{category.name}</span>
                      <span className="count">{getCategoryStats(category.id)}</span>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Tags Section */}
        <div className="section">
          <div className="section-header">
            <Tag size={16} />
            <span>标签</span>
            {onManageClick && (
              <button
                className="manage-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick('tags');
                }}
                title="管理标签"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTagDragEnd}
          >
            <SortableContext
              items={visibleTagHierarchy.map(({ tag }) => tag.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="section-items">
                {visibleTagHierarchy.map(({ tag, level }) => {
                  const hasChildren = tags.some((t) => t.parentId === tag.id);
                  const isExpanded = expandedTags.has(tag.id);
                  
                  return (
                    <SortableItem key={tag.id} id={tag.id}>
                      <div
                        className={`item sortable-item tag-item ${selectedTagId === tag.id ? 'active' : ''}`}
                        style={{ paddingLeft: `${16 + level * 16}px` }}
                        onClick={() => setSelectedTag(tag.id)}
                        onDoubleClick={() => hasChildren && toggleTagExpand(tag.id)}
                      >
                        <span className="drag-indicator" />
                        <span
                          className="tag-dot"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="item-name">{tag.name}</span>
                        {hasChildren && (
                          <span
                            className="expand-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTagExpand(tag.id);
                            }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        )}
                        <span className="count">{getTagStats(tag.id)}</span>
                      </div>
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="add-btn" onClick={onAddClick}>
          <Plus size={16} />
          <span>添加小程序</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: 260px;
          height: 100%;
          background: var(--bg-primary);
          border-right: 1px solid var(--border-primary);
          display: flex;
          flex-direction: column;
        }
        .sidebar-collapsed {
          width: 48px;
          height: 100%;
          background: var(--bg-primary);
          border-right: 1px solid var(--border-primary);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 12px;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border-primary);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .settings-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          color: var(--text-tertiary);
          transition: all 0.15s;
        }
        .settings-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        .app-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: var(--text-tertiary);
        }
        .toggle-btn:hover {
          background: var(--bg-tertiary);
        }
        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        .section {
          margin-bottom: 16px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          position: relative;
        }
        .manage-btn {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .section:hover .manage-btn {
          opacity: 1;
        }
        .manage-btn:hover {
          background: var(--bg-hover);
          color: var(--text-secondary);
        }
        .section-items {
          display: flex;
          flex-direction: column;
        }
        .item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-secondary);
          transition: all 0.15s;
        }
        .item:hover {
          background: var(--bg-tertiary);
        }
        .item.active {
          background: var(--accent-bg);
          color: var(--accent-primary);
        }
        .sortable-item {
          cursor: grab;
          user-select: none;
        }
        .sortable-item:active {
          cursor: grabbing;
        }
        .drag-indicator {
          width: 2px;
          height: 12px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .sortable-item:hover .drag-indicator,
        .sortable-item:active .drag-indicator {
          opacity: 1;
        }
        .sortable-item .drag-indicator::before,
        .sortable-item .drag-indicator::after {
          content: '';
          display: block;
          height: 2px;
          background: var(--text-muted);
          border-radius: 1px;
          margin: 3px 0;
        }
        .sortable-item.active .drag-indicator::before,
        .sortable-item.active .drag-indicator::after {
          background: var(--accent-secondary);
        }
        .item-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tag-item {
          position: relative;
        }
        .expand-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 2px;
          border-radius: 3px;
        }
        .expand-icon:hover {
          background: var(--bg-hover);
        }
        .tag-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .count {
          margin-left: auto;
          font-size: 12px;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 10px;
        }
        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border-primary);
        }
        .add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .add-btn:hover {
          background: var(--accent-secondary);
        }
      `}</style>
    </div>
  );
};