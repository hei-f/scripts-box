//! 应用配置数据结构模块
//!
//! 定义应用级别的配置数据结构，包括窗口配置、快捷键配置、托盘配置等

use serde::{Deserialize, Serialize};

use crate::constants::{APP_CONFIG_VERSION, DEFAULT_QUICK_EXECUTION_SHORTCUT};

/// 窗口关闭行为
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CloseBehavior {
    /// 最小化到托盘
    MinimizeToTray,
    /// 直接退出
    Quit,
}

impl Default for CloseBehavior {
    fn default() -> Self {
        Self::MinimizeToTray
    }
}

/// 窗口配置
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WindowConfig {
    /// 关闭行为
    pub close_behavior: CloseBehavior,
    /// 启动时是否显示主窗口
    pub show_on_startup: bool,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self {
            close_behavior: CloseBehavior::default(),
            show_on_startup: true,
        }
    }
}

/// 快捷键配置
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutConfig {
    /// 快速执行快捷键
    pub quick_execution: String,
    /// 是否启用快捷键
    pub enabled: bool,
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            quick_execution: DEFAULT_QUICK_EXECUTION_SHORTCUT.to_string(),
            enabled: true,
        }
    }
}

/// 托盘配置
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TrayConfig {
    /// 是否显示托盘图标
    pub show_icon: bool,
    /// 是否在 Dock 中显示（仅 macOS 生效）
    pub show_in_dock: bool,
}

impl Default for TrayConfig {
    fn default() -> Self {
        Self {
            show_icon: true,
            show_in_dock: true,
        }
    }
}

/// 应用配置根结构
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// 配置版本号
    pub version: String,
    /// 窗口配置
    pub window: WindowConfig,
    /// 快捷键配置
    pub shortcut: ShortcutConfig,
    /// 托盘配置
    pub tray: TrayConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: APP_CONFIG_VERSION.to_string(),
            window: WindowConfig::default(),
            shortcut: ShortcutConfig::default(),
            tray: TrayConfig::default(),
        }
    }
}

