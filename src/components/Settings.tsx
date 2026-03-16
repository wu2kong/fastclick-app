import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sun, Moon, Monitor, HardDrive, RotateCcw, Info, Keyboard, Settings as SettingsIcon, ChevronRight, Cloud } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '../stores/settingsStore';
import type { SettingsTab, ThemeMode } from '../types/settings';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const {
    settings,
    isLoading,
    initializeSettings,
    setTheme,
    toggleAutoStart,
    toggleSilentStart,
    toggleMinimizeToTray,
    setPreferredTerminal,
    toggleAutoBackup,
    setBackupDir,
    updateShortcutsSettings,
    resetToDefaults,
  } = useSettingsStore();

  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);

  const handleShortcutKeydown = (e: React.KeyboardEvent, shortcutKey: keyof typeof settings.shortcuts) => {
    if (!editingShortcut || editingShortcut !== shortcutKey) return;
    
    e.preventDefault();
    e.stopPropagation();

    const modifiers: string[] = [];
    if (e.metaKey) modifiers.push('CommandOrControl');
    if (e.ctrlKey) modifiers.push('CommandOrControl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');

    const key = e.key === ' ' ? 'Space' : e.key.toUpperCase();
    
    if (modifiers.length > 0 && key.length === 1) {
      const shortcut = [...modifiers, key].join('+');
      updateShortcutsSettings({ [shortcutKey]: shortcut });
      setEditingShortcut(null);
    }
  };

  const handleBackupDirSelect = async () => {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      defaultPath: settings.advanced.backupDir || '~',
    });
    if (selectedPath && typeof selectedPath === 'string') {
      setBackupDir(selectedPath);
    }
  };

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '浅色', icon: <Sun size={16} /> },
    { value: 'dark', label: '深色', icon: <Moon size={16} /> },
    { value: 'system', label: '跟随系统', icon: <Monitor size={16} /> },
  ];

  const terminalOptions = ['Terminal', 'iTerm2', 'Alacritty', 'Kitty', 'Hyper'];

  if (isLoading) {
    return (
      <div className="settings-page loading">
        <div className="loading-spinner">加载中...</div>
        <style>{styles}</style>
      </div>
    );
  }

  const renderGeneralTab = () => (
    <div className="settings-section">
      <div className="settings-group">
        <div className="group-title">外观主题</div>
        <div className="theme-options">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              className={`theme-option ${settings.general.theme === option.value ? 'active' : ''}`}
              onClick={() => setTheme(option.value)}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <div className="group-title">启动选项</div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">开机自启</span>
            <span className="setting-description">系统启动时自动运行</span>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.general.autoStart}
              onChange={toggleAutoStart}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">静默启动</span>
            <span className="setting-description">启动时不显示窗口</span>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.general.silentStart}
              onChange={toggleSilentStart}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">关闭时最小化到托盘</span>
            <span className="setting-description">点击关闭按钮时隐藏到系统托盘而非退出</span>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.general.minimizeToTray}
              onChange={toggleMinimizeToTray}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="group-title">默认应用</div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">首选终端</span>
            <span className="setting-description">执行脚本时使用的终端应用</span>
          </div>
          <select
            className="setting-select"
            value={settings.general.preferredTerminal}
            onChange={(e) => setPreferredTerminal(e.target.value)}
          >
            {terminalOptions.map((terminal) => (
              <option key={terminal} value={terminal}>{terminal}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderShortcutsTab = () => (
    <div className="settings-section">
      <div className="settings-group">
        <div className="group-title">全局快捷键</div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">唤起应用</span>
            <span className="setting-description">快速打开应用窗口</span>
          </div>
          <button
            className={`shortcut-btn ${editingShortcut === 'globalInvoke' ? 'editing' : ''}`}
            onClick={() => setEditingShortcut('globalInvoke')}
            onKeyDown={(e) => handleShortcutKeydown(e, 'globalInvoke')}
          >
            {editingShortcut === 'globalInvoke' ? '按下快捷键...' : settings.shortcuts.globalInvoke}
          </button>
        </div>
      </div>

      <div className="settings-group">
        <div className="group-title">窗口内快捷键</div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">搜索</span>
            <span className="setting-description">打开搜索框</span>
          </div>
          <button
            className={`shortcut-btn ${editingShortcut === 'search' ? 'editing' : ''}`}
            onClick={() => setEditingShortcut('search')}
            onKeyDown={(e) => handleShortcutKeydown(e, 'search')}
          >
            {editingShortcut === 'search' ? '按下快捷键...' : settings.shortcuts.search}
          </button>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">新建操作</span>
            <span className="setting-description">创建新的快速操作</span>
          </div>
          <button
            className={`shortcut-btn ${editingShortcut === 'newAction' ? 'editing' : ''}`}
            onClick={() => setEditingShortcut('newAction')}
            onKeyDown={(e) => handleShortcutKeydown(e, 'newAction')}
          >
            {editingShortcut === 'newAction' ? '按下快捷键...' : settings.shortcuts.newAction}
          </button>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">编辑操作</span>
            <span className="setting-description">编辑选中的操作</span>
          </div>
          <button
            className={`shortcut-btn ${editingShortcut === 'editAction' ? 'editing' : ''}`}
            onClick={() => setEditingShortcut('editAction')}
            onKeyDown={(e) => handleShortcutKeydown(e, 'editAction')}
          >
            {editingShortcut === 'editAction' ? '按下快捷键...' : settings.shortcuts.editAction}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="settings-section">
      <div className="settings-group">
        <div className="group-title">备份设置</div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">自动备份</span>
            <span className="setting-description">每天自动备份数据</span>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.advanced.autoBackup}
              onChange={toggleAutoBackup}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">备份目录</span>
            <span className="setting-description">{settings.advanced.backupDir || '未设置'}</span>
          </div>
          <button className="select-dir-btn" onClick={handleBackupDirSelect}>
            <HardDrive size={16} />
            <span>选择目录</span>
          </button>
        </div>
      </div>

      <div className="settings-group">
        <div className="group-title">数据管理</div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">导出数据</span>
            <span className="setting-description">导出所有应用数据</span>
          </div>
          <button className="action-btn secondary">
            导出
          </button>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">导入数据</span>
            <span className="setting-description">从备份文件恢复数据</span>
          </div>
          <button className="action-btn secondary">
            导入
          </button>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">清除数据</span>
            <span className="setting-description">删除所有应用数据（不可恢复）</span>
          </div>
          <button className="action-btn danger">
            清除
          </button>
        </div>
      </div>

      <div className="settings-group disabled">
        <div className="group-title">
          <Cloud size={16} />
          <span>云同步</span>
          <span className="coming-soon">即将推出</span>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">启用云同步</span>
            <span className="setting-description">跨设备同步您的数据</span>
          </div>
          <label className="toggle disabled">
            <input
              type="checkbox"
              checked={settings.advanced.cloudSyncEnabled}
              disabled
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="group-title">重置</div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">恢复默认设置</span>
            <span className="setting-description">将所有设置恢复为默认值</span>
          </div>
          <button className="action-btn secondary" onClick={resetToDefaults}>
            <RotateCcw size={16} />
            <span>重置</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAboutTab = () => (
    <div className="settings-section">
      <div className="about-header">
        <div className="app-logo">⚡</div>
        <h2 className="app-name">ClickPad</h2>
        <p className="app-version">版本 1.0.0</p>
      </div>

      <div className="settings-group">
        <div className="group-title">
          <Info size={16} />
          <span>版本信息</span>
        </div>
        <div className="info-item">
          <span className="info-label">应用版本</span>
          <span className="info-value">1.0.0</span>
        </div>
        <div className="info-item">
          <span className="info-label">构建日期</span>
          <span className="info-value">{new Date().toLocaleDateString('zh-CN')}</span>
        </div>
        <div className="info-item">
          <span className="info-label">运行环境</span>
          <span className="info-value">Tauri</span>
        </div>
      </div>

      <div className="settings-group">
        <div className="group-title">更新日志</div>
        <div className="changelog">
          <div className="changelog-item">
            <div className="changelog-version">v1.0.0</div>
            <div className="changelog-content">
              <p>• 初始版本发布</p>
              <p>• 支持快速启动应用</p>
              <p>• 支持执行脚本</p>
              <p>• 分类与标签管理</p>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-group disabled">
        <div className="group-title">
          更新
          <span className="coming-soon">即将推出</span>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">检查更新</span>
            <span className="setting-description">检查是否有新版本可用</span>
          </div>
          <button className="action-btn secondary" disabled>
            检查更新
          </button>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-label">自动更新</span>
            <span className="setting-description">有新版本时自动下载安装</span>
          </div>
          <label className="toggle disabled">
            <input type="checkbox" disabled />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <div className="group-title">开源信息</div>
        <div className="setting-item clickable">
          <div className="setting-info">
            <span className="setting-label">GitHub</span>
            <span className="setting-description">查看源代码</span>
          </div>
          <ChevronRight size={16} className="chevron" />
        </div>
        <div className="setting-item clickable">
          <div className="setting-info">
            <span className="setting-label">问题反馈</span>
            <span className="setting-description">报告问题或提出建议</span>
          </div>
          <ChevronRight size={16} className="chevron" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>
        <h1 className="page-title">设置</h1>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <SettingsIcon size={16} />
          <span>通用</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shortcuts')}
        >
          <Keyboard size={16} />
          <span>快捷键</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          <HardDrive size={16} />
          <span>高级</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <Info size={16} />
          <span>关于</span>
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'shortcuts' && renderShortcutsTab()}
        {activeTab === 'advanced' && renderAdvancedTab()}
        {activeTab === 'about' && renderAboutTab()}
      </div>

      <style>{styles}</style>
    </div>
  );
};

const styles = `
.settings-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}
.settings-page.loading {
  align-items: center;
  justify-content: center;
}
.loading-spinner {
  font-size: 16px;
  color: var(--text-tertiary);
}
.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  color: var(--text-tertiary);
  font-size: 14px;
  transition: all 0.15s;
}
.back-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.settings-tabs {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 12px 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-tertiary);
  transition: all 0.15s;
}
.tab-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
.tab-btn.active {
  background: var(--accent-bg);
  color: var(--accent-primary);
}
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  justify-content: center;
}
.settings-section {
  max-width: 640px;
  width: 100%;
}
.settings-group {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}
.settings-group.disabled {
  opacity: 0.6;
}
.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
}
.theme-options {
  display: flex;
  gap: 8px;
}
.theme-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-tertiary);
  transition: all 0.15s;
}
.theme-option:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
}
.theme-option.active {
  background: var(--accent-bg);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--bg-tertiary);
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-item.clickable {
  cursor: pointer;
}
.setting-item.clickable:hover {
  background: var(--bg-secondary);
  margin: 0 -16px;
  padding: 12px 16px;
}
.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
.setting-description {
  font-size: 12px;
  color: var(--text-muted);
}
.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--border-secondary);
  border-radius: 12px;
  transition: all 0.2s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}
.toggle input:checked + .toggle-slider {
  background: var(--accent-primary);
}
.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}
.toggle.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  cursor: pointer;
  min-width: 120px;
}
.setting-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}
.shortcut-btn {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  font-size: 14px;
  font-family: monospace;
  color: var(--text-secondary);
  cursor: pointer;
  min-width: 140px;
  text-align: center;
  transition: all 0.15s;
}
.shortcut-btn:hover {
  background: var(--bg-hover);
}
.shortcut-btn.editing {
  background: var(--accent-bg);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
.select-dir-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.select-dir-btn:hover {
  background: var(--bg-hover);
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.action-btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}
.action-btn.secondary:hover {
  background: var(--bg-hover);
}
.action-btn.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.action-btn.danger {
  background: var(--danger-bg);
  color: var(--danger-text);
}
.action-btn.danger:hover {
  background: var(--danger-border);
}
.coming-soon {
  background: var(--warning-bg);
  color: var(--warning-text);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  margin-left: auto;
}
.about-header {
  text-align: center;
  padding: 32px 0;
}
.app-logo {
  font-size: 48px;
  margin-bottom: 12px;
}
.app-name {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}
.app-version {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0;
}
.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--bg-tertiary);
}
.info-item:last-child {
  border-bottom: none;
}
.info-label {
  color: var(--text-tertiary);
  font-size: 14px;
}
.info-value {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}
.changelog-item {
  background: var(--bg-secondary);
  border-radius: 6px;
  padding: 12px;
}
.changelog-version {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.changelog-content p {
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-tertiary);
}
.chevron {
  color: var(--text-muted);
}
`;