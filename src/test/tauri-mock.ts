/**
 * Tauri API Mock 工具
 *
 * 为测试提供 Tauri invoke 的 mock 实现
 */

import { vi } from 'vitest';

/** 默认的应用配置 */
// 注意：CloseBehavior 使用 camelCase 格式，与 Rust 后端 serde(rename_all = "camelCase") 保持一致
export const mockAppConfig = {
  version: '1.0',
  window: {
    closeBehavior: 'minimizeToTray' as const,
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

/** 默认的脚本信息列表 */
export const mockScriptInfos = [
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

/** 默认的参数定义 */
export const mockParamDefinitions = [
  {
    name: 'a',
    label: '数字 A',
    type: 'number' as const,
    required: true,
    description: '第一个数字',
  },
  {
    name: 'b',
    label: '数字 B',
    type: 'number' as const,
    required: true,
    description: '第二个数字',
  },
];

/** 默认的执行结果 */
export const mockScriptResult = {
  success: true,
  output: '30',
};

/**
 * 创建 Tauri invoke mock
 */
export function createTauriInvokeMock() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return vi.fn((cmd: string, _args?: Record<string, unknown>) => {
    switch (cmd) {
      case 'get_app_config':
        return Promise.resolve(mockAppConfig);

      case 'update_app_config':
        return Promise.resolve(undefined);

      case 'update_window_config':
        return Promise.resolve(undefined);

      case 'update_shortcut_config':
        return Promise.resolve(undefined);

      case 'update_tray_config':
        return Promise.resolve(undefined);

      case 'list_scripts':
        return Promise.resolve(mockScriptInfos);

      case 'get_script_params':
        return Promise.resolve(mockParamDefinitions);

      case 'execute_script':
        return Promise.resolve(mockScriptResult);

      case 'list_script_configs':
        return Promise.resolve([]);

      default:
        return Promise.reject(new Error(`Unknown command: ${cmd}`));
    }
  });
}

/**
 * Mock Tauri 模块
 */
export function mockTauriInvoke(invokeMock: ReturnType<typeof createTauriInvokeMock>) {
  vi.mock('@tauri-apps/api/core', () => ({
    invoke: invokeMock,
  }));
}
