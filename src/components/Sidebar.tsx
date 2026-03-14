import React, { useState } from 'react';
import { 
  Folder, Tag, ChevronRight, ChevronDown, Plus, 
  Menu, X
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';

interface SidebarProps {
  onAddClick: () => void;
  onManageClick?: (tab: 'categories' | 'tags') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAddClick, onManageClick }) => {
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
  } = useAppStore();

  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const tagHierarchy = getTagHierarchy();

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
        <h2 className="app-title">FastClickApp</h2>
        <button className="toggle-btn" onClick={toggleSidebar}>
          <X size={20} />
        </button>
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
          <div className="section-items">
            <div
              className={`item ${!selectedCategoryId && !selectedTagId ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(null);
                setSelectedTag(null);
              }}
            >
              <span>全部</span>
            </div>
            {categories.map((category) => (
              <div
                key={category.id}
                className={`item ${selectedCategoryId === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span>{category.name}</span>
                <span className="count">{getCategoryStats(category.id)}</span>
              </div>
            ))}
          </div>
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
          <div className="section-items">
            {tagHierarchy.map(({ tag, level }) => {
              const hasChildren = tags.some((t) => t.parentId === tag.id);
              const isExpanded = expandedTags.has(tag.id);
              
              return (
                <div
                  key={tag.id}
                  className={`item tag-item ${selectedTagId === tag.id ? 'active' : ''}`}
                  style={{ paddingLeft: `${16 + level * 16}px` }}
                  onClick={() => setSelectedTag(tag.id)}
                >
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
                  <span 
                    className="tag-dot"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                  <span className="count">{getTagStats(tag.id)}</span>
                </div>
              );
            })}
          </div>
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
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
        }
        .sidebar-collapsed {
          width: 48px;
          height: 100%;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
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
          border-bottom: 1px solid #e5e7eb;
        }
        .app-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        .toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: #6b7280;
        }
        .toggle-btn:hover {
          background: #f3f4f6;
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
          color: #6b7280;
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
          color: #9ca3af;
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
          background: #e5e7eb;
          color: #374151;
        }
        .section-items {
          display: flex;
          flex-direction: column;
        }
        .item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #374151;
          transition: all 0.15s;
        }
        .item:hover {
          background: #f3f4f6;
        }
        .item.active {
          background: #eff6ff;
          color: #2563eb;
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
          background: #e5e7eb;
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
          color: #9ca3af;
          background: #f3f4f6;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
        }
        .add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .add-btn:hover {
          background: #1d4ed8;
        }
      `}</style>
    </div>
  );
};
