import React from 'react';
import { 
  LayoutGrid, List, Search, Play, 
  Edit2, Trash2, ExternalLink, Terminal
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { ClickAction } from '../types';

interface ActionListProps {
  onEdit: (action: ClickAction) => void;
}

const getActionIcon = (type: string) => {
  switch (type) {
    case 'open_app': return <ExternalLink size={16} />;
    case 'execute_script': return <Terminal size={16} />;
    default: return <Play size={16} />;
  }
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
  } = useAppStore();

  const filteredActions = getFilteredActions();

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
    incrementExecutionCount(action.id);
    console.log('Executing:', action.action);
  };

  return (
    <div className="action-list-container">
      {/* Toolbar */}
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
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`content ${viewMode}`}>
        {filteredActions.length === 0 ? (
          <div className="empty-state">
            <p>没有找到小程序</p>
            <p className="sub">点击左侧"添加小程序"按钮创建</p>
          </div>
        ) : (
          filteredActions.map((action) => (
            <div key={action.id} className="action-card">
              <div className="card-header">
                <div className="icon-wrapper">
                  {getActionIcon(action.action.type)}
                </div>
                <div className="card-title">
                  <h3>{action.name}</h3>
                  <span className="category">{getCategoryName(action.categoryId)}</span>
                </div>
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
                    onClick={() => {
                      if (confirm('确定要删除这个小程序吗？')) {
                        deleteClickAction(action.id);
                      }
                    }}
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="description">{action.description}</p>
              <div className="card-footer">
                <div className="tags">
                  {action.tagIds.length > 0 ? (
                    getTagNames(action.tagIds)
                  ) : (
                    <span className="no-tags">无标签</span>
                  )}
                </div>
                <div className="stats">
                  <span>执行 {action.executionCount} 次</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
          flex: 1;
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
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          transition: all 0.15s;
        }
        .action-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }
        .icon-wrapper {
          width: 40px;
          height: 40px;
          background: #eff6ff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          flex-shrink: 0;
        }
        .card-title {
          flex: 1;
          min-width: 0;
        }
        .card-title h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card-title .category {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }
        .card-actions {
          display: flex;
          gap: 4px;
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
          padding: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          color: #6b7280;
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
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 12px 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: #9ca3af;
        }
        .tags {
          max-width: 60%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .no-tags {
          color: #d1d5db;
        }
      `}</style>
    </div>
  );
};
