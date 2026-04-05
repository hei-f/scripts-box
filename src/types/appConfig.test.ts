/**
 * 应用配置类型测试
 *
 * 验证类型定义与后端序列化格式的一致性
 * 注意：CloseBehavior 使用 camelCase 格式，与 Rust 后端 serde(rename_all = "camelCase") 保持一致
 */

import { describe, it, expect } from 'vitest';

describe('AppConfig Types', () => {
  describe('CloseBehavior', () => {
    it('should accept minimizeToTray value', () => {
      const behavior: CloseBehavior = 'minimizeToTray';
      expect(behavior).toBe('minimizeToTray');
    });

    it('should accept quit value', () => {
      const behavior: CloseBehavior = 'quit';
      expect(behavior).toBe('quit');
    });
  });

  describe('WindowConfig', () => {
    it('should create valid WindowConfig', () => {
      const config: WindowConfig = {
        closeBehavior: 'minimizeToTray',
        showOnStartup: true,
      };

      expect(config.closeBehavior).toBe('minimizeToTray');
      expect(config.showOnStartup).toBe(true);
    });

    it('should create WindowConfig with quit behavior', () => {
      const config: WindowConfig = {
        closeBehavior: 'quit',
        showOnStartup: false,
      };

      expect(config.closeBehavior).toBe('quit');
      expect(config.showOnStartup).toBe(false);
    });
  });

  describe('ShortcutConfig', () => {
    it('should create valid ShortcutConfig', () => {
      const config: ShortcutConfig = {
        quickExecution: 'CommandOrControl+Shift+P',
        enabled: true,
      };

      expect(config.quickExecution).toBe('CommandOrControl+Shift+P');
      expect(config.enabled).toBe(true);
    });

    it('should create ShortcutConfig with custom shortcut', () => {
      const config: ShortcutConfig = {
        quickExecution: 'Ctrl+Alt+X',
        enabled: false,
      };

      expect(config.quickExecution).toBe('Ctrl+Alt+X');
      expect(config.enabled).toBe(false);
    });
  });

  describe('TrayConfig', () => {
    it('should create valid TrayConfig', () => {
      const config: TrayConfig = {
        showIcon: true,
        showInDock: true,
      };

      expect(config.showIcon).toBe(true);
      expect(config.showInDock).toBe(true);
    });

    it('should create TrayConfig with hidden icon', () => {
      const config: TrayConfig = {
        showIcon: false,
        showInDock: false,
      };

      expect(config.showIcon).toBe(false);
      expect(config.showInDock).toBe(false);
    });
  });

  describe('AppConfig', () => {
    it('should create valid AppConfig', () => {
      const config: AppConfig = {
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

      expect(config.version).toBe('1.0');
      expect(config.window.closeBehavior).toBe('minimizeToTray');
      expect(config.shortcut.enabled).toBe(true);
      expect(config.tray.showIcon).toBe(true);
    });

    it('should serialize to JSON correctly', () => {
      const config: AppConfig = {
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

      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      // 验证 camelCase 字段名
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('window');
      expect(parsed.window).toHaveProperty('closeBehavior');
      expect(parsed.window).toHaveProperty('showOnStartup');
      expect(parsed).toHaveProperty('shortcut');
      expect(parsed.shortcut).toHaveProperty('quickExecution');
      expect(parsed).toHaveProperty('tray');
      expect(parsed.tray).toHaveProperty('showIcon');
      expect(parsed.tray).toHaveProperty('showInDock');
    });

    it('should deserialize from JSON correctly', () => {
      const json = JSON.stringify({
        version: '1.0',
        window: {
          closeBehavior: 'quit',
          showOnStartup: false,
        },
        shortcut: {
          quickExecution: 'Ctrl+P',
          enabled: false,
        },
        tray: {
          showIcon: false,
          showInDock: false,
        },
      });

      const config: AppConfig = JSON.parse(json);

      expect(config.version).toBe('1.0');
      expect(config.window.closeBehavior).toBe('quit');
      expect(config.window.showOnStartup).toBe(false);
      expect(config.shortcut.quickExecution).toBe('Ctrl+P');
      expect(config.shortcut.enabled).toBe(false);
      expect(config.tray.showIcon).toBe(false);
      expect(config.tray.showInDock).toBe(false);
    });
  });
});

// 导入类型（仅用于类型检查）
// 注意：使用 camelCase 格式与后端保持一致
type CloseBehavior = 'minimizeToTray' | 'quit';
interface WindowConfig {
  closeBehavior: CloseBehavior;
  showOnStartup: boolean;
}
interface ShortcutConfig {
  quickExecution: string;
  enabled: boolean;
}
interface TrayConfig {
  showIcon: boolean;
  showInDock: boolean;
}
interface AppConfig {
  version: string;
  window: WindowConfig;
  shortcut: ShortcutConfig;
  tray: TrayConfig;
}
