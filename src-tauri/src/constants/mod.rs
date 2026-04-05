//! 常量模块
//!
//! 集中管理应用中使用的所有常量

pub mod app_config;

// 重导出常用常量，方便外部使用
pub use app_config::{
    APP_CONFIG_FILE, APP_CONFIG_VERSION, DEFAULT_QUICK_EXECUTION_SHORTCUT,
    MAIN_WINDOW_LABEL, QUICK_EXECUTION_WINDOW_LABEL,
};