impl AppConfig {
    /// 创建新的应用配置
    pub fn new() -> Self {
        Self::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.version, "1.0");
        assert_eq!(config.window.close_behavior, CloseBehavior::MinimizeToTray);
        assert!(config.window.show_on_startup);
        assert_eq!(config.shortcut.quick_execution, "CommandOrControl+Shift+P");
        assert!(config.shortcut.enabled);
        assert!(config.tray.show_icon);
        assert!(config.tray.show_in_dock);
    }

    #[test]
    fn test_serialize_deserialize() {
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let parsed: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config, parsed);
    }

    #[test]
    fn test_close_behavior_default() {
        let behavior = CloseBehavior::default();
        assert_eq!(behavior, CloseBehavior::MinimizeToTray);
    }

    #[test]
    fn test_serialize_camel_case() {
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        // 验证 camelCase 序列化
        assert!(json.contains("closeBehavior"));
        assert!(json.contains("showOnStartup"));
        assert!(json.contains("quickExecution"));
        assert!(json.contains("showIcon"));
        assert!(json.contains("showInDock"));
    }

    #[test]
    fn test_close_behavior_variants() {
        // 测试序列化
        let minimize = CloseBehavior::MinimizeToTray;
        let quit = CloseBehavior::Quit;

        let minimize_json = serde_json::to_string(&minimize).unwrap();
        let quit_json = serde_json::to_string(&quit).unwrap();

        // camelCase 序列化
        assert!(minimize_json.contains("minimizeToTray"));
        assert!(quit_json.contains("quit"));

        // 测试反序列化
        let parsed_minimize: CloseBehavior = serde_json::from_str(&minimize_json).unwrap();
        let parsed_quit: CloseBehavior = serde_json::from_str(&quit_json).unwrap();

        assert_eq!(parsed_minimize, CloseBehavior::MinimizeToTray);
        assert_eq!(parsed_quit, CloseBehavior::Quit);
    }

    #[test]
    fn test_window_config_custom() {
        let custom_config = WindowConfig {
            close_behavior: CloseBehavior::Quit,
            show_on_startup: false,
        };

        assert_eq!(custom_config.close_behavior, CloseBehavior::Quit);
        assert!(!custom_config.show_on_startup);

        // 测试序列化
        let json = serde_json::to_string(&custom_config).unwrap();
        // camelCase 序列化
        assert!(json.contains("\"closeBehavior\":\"quit\""));
        assert!(json.contains("\"showOnStartup\":false"));

        // 测试反序列化
        let parsed: WindowConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, custom_config);
    }

    #[test]
    fn test_shortcut_config_custom() {
        let custom_config = ShortcutConfig {
            quick_execution: "Ctrl+Alt+X".to_string(),
            enabled: false,
        };

        assert_eq!(custom_config.quick_execution, "Ctrl+Alt+X");
        assert!(!custom_config.enabled);

        // 测试序列化
        let json = serde_json::to_string(&custom_config).unwrap();
        assert!(json.contains("\"quickExecution\":\"Ctrl+Alt+X\""));
        assert!(json.contains("\"enabled\":false"));

        // 测试反序列化
        let parsed: ShortcutConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, custom_config);
    }

    #[test]
    fn test_tray_config_custom() {
        let custom_config = TrayConfig {
            show_icon: false,
            show_in_dock: false,
        };

        assert!(!custom_config.show_icon);
        assert!(!custom_config.show_in_dock);

        // 测试序列化
        let json = serde_json::to_string(&custom_config).unwrap();
        assert!(json.contains("\"showIcon\":false"));
        assert!(json.contains("\"showInDock\":false"));

        // 测试反序列化
        let parsed: TrayConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, custom_config);
    }

    #[test]
    fn test_app_config_custom() {
        let custom_config = AppConfig {
            version: "2.0".to_string(),
            window: WindowConfig {
                close_behavior: CloseBehavior::Quit,
                show_on_startup: false,
            },
            shortcut: ShortcutConfig {
                quick_execution: "Ctrl+P".to_string(),
                enabled: false,
            },
            tray: TrayConfig {
                show_icon: false,
                show_in_dock: false,
            },
        };

        // 验证所有字段
        assert_eq!(custom_config.version, "2.0");
        assert_eq!(custom_config.window.close_behavior, CloseBehavior::Quit);
        assert!(!custom_config.window.show_on_startup);
        assert_eq!(custom_config.shortcut.quick_execution, "Ctrl+P");
        assert!(!custom_config.shortcut.enabled);
        assert!(!custom_config.tray.show_icon);
        assert!(!custom_config.tray.show_in_dock);

        // 测试完整序列化和反序列化
        let json = serde_json::to_string(&custom_config).unwrap();
        let parsed: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, custom_config);
    }

    #[test]
    fn test_app_config_new() {
        let config = AppConfig::new();
        // new() 应该返回默认配置
        assert_eq!(config, AppConfig::default());
    }

    #[test]
    fn test_deserialize_partial_json() {
        // 测试部分 JSON 的反序列化（缺少可选字段时应使用默认值）
        let partial_json = r#"{
            "version": "1.0"
        }"#;

        let result: Result<AppConfig, _> = serde_json::from_str(partial_json);
        // 由于所有字段都是必需的，这应该失败
        assert!(result.is_err());
    }

    #[test]
    fn test_deserialize_complete_json() {
        let complete_json = r#"{
            "version": "1.0",
            "window": {
                "closeBehavior": "quit",
                "showOnStartup": true
            },
            "shortcut": {
                "quickExecution": "CommandOrControl+Shift+P",
                "enabled": true
            },
            "tray": {
                "showIcon": true,
                "showInDock": true
            }
        }"#;

        let config: AppConfig = serde_json::from_str(complete_json).unwrap();
        assert_eq!(config.version, "1.0");
        assert_eq!(config.window.close_behavior, CloseBehavior::Quit);
        assert!(config.window.show_on_startup);
        assert!(config.shortcut.enabled);
        assert!(config.tray.show_icon);
    }

    #[test]
    fn test_config_equality() {
        let config1 = AppConfig::default();
        let config2 = AppConfig::default();
        assert_eq!(config1, config2);

        let config3 = AppConfig {
            version: "2.0".to_string(),
            ..Default::default()
        };
        assert_ne!(config1, config3);
    }

    #[test]
    fn test_config_clone() {
        let config = AppConfig::default();
        let cloned = config.clone();
        assert_eq!(config, cloned);
    }

    #[test]
    fn test_config_debug() {
        let config = AppConfig::default();
        let debug_str = format!("{:?}", config);
        // 验证 Debug 输出包含关键字段
        assert!(debug_str.contains("AppConfig"));
        assert!(debug_str.contains("version"));
        assert!(debug_str.contains("window"));
        assert!(debug_str.contains("shortcut"));
        assert!(debug_str.contains("tray"));
    }
}
