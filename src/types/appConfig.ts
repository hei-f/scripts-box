/**
 * 应用配置相关类型定义
 *
 * 定义应用级别的配置类型，与后端 Rust 数据结构对应
 */

/**
 * 窗口关闭行为
 * 注意：值使用 camelCase 格式，与 Rust 后端 serde(rename_all = "camelCase") 保持一致
 */
export type CloseBehavior = 'minimizeToTray' | 'quit';

/**
 * 窗口配置
 */
export interface WindowConfig {
  /** 关闭行为 */
  closeBehavior: CloseBehavior;
  /** 启动时是否显示主窗口 */
  showOnStartup: boolean;
}

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  /** 快速执行快捷键 */
  quickExecution: string;
  /** 是否启用快捷键 */
  enabled: boolean;
}

/**
 * 托盘配置
 */
export interface TrayConfig {
  /** 是否显示托盘图标 */
  showIcon: boolean;
  /** 是否在 Dock 中显示（仅 macOS 生效） */
  showInDock: boolean;
}

/**
 * 应用配置根结构
 */
export interface AppConfig {
  /** 配置版本号 */
  version: string;
  /** 窗口配置 */
  window: WindowConfig;
  /** 快捷键配置 */
  shortcut: ShortcutConfig;
  /** 托盘配置 */
  tray: TrayConfig;
}
