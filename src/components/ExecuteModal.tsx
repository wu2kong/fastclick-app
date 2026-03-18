import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, XCircle, Copy, Check, Terminal, ExternalLink, FileText, FolderOpen } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { ClickAction, ExecuteResult } from '../types';

interface ExecuteModalProps {
  isOpen: boolean;
  action: ClickAction | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExecuteModal: React.FC<ExecuteModalProps> = ({
  isOpen,
  action,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'display'>('loading');
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !action) {
      setStatus('loading');
      setResult(null);
      setCopiedField(null);
      return;
    }

    if (action.action.type === 'other') {
      setStatus('display');
      return;
    }

    executeAction();
  }, [isOpen, action]);

  const executeAction = async () => {
    if (!action) return;

    setStatus('loading');
    try {
      const res = await invoke<ExecuteResult>('execute_action', {
        actionType: action.action.type,
        actionValue: action.action.value,
        params: action.action.params || null,
      });
      setResult(res);
      setStatus(res.success ? 'success' : 'error');
      if (res.success) {
        onSuccess();
      }
    } catch (error) {
      setResult({
        success: false,
        message: String(error),
      });
      setStatus('error');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen || !action) return null;

  const isScript = action.action.type === 'execute_script';
  const isOther = action.action.type === 'other';
  const isOpenAction = ['open_app', 'open_file', 'open_directory'].includes(action.action.type);

  const getIcon = () => {
    switch (action.action.type) {
      case 'open_app':
        return <ExternalLink size={20} />;
      case 'open_file':
        return <FileText size={20} />;
      case 'open_directory':
        return <FolderOpen size={20} />;
      case 'execute_script':
        return <Terminal size={20} />;
      default:
        return <Terminal size={20} />;
    }
  };

  return (
    <div className="execute-modal-overlay" onClick={onClose}>
      <div className="execute-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon">
              {getIcon()}
            </div>
            <h3>{action.name}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {isScript && status === 'loading' && (
          <div className="modal-body loading">
            <Loader2 className="spinner" size={32} />
            <p>正在执行脚本...</p>
            <code className="script-preview">{action.action.value}</code>
          </div>
        )}

        {isScript && (status === 'success' || status === 'error') && (
          <div className="modal-body result">
            <div className={`status-indicator ${status}`}>
              {status === 'success' ? <CheckCircle size={24} /> : <XCircle size={24} />}
              <span>{result?.message}</span>
            </div>
            <div className="script-section">
              <div className="section-label">执行的命令</div>
              <div className="script-code">
                <code>{action.action.value}</code>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(action.action.value, 'script')}
                >
                  {copiedField === 'script' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            {result?.output && (
              <div className="output-section">
                <div className="section-label">输出结果</div>
                <div className="output-code">
                  <pre>{result.output}</pre>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(result.output!, 'output')}
                  >
                    {copiedField === 'output' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isOpenAction && status === 'loading' && (
          <div className="modal-body loading">
            <Loader2 className="spinner" size={32} />
            <p>
              {action.action.type === 'open_app' && '正在打开应用...'}
              {action.action.type === 'open_file' && '正在打开文件...'}
              {action.action.type === 'open_directory' && '正在打开目录...'}
            </p>
          </div>
        )}

        {isOpenAction && status === 'success' && (
          <div className="modal-body result">
            <div className="status-indicator success">
              <CheckCircle size={24} />
              <span>
                {action.action.type === 'open_app' && '应用已打开'}
                {action.action.type === 'open_file' && '文件已打开'}
                {action.action.type === 'open_directory' && '目录已打开'}
              </span>
            </div>
          </div>
        )}

        {isOther && (
          <div className="modal-body display">
            {action.description && (
              <div className="info-section">
                <div className="section-label">描述</div>
                <div className="info-content">
                  <p>{action.description}</p>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(action.description!, 'description')}
                  >
                    {copiedField === 'description' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
            <div className="info-section">
              <div className="section-label">动作值</div>
              <div className="info-content">
                <code>{action.action.value}</code>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(action.action.value, 'value')}
                >
                  {copiedField === 'value' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .execute-modal-overlay {
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
          .execute-modal {
            background: var(--bg-primary);
            border-radius: 12px;
            width: 480px;
            max-width: 90vw;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: var(--shadow-md);
            display: flex;
            flex-direction: column;
          }
          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-primary);
          }
          .modal-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .modal-icon {
            width: 36px;
            height: 36px;
            background: var(--accent-bg);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-primary);
          }
          .modal-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
          }
          .close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
            border: none;
            background: transparent;
            cursor: pointer;
            border-radius: 6px;
            color: var(--text-muted);
            transition: all 0.15s;
          }
          .close-btn:hover {
            background: var(--bg-tertiary);
            color: var(--text-secondary);
          }
          .modal-body {
            padding: 20px;
            overflow-y: auto;
          }
          .modal-body.loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            gap: 16px;
          }
          .modal-body.loading p {
            margin: 0;
            color: var(--text-tertiary);
            font-size: 14px;
          }
          .spinner {
            animation: spin 1s linear infinite;
            color: var(--accent-primary);
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .script-preview {
            background: var(--bg-tertiary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            color: var(--text-tertiary);
            max-width: 100%;
            overflow-x: auto;
            text-align: center;
          }
          .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .status-indicator.success {
            background: var(--success-bg);
            color: var(--success-text);
          }
          .status-indicator.error {
            background: var(--danger-bg);
            color: var(--danger-text);
          }
          .status-indicator span {
            font-size: 14px;
            font-weight: 500;
          }
          .script-section, .output-section, .info-section {
            margin-bottom: 16px;
          }
          .section-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-tertiary);
            margin-bottom: 6px;
          }
          .script-code, .output-code, .info-content {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            padding: 10px 12px;
          }
          .script-code code, .output-code pre, .info-content code, .info-content p {
            flex: 1;
            margin: 0;
            font-size: 13px;
            color: var(--text-secondary);
            font-family: 'SF Mono', Monaco, monospace;
            word-break: break-all;
            white-space: pre-wrap;
          }
          .output-code pre {
            max-height: 200px;
            overflow-y: auto;
          }
          .info-content p {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .copy-btn {
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
            flex-shrink: 0;
          }
          .copy-btn:hover {
            background: var(--bg-hover);
            color: var(--text-secondary);
          }
          .copy-btn:has(.check) {
            color: var(--success-text);
          }
        `}</style>
      </div>
    </div>
  );
};