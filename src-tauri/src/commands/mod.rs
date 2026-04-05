//! Tauri 命令定义模块
//!
//! 定义所有供前端调用的 Tauri 命令

pub mod app_config;
pub mod error_log;
pub mod history;
pub mod script_config;
pub mod script_execution;
pub mod workflow;

// 重导出命令函数，方便在 generate_handler! 中使用
pub use app_config::{
    get_app_config,
    update_app_config,
    update_shortcut_config,
    update_tray_config,
    update_window_config,
};
pub use error_log::{
    cleanup_old_error_logs,
    clear_debug_log,
    clear_error_logs,
    emit_devtools_log,
    list_error_logs,
    log_frontend_error,
    open_devtools_window,
    read_debug_log,
    write_debug_log,
};
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
pub use workflow::{
    create_workflow,
    delete_workflow,
    execute_workflow,
    get_script_output_schema,
    get_workflow,
    list_workflows,
    update_workflow,
};
