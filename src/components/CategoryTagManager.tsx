import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Folder, Tag, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { Category, Tag as TagType } from '../types';

type TabType = 'categories' | 'tags';
type ModalMode = 'list' | 'form' | 'delete';

interface CategoryTagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabType;
}

interface FormState {
  id: string | null;
  name: string;
  description: string;
  icon: string;
  color: string;
  parentId: string | null;
}

const defaultForm: FormState = {
  id: null,
  name: '',
  description: '',
  icon: '',
  color: '#3b82f6',
  parentId: null,
};

const presetColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#d946ef',
];

const presetIcons = [
  'folder', 'tag', 'rocket', 'terminal', 'zap', 'code',
  'trash', 'settings', 'heart', 'star', 'mail', 'calendar',
];

export const CategoryTagManager: React.FC<CategoryTagManagerProps> = ({
  isOpen,
  onClose,
  initialTab = 'categories',
}) => {
  const {
    categories,
    tags,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    updateTag,
    deleteTag,
    getTagHierarchy,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [modalMode, setModalMode] = useState<ModalMode>('list');
  const [formData, setFormData] = useState<FormState>(defaultForm);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<Category | TagType | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setModalMode('list');
      setFormData(defaultForm);
      setItemToDelete(null);
    }
  }, [isOpen, initialTab]);

  const handleAdd = () => {
    setFormData(defaultForm);
    setModalMode('form');
  };

  const handleEditCategory = (category: Category) => {
    setFormData({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon || 'folder',
      color: '#3b82f6',
      parentId: null,
    });
    setModalMode('form');
  };

  const handleEditTag = (tag: TagType) => {
    setFormData({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      icon: 'tag',
      color: tag.color,
      parentId: tag.parentId,
    });
    setModalMode('form');
  };

  const handleDeleteClick = (item: Category | TagType) => {
    setItemToDelete(item);
    setModalMode('delete');
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    if (activeTab === 'categories') {
      deleteCategory(itemToDelete.id);
    } else {
      deleteTag(itemToDelete.id);
    }
    setModalMode('list');
    setItemToDelete(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'categories') {
      const data = {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
      };
      
      if (formData.id) {
        updateCategory(formData.id, data);
      } else {
        addCategory({ ...data, order: categories.length });
      }
    } else {
      const data = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        parentId: formData.parentId,
      };
      
      if (formData.id) {
        updateTag(formData.id, data);
      } else {
        addTag({ ...data, order: tags.filter(t => t.parentId === formData.parentId).length });
      }
    }
    
    setModalMode('list');
    setFormData(defaultForm);
  };

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

  const renderCategoryList = () => (
    <div className="item-list">
      {categories.length === 0 ? (
        <div className="empty-state">
          <Folder size={48} className="empty-icon" />
          <p>暂无分类</p>
          <button className="btn-primary" onClick={handleAdd}>
            创建分类
          </button>
        </div>
      ) : (
        categories.map((category) => (
          <div key={category.id} className="list-item">
            <div className="item-info">
              {/* <span className="item-icon">{category.icon}</span> */}
              <Folder size={16} />
              <div className="item-details">
                <span className="item-name">{category.name}</span>
                <span className="item-desc">{category.description}</span>
              </div>
            </div>
            <div className="item-actions">
              <button
                className="action-btn"
                onClick={() => handleEditCategory(category)}
                title="编辑"
              >
                <Edit2 size={16} />
              </button>
              <button
                className="action-btn danger"
                onClick={() => handleDeleteClick(category)}
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderTagList = () => {
    const tagHierarchy = getTagHierarchy();
    
    const isTagVisible = (tagId: string): boolean => {
      const tag = tags.find((t) => t.id === tagId);
      if (!tag || !tag.parentId) return true;
      if (!expandedTags.has(tag.parentId)) return false;
      return isTagVisible(tag.parentId);
    };

    const visibleTagHierarchy = tagHierarchy.filter(({ tag }) => isTagVisible(tag.id));
    
    return (
      <div className="item-list">
        {tags.length === 0 ? (
          <div className="empty-state">
            <Tag size={48} className="empty-icon" />
            <p>暂无标签</p>
            <button className="btn-primary" onClick={handleAdd}>
              创建标签
            </button>
          </div>
        ) : (
          visibleTagHierarchy.map(({ tag, level }) => {
            const hasChildren = tags.some((t) => t.parentId === tag.id);
            const isExpanded = expandedTags.has(tag.id);
            
            return (
              <div
                key={tag.id}
                className="list-item tag-item"
                style={{ paddingLeft: `${12 + level * 20}px` }}
              >
                <div 
                  className="item-info"
                  onDoubleClick={() => hasChildren && toggleTagExpand(tag.id)}
                >
                  {hasChildren && (
                    <button
                      className="expand-btn"
                      onClick={() => toggleTagExpand(tag.id)}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                  {!hasChildren && <span className="expand-placeholder" />}
                  <span
                    className="tag-color-dot"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="item-details">
                    <span className="item-name">{tag.name}</span>
                    <span className="item-desc">{tag.description}</span>
                  </div>
                </div>
                <div className="item-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleEditTag(tag)}
                    title="编辑"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="action-btn danger"
                    onClick={() => handleDeleteClick(tag)}
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-group">
        <label>名称 *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={activeTab === 'categories' ? '例如：工作工具' : '例如：开发'}
          required
        />
      </div>

      <div className="form-group">
        <label>描述</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="简短描述..."
        />
      </div>

      {activeTab === 'categories' && false && (
        <div className="form-group">
          <label>图标</label>
          <div className="icon-selector">
            {presetIcons.map((icon) => (
              <button
                key={icon}
                type="button"
                className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, icon })}
              >
                {icon}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            placeholder="或输入自定义图标/emoji"
            className="icon-input"
          />
        </div>
      )}

      {activeTab === 'tags' && (
        <>
          <div className="form-group">
            <label>颜色</label>
            <div className="color-selector">
              {presetColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="color-picker"
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label>父标签（可选）</label>
            <select
              value={formData.parentId || ''}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
            >
              <option value="">无（作为顶级标签）</option>
              {tags
                .filter((t) => t.id !== formData.id)
                .map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
            </select>
          </div>
        </>
      )}

      <div className="form-footer">
        <button type="button" className="btn-secondary" onClick={() => setModalMode('list')}>
          取消
        </button>
        <button type="submit" className="btn-primary">
          {formData.id ? '保存' : '创建'}
        </button>
      </div>
    </form>
  );

  const renderDeleteConfirm = () => (
    <div className="delete-confirm">
      <div className="delete-icon">
        <Trash2 size={48} />
      </div>
      <h3>确认删除?</h3>
      <p>
        您确定要删除 "{itemToDelete?.name}" 吗？
        {activeTab === 'categories' && ' 相关的小程序将被移除此分类。'}
        {activeTab === 'tags' && ' 此标签将从所有相关小程序中移除。'}
      </p>
      <div className="form-footer">
        <button className="btn-secondary" onClick={() => setModalMode('list')}>
          取消
        </button>
        <button className="btn-danger" onClick={confirmDelete}>
          删除
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => null}>
      <div className="modal-content manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>管理{activeTab === 'categories' ? '分类' : '标签'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {modalMode === 'list' && (
          <>
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                <Folder size={16} />
                <span>分类</span>
              </button>
              <button
                className={`tab ${activeTab === 'tags' ? 'active' : ''}`}
                onClick={() => setActiveTab('tags')}
              >
                <Tag size={16} />
                <span>标签</span>
              </button>
            </div>

            <div className="modal-body">
              {activeTab === 'categories' ? renderCategoryList() : renderTagList()}
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={handleAdd}>
                <Plus size={16} />
                <span>添加{activeTab === 'categories' ? '分类' : '标签'}</span>
              </button>
            </div>
          </>
        )}

        {modalMode === 'form' && renderForm()}
        {modalMode === 'delete' && renderDeleteConfirm()}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .manager-modal {
          width: 90%;
          max-width: 520px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 600;
          color: #111827;
        }
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .close-btn:hover {
          background: #f3f4f6;
        }
        .tabs {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #6b7280;
          transition: all 0.15s;
        }
        .tab:hover {
          background: #e5e7eb;
          color: #374151;
        }
        .tab.active {
          background: #ffffff;
          color: #2563eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          max-height: 400px;
        }
        .item-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-radius: 8px;
          transition: background 0.15s;
        }
        .list-item:hover {
          background: #f3f4f6;
        }
        .tag-item {
          position: relative;
        }
        .item-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .item-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e5e7eb;
          border-radius: 6px;
          font-size: 16px;
        }
        .tag-color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .item-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .item-name {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-desc {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .list-item:hover .item-actions {
          opacity: 1;
        }
        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }
        .action-btn.danger:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        .expand-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          color: #9ca3af;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .expand-btn:hover {
          background: #e5e7eb;
          color: #6b7280;
        }
        .expand-placeholder {
          width: 18px;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          color: #9ca3af;
          text-align: center;
        }
        .empty-icon {
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .empty-state p {
          margin: 0 0 16px;
          font-size: 14px;
        }
        .modal-footer {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
        }
        .modal-form {
          padding: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }
        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          color: #374151;
          background: #ffffff;
          transition: all 0.15s;
        }
        .form-group input {
          width: calc(100% - 24px);
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .icon-selector {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }
        .icon-option {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.15s;
        }
        .icon-option:hover {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .icon-option.selected {
          border-color: #2563eb;
          background: #eff6ff;
          color: #2563eb;
        }
        .color-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
        }
        .color-option {
          aspect-ratio: 1;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.15s;
          position: relative;
          flex: 1;
        }
        .color-option:hover {
          transform: scale(1.1);
        }
        .color-option.selected::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 14px;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .color-picker {
          width: 100%;
          height: 40px;
          padding: 4px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
        }
        .form-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        .btn-secondary,
        .btn-primary,
        .btn-danger {
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        .btn-primary {
          background: #2563eb;
          color: #ffffff;
        }
        .btn-primary:hover {
          background: #1d4ed8;
        }
        .btn-danger {
          background: #dc2626;
          color: #ffffff;
        }
        .btn-danger:hover {
          background: #b91c1c;
        }
        .delete-confirm {
          padding: 32px 24px;
          text-align: center;
        }
        .delete-icon {
          color: #dc2626;
          margin-bottom: 16px;
        }
        .delete-confirm h3 {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        .delete-confirm p {
          margin: 0 0 24px;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};
