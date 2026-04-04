//! Tauri 命令定义模块
//!
//! 定义所有供前端调用的 Tauri 命令

pub mod history;
pub mod script_config;
pub mod script_execution;

// 重导出命令函数，方便在 generate_handler! 中使用
pub use history::{
    clear_execution_history,
    delete_execution_history,
    list_execution_history,
};
pub use script_config::{
    create_script_config,
    delete_script_config,
    get_script_config,
    list_script_configs,
    update_script_config,
};
pub use script_execution::{
    execute_script,
    get_script_params,
    list_scripts,
};