import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { ClickAction } from '../types';

interface ActionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editAction?: ClickAction | null;
}

export const ActionFormModal: React.FC<ActionFormModalProps> = ({
  isOpen,
  onClose,
  editAction,
}) => {
  const { categories, tags, addClickAction, updateClickAction } = useAppStore();
  
  const [formData, setFormData] = useState<{
    name: string;
    actionType: 'open_app' | 'execute_script' | 'other';
    actionValue: string;
    icon: string;
    categoryId: string;
    tagIds: string[];
    description: string;
    displayInGallery: boolean;
    displayInMenu: boolean;
    displayInCLI: boolean;
  }>({
    name: '',
    actionType: 'open_app',
    actionValue: '',
    icon: '',
    categoryId: categories[0]?.id || '',
    tagIds: [],
    description: '',
    displayInGallery: true,
    displayInMenu: true,
    displayInCLI: true,
  });

  useEffect(() => {
    if (editAction) {
      setFormData({
        name: editAction.name,
        actionType: editAction.action.type,
        actionValue: editAction.action.value,
        icon: editAction.icon || '',
        categoryId: editAction.categoryId,
        tagIds: editAction.tagIds,
        description: editAction.description,
        displayInGallery: editAction.displayInGallery,
        displayInMenu: editAction.displayInMenu,
        displayInCLI: editAction.displayInCLI,
      });
    } else {
      setFormData({
        name: '',
        actionType: 'open_app',
        actionValue: '',
        icon: '',
        categoryId: categories[0]?.id || '',
        tagIds: [],
        description: '',
        displayInGallery: true,
        displayInMenu: true,
        displayInCLI: true,
      });
    }
  }, [editAction, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const actionData = {
      name: formData.name,
      action: {
        type: formData.actionType,
        value: formData.actionValue,
      },
      icon: formData.icon || null,
      categoryId: formData.categoryId,
      tagIds: formData.tagIds,
      description: formData.description,
      displayInGallery: formData.displayInGallery,
      displayInMenu: formData.displayInMenu,
      displayInCLI: formData.displayInCLI,
    };

    if (editAction) {
      updateClickAction(editAction.id, actionData);
    } else {
      addClickAction(actionData);
    }
    
    onClose();
  };

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editAction ? '编辑小程序' : '添加小程序1'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：打开 VS Code"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>动作类型 *</label>
              <select
                value={formData.actionType}
                onChange={(e) => setFormData({ ...formData, actionType: e.target.value as any })}
              >
                <option value="open_app">打开应用程序</option>
                <option value="execute_script">执行脚本</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div className="form-group flex-1">
              <label>
                {formData.actionType === 'open_app' && '应用名称/路径 *'}
                {formData.actionType === 'execute_script' && '脚本命令 *'}
                {formData.actionType === 'other' && '动作值 *'}
              </label>
              <input
                type="text"
                value={formData.actionValue}
                onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                placeholder={
                  formData.actionType === 'open_app' ? 'Visual Studio Code' :
                  formData.actionType === 'execute_script' ? 'echo "Hello World"' :
                  '输入动作值'
                }
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>类别 *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group flex-1">
              <label>图标（可选）</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="emoji 或图标名称"
              />
            </div>
          </div>

          <div className="form-group">
            <label>标签</label>
            <div className="tags-selector">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-option ${formData.tagIds.includes(tag.id) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    borderColor: tag.color,
                    backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : 'transparent',
                    color: formData.tagIds.includes(tag.id) ? '#fff' : tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="简短描述这个小程序的功能..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>展示位置</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.displayInGallery}
                  onChange={(e) => setFormData({ ...formData, displayInGallery: e.target.checked })}
                />
                <span>在 Gallery 展示</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.displayInMenu}
                  onChange={(e) => setFormData({ ...formData, displayInMenu: e.target.checked })}
                />
                <span>在下拉菜单展示</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.displayInCLI}
                  onChange={(e) => setFormData({ ...formData, displayInCLI: e.target.checked })}
                />
                <span>在命令行列出</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              {editAction ? '保存' : '添加'}
            </button>
          </div>
        </form>
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
          width: 90%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: #6b7280;
        }
        .close-btn:hover {
          background: #f3f4f6;
        }
        form {
          padding: 24px;
          box-sizing: border-box;
        }
        .form-group {
          margin-bottom: 20px;
          min-width: 0;
        }
        .form-row {
          display: flex;
          gap: 16px;
          min-width: 0;
        }
        .form-row .form-group:first-child {
          flex-shrink: 0;
          min-width: 140px;
        }
        .flex-1 {
          flex: 1;
          min-width: 0;
        }
        label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }
        input, select, textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          color: #374151;
          background: #ffffff;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        textarea {
          resize: vertical;
          font-family: inherit;
        }
        .tags-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }
        .tag-option {
          padding: 6px 12px;
          border: 1.5px solid;
          border-radius: 16px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          background: transparent;
        }
        .tag-option:hover {
          opacity: 0.8;
        }
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 400;
          color: #374151;
          cursor: pointer;
          margin: 0;
          min-width: 0;
        }
        .checkbox-label input {
          width: auto;
          margin: 0;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          margin-top: 24px;
        }
        .btn-secondary, .btn-primary {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-secondary {
          background: #f3f4f6;
          border: none;
          color: #374151;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        .btn-primary {
          background: #2563eb;
          border: none;
          color: #ffffff;
        }
        .btn-primary:hover {
          background: #1d4ed8;
        }
      `}</style>
    </div>
  );
};
