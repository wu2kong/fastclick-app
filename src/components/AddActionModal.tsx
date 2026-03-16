import React from 'react';
import { X, Edit3, Folder } from 'lucide-react';

interface AddActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualCreate: () => void;
  onFromApp: () => void;
}

export const AddActionModal: React.FC<AddActionModalProps> = ({
  isOpen,
  onClose,
  onManualCreate,
  onFromApp,
}) => {
  if (!isOpen) return null;

  const handleManualCreate = () => {
    onManualCreate();
    onClose();
  };

  const handleFromApp = () => {
    onFromApp();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>添加小程序</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <button className="option-btn manual" onClick={handleManualCreate}>
            <div className="option-icon">
              <Edit3 size={24} />
            </div>
            <div className="option-content">
              <h3>手动创建</h3>
              <p>自定义名称、动作和参数</p>
            </div>
          </button>

          <button className="option-btn from-app" onClick={handleFromApp}>
            <div className="option-icon">
              <Folder size={24} />
            </div>
            <div className="option-content">
              <h3>从应用选择</h3>
              <p>自动提取应用信息和图标</p>
            </div>
          </button>
        </div>
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
          background: var(--bg-primary);
          border-radius: 12px;
          width: 90%;
          max-width: 420px;
          box-shadow: var(--shadow-md);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-primary);
        }
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: var(--text-tertiary);
        }
        .close-btn:hover {
          background: var(--bg-tertiary);
        }
        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .option-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border: 2px solid var(--border-primary);
          border-radius: 10px;
          background: var(--bg-primary);
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .option-btn:hover {
          border-color: var(--accent-primary);
          background: var(--bg-secondary);
        }
        .option-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .option-btn.manual .option-icon {
          background: var(--accent-bg);
          color: var(--accent-primary);
        }
        .option-btn.from-app .option-icon {
          background: var(--success-bg);
          color: var(--success-text);
        }
        .option-content h3 {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .option-content p {
          margin: 0;
          font-size: 13px;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};