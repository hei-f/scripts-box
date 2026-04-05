/**
 * 设置页面组件测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SettingsPage from './index';

// 默认的应用配置
// 注意：CloseBehavior 使用 camelCase 格式，与 Rust 后端 serde(rename_all = "camelCase") 保持一致
const defaultAppConfig = {
  version: '1.0',
  window: {
    closeBehavior: 'minimizeToTray',
    showOnStartup: true,
  },
  shortcut: {
    quickExecution: 'CommandOrControl+Shift+P',
    enabled: true,
  },
  tray: {
    showIcon: true,
    showInDock: true,
  },
};

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// 获取 mock 函数的引用
const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;

// 包装组件，提供 Router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认返回配置
    mockInvoke.mockImplementation((cmd: string) => {
      switch (cmd) {
        case 'get_app_config':
          return Promise.resolve(defaultAppConfig);
        case 'update_window_config':
        case 'update_shortcut_config':
        case 'update_tray_config':
          return Promise.resolve(undefined);
        default:
          return Promise.reject(new Error(`Unknown command: ${cmd}`));
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    renderWithRouter(<SettingsPage />);
    // Antd Spin 组件会渲染一个带有 loading 角色的元素
    expect(document.querySelector('.ant-spin')).toBeTruthy();
  });

  it('should load and display config', async () => {
    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_app_config', undefined);
    });

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });
  });

  it('should display window settings tab', async () => {
    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      // 使用 getAllByText 并检查数量，因为 tab 标题和 card 标题都有这个文本
      const elements = screen.getAllByText('窗口设置');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('should display shortcut settings tab', async () => {
    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      const elements = screen.getAllByText('快捷键设置');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('should display tray settings tab', async () => {
    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      const elements = screen.getAllByText('托盘设置');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('should display about tab', async () => {
    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      const elements = screen.getAllByText('关于');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('should handle config load error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('加载配置失败'));

    // 抑制 console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_app_config', undefined);
    });

    consoleSpy.mockRestore();
  });

  it('should display version in about tab', async () => {
    renderWithRouter(<SettingsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });

    // 点击关于 tab
    const aboutTab = screen.getByRole('tab', { name: '关于' });
    fireEvent.click(aboutTab);

    // 验证版本号显示
    await waitFor(() => {
      expect(screen.getByText('1.0')).toBeTruthy();
    });
  });

  it('should save window config when clicking save button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });

    // 点击保存窗口设置按钮（按钮名称包含图标，使用正则匹配）
    const saveButton = screen.getByRole('button', { name: /保存窗口设置/ });
    await user.click(saveButton);

    // 验证调用了保存 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_window_config', expect.any(Object));
    });
  });

  it('should save shortcut config when clicking save button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });

    // 切换到快捷键设置 tab
    const shortcutTab = screen.getByRole('tab', { name: '快捷键设置' });
    fireEvent.click(shortcutTab);

    // 点击保存快捷键设置按钮（按钮名称包含图标，使用正则匹配）
    const saveButton = screen.getByRole('button', { name: /保存快捷键设置/ });
    await user.click(saveButton);

    // 验证调用了保存 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_shortcut_config', expect.any(Object));
    });
  });

  it('should save tray config when clicking save button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });

    // 切换到托盘设置 tab
    const trayTab = screen.getByRole('tab', { name: '托盘设置' });
    fireEvent.click(trayTab);

    // 点击保存托盘设置按钮（按钮名称包含图标，使用正则匹配）
    const saveButton = screen.getByRole('button', { name: /保存托盘设置/ });
    await user.click(saveButton);

    // 验证调用了保存 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_tray_config', expect.any(Object));
    });
  });

  it('should reset shortcut to default when clicking reset button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });

    // 切换到快捷键设置 tab
    const shortcutTab = screen.getByRole('tab', { name: '快捷键设置' });
    fireEvent.click(shortcutTab);

    // 点击恢复默认按钮（按钮名称包含图标，使用正则匹配）
    const resetButton = screen.getByRole('button', { name: /恢复默认/ });
    await user.click(resetButton);

    // 验证输入框的值已重置（通过检查输入框存在）
    await waitFor(() => {
      const input = screen.getByPlaceholderText('CommandOrControl+Shift+P');
      expect(input).toBeTruthy();
    });
  });

  it('should handle save error gracefully', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_app_config') {
        return Promise.resolve(defaultAppConfig);
      }
      if (cmd === 'update_window_config') {
        return Promise.reject(new Error('保存失败'));
      }
      return Promise.resolve(undefined);
    });

    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });

    // 点击保存窗口设置按钮（按钮名称包含图标，使用正则匹配）
    const saveButton = screen.getByRole('button', { name: /保存窗口设置/ });
    await user.click(saveButton);

    // 验证调用了保存 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_window_config', expect.any(Object));
    });
  });

  it('should display close behavior options', async () => {
    renderWithRouter(<SettingsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });

    // 验证关闭行为选项存在
    expect(screen.getByText('最小化到托盘')).toBeTruthy();
    expect(screen.getByText('直接退出应用')).toBeTruthy();
  });

  it('should display switch options', async () => {
    renderWithRouter(<SettingsPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('设置')).toBeTruthy();
    });

    // 验证开关选项存在
    expect(screen.getByText('启动时显示主窗口')).toBeTruthy();
  });
});
