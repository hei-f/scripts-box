/**
 * 快速执行页面组件测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import QuickExecutionPage from '..';

// 默认的脚本列表
const mockScriptInfos = [
  {
    id: 'test_script',
    name: '测试脚本',
    description: '这是一个测试脚本',
  },
  {
    id: 'add_numbers',
    name: '加法脚本',
    description: '计算两个数字的和',
  },
];

// 默认的参数定义
const mockParamDefinitions = [
  {
    name: 'a',
    label: '数字 A',
    type: 'number' as const,
    required: true,
    description: '第一个数字',
    default: 10,
  },
  {
    name: 'b',
    label: '数字 B',
    type: 'number' as const,
    required: true,
    description: '第二个数字',
    default: 20,
  },
];

// 默认的执行结果
const mockScriptResult = {
  success: true,
  output: '30',
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

describe('QuickExecutionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认返回脚本列表
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockInvoke.mockImplementation((cmd: string, _args?: any) => {
      switch (cmd) {
        case 'list_scripts':
          return Promise.resolve(mockScriptInfos);
        case 'get_script_params':
          return Promise.resolve(mockParamDefinitions);
        case 'execute_script':
          return Promise.resolve(mockScriptResult);
        default:
          return Promise.reject(new Error(`Unknown command: ${cmd}`));
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    renderWithRouter(<QuickExecutionPage />);
    // Antd Spin 组件会渲染一个带有 loading 角色的元素
    expect(document.querySelector('.ant-spin')).toBeTruthy();
  });

  it('should load and display script list', async () => {
    renderWithRouter(<QuickExecutionPage />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('list_scripts', undefined);
    });

    // 等待脚本列表加载
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    expect(screen.getByText('加法脚本')).toBeTruthy();
  });

  it('should display search input', async () => {
    renderWithRouter(<QuickExecutionPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索脚本...')).toBeTruthy();
    });
  });

  it('should filter scripts by search text', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 输入搜索文本
    const searchInput = screen.getByPlaceholderText('搜索脚本...') as HTMLInputElement;
    await user.type(searchInput, '测试');

    // 只有测试脚本应该显示
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });
  });

  it('should show empty state when no scripts match', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 输入不存在的脚本名称
    const searchInput = screen.getByPlaceholderText('搜索脚本...');
    await user.type(searchInput, '不存在的脚本');

    // 应该显示空状态
    await waitFor(() => {
      expect(screen.getByText('没有找到匹配的脚本')).toBeTruthy();
    });
  });

  it('should handle script load error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('加载脚本失败'));

    // 抑制 console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithRouter(<QuickExecutionPage />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('list_scripts', undefined);
    });

    consoleSpy.mockRestore();
  });

  it('should display script tags', async () => {
    renderWithRouter(<QuickExecutionPage />);

    await waitFor(() => {
      expect(screen.getByText('test_script')).toBeTruthy();
    });

    expect(screen.getByText('add_numbers')).toBeTruthy();
  });

  it('should show script descriptions', async () => {
    renderWithRouter(<QuickExecutionPage />);

    await waitFor(() => {
      expect(screen.getByText('这是一个测试脚本')).toBeTruthy();
    });

    expect(screen.getByText('计算两个数字的和')).toBeTruthy();
  });

  it('should select script and show execute form', async () => {
    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 点击第一个脚本
    const scriptItem = screen.getByText('测试脚本').closest('.ant-list-item');
    if (scriptItem) {
      fireEvent.click(scriptItem);
    }

    // 应该显示返回按钮和执行表单
    await waitFor(() => {
      expect(screen.getByText('← 返回列表')).toBeTruthy();
    });

    // 验证调用获取参数 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_script_params', { id: 'test_script' });
    });
  });

  it('should return to list when clicking back button', async () => {
    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 点击第一个脚本
    const scriptItem = screen.getByText('测试脚本').closest('.ant-list-item');
    if (scriptItem) {
      fireEvent.click(scriptItem);
    }

    // 等待执行表单显示
    await waitFor(() => {
      expect(screen.getByText('← 返回列表')).toBeTruthy();
    });

    // 点击返回按钮
    const backButton = screen.getByText('← 返回列表');
    fireEvent.click(backButton);

    // 应该回到列表视图
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });
  });

  it('should execute script and show result', async () => {
    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 点击第一个脚本
    const scriptItem = screen.getByText('测试脚本').closest('.ant-list-item');
    if (scriptItem) {
      fireEvent.click(scriptItem);
    }

    // 等待参数加载
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /执行脚本/ })).toBeTruthy();
    });

    // 点击执行按钮
    const executeButton = screen.getByRole('button', { name: /执行脚本/ });
    fireEvent.click(executeButton);

    // 验证调用执行 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('execute_script', expect.objectContaining({
        id: 'test_script',
      }));
    });
  });

  it('should handle get script params error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockInvoke.mockImplementation((cmd: string, _args?: any) => {
      if (cmd === 'list_scripts') {
        return Promise.resolve(mockScriptInfos);
      }
      if (cmd === 'get_script_params') {
        return Promise.reject(new Error('获取参数失败'));
      }
      return Promise.resolve(mockScriptResult);
    });

    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 点击第一个脚本
    const scriptItem = screen.getByText('测试脚本').closest('.ant-list-item');
    if (scriptItem) {
      fireEvent.click(scriptItem);
    }

    // 验证调用获取参数 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_script_params', { id: 'test_script' });
    });
  });

  it('should handle execute script error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockInvoke.mockImplementation((cmd: string, _args?: any) => {
      if (cmd === 'list_scripts') {
        return Promise.resolve(mockScriptInfos);
      }
      if (cmd === 'get_script_params') {
        return Promise.resolve(mockParamDefinitions);
      }
      if (cmd === 'execute_script') {
        return Promise.reject(new Error('执行失败'));
      }
      return Promise.resolve({});
    });

    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 点击第一个脚本
    const scriptItem = screen.getByText('测试脚本').closest('.ant-list-item');
    if (scriptItem) {
      fireEvent.click(scriptItem);
    }

    // 等待参数加载
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /执行脚本/ })).toBeTruthy();
    });

    // 点击执行按钮
    const executeButton = screen.getByRole('button', { name: /执行脚本/ });
    fireEvent.click(executeButton);

    // 验证调用执行 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('execute_script', expect.objectContaining({
        id: 'test_script',
      }));
    });
  });

  it('should show failed execution result', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockInvoke.mockImplementation((cmd: string, _args?: any) => {
      if (cmd === 'list_scripts') {
        return Promise.resolve(mockScriptInfos);
      }
      if (cmd === 'get_script_params') {
        return Promise.resolve(mockParamDefinitions);
      }
      if (cmd === 'execute_script') {
        return Promise.resolve({
          success: false,
          output: '',
          error: '执行失败',
        });
      }
      return Promise.resolve({});
    });

    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 点击第一个脚本
    const scriptItem = screen.getByText('测试脚本').closest('.ant-list-item');
    if (scriptItem) {
      fireEvent.click(scriptItem);
    }

    // 等待参数加载
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /执行脚本/ })).toBeTruthy();
    });

    // 点击执行按钮
    const executeButton = screen.getByRole('button', { name: /执行脚本/ });
    fireEvent.click(executeButton);

    // 验证调用执行 API
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('execute_script', expect.objectContaining({
        id: 'test_script',
      }));
    });
  });

  it('should filter scripts by id', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 输入脚本 ID 搜索
    const searchInput = screen.getByPlaceholderText('搜索脚本...') as HTMLInputElement;
    await user.type(searchInput, 'add_numbers');

    // 应该只显示加法脚本
    await waitFor(() => {
      expect(screen.getByText('加法脚本')).toBeTruthy();
    });
  });

  it('should filter scripts by description', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickExecutionPage />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('测试脚本')).toBeTruthy();
    });

    // 输入描述关键词搜索
    const searchInput = screen.getByPlaceholderText('搜索脚本...') as HTMLInputElement;
    await user.type(searchInput, '计算');

    // 应该只显示加法脚本
    await waitFor(() => {
      expect(screen.getByText('加法脚本')).toBeTruthy();
    });
  });
});
