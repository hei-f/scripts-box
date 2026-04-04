// 模块导出
pub mod builtin;
pub mod commands;
pub mod config;
pub mod db;
pub mod error;
pub mod registry;
pub mod script_api;

// 引入标准库和 Tauri 类型
use std::sync::Mutex;

use tauri::Manager;

// 引入命令模块中的所有命令
use commands::{
    // 脚本配置相关命令
    create_script_config,
    delete_script_config,
    get_script_config,
    list_script_configs,
    update_script_config,
    // 脚本执行相关命令
    execute_script,
    get_script_params,
    list_scripts,
    // 执行历史相关命令
    clear_execution_history,
    delete_execution_history,
    list_execution_history,
};

// 引入状态类型
use builtin::register_builtin_scripts;
use config::ScriptConfigManager;
use db::Database;
use registry::ScriptRegistry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 获取应用句柄
            let app_handle = app.handle();

            // 获取配置目录路径
            let config_dir = app_handle
                .path()
                .config_dir()
                .expect("无法获取配置目录");

            // 初始化数据库
            let db = Database::init(&config_dir).expect("数据库初始化失败");

            // 加载脚本配置管理器
            let config_manager =
                ScriptConfigManager::load(app_handle).expect("配置管理器加载失败");

            // 构建脚本注册中心并注册内置脚本
            let mut registry = ScriptRegistry::new();
            register_builtin_scripts(&mut registry);

            // 注册共享状态
            app.manage(Mutex::new(config_manager));
            app.manage(Mutex::new(registry));
            app.manage(Mutex::new(db));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 脚本配置相关命令
            list_script_configs,
            get_script_config,
            create_script_config,
            update_script_config,
            delete_script_config,
            // 脚本执行相关命令
            list_scripts,
            get_script_params,
            execute_script,
            // 执行历史相关命令
            list_execution_history,
            delete_execution_history,
            clear_execution_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
