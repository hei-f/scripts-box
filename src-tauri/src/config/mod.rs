//! 配置管理模块
//!
//! 提供脚本配置和应用配置的数据结构和管理功能

pub mod app_config;
pub mod app_config_manager;
pub mod manager;
pub mod script_config;

// 重导出常用类型，方便外部使用
pub use app_config::{AppConfig, CloseBehavior, ShortcutConfig, TrayConfig, WindowConfig};
pub use app_config_manager::AppConfigManager;
pub use manager::ScriptConfigManager;
pub use script_config::{ScriptConfig, ScriptsConfigFile};
