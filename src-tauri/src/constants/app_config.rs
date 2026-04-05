//! 应用配置相关常量
//!
//! 定义应用配置的文件名、版本号、默认值等常量

/// 应用配置文件名
pub const APP_CONFIG_FILE: &str = "app_config.json";

/// 应用配置版本号
pub const APP_CONFIG_VERSION: &str = "1.0";

/// 默认快速执行快捷键
///
/// CommandOrControl 前缀会根据平台自动适配：
/// - macOS: Command
/// - Windows/Linux: Ctrl
pub const DEFAULT_QUICK_EXECUTION_SHORTCUT: &str = "CommandOrControl+Shift+P";

/// 快速执行窗口标签
pub const QUICK_EXECUTION_WINDOW_LABEL: &str = "quick-execution";

/// 主窗口标签
pub const MAIN_WINDOW_LABEL: &str = "main";