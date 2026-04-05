// 模块导出
pub mod builtin;
pub mod commands;
pub mod config;
pub mod constants;
pub mod db;
pub mod error;
pub mod registry;
pub mod script_api;

// 引入标准库和 Tauri 类型
use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

// 引入命令模块中的所有命令
use commands::{
    // 应用配置相关命令
    get_app_config,
    update_app_config,
    update_shortcut_config,
    update_tray_config,
    update_window_config,
    // 错误日志相关命令
    cleanup_old_error_logs,
    clear_error_logs,
    list_error_logs,
    log_frontend_error,
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
use config::{AppConfigManager, CloseBehavior, ScriptConfigManager};
use constants::{MAIN_WINDOW_LABEL, QUICK_EXECUTION_WINDOW_LABEL};
use db::Database;
use registry::ScriptRegistry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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

            // 加载应用配置管理器
            let app_config_manager =
                AppConfigManager::load(app_handle).expect("应用配置管理器加载失败");

            // 获取应用配置（用于初始化托盘和快捷键）
            let app_config = app_config_manager.get_config().clone();

            // 构建脚本注册中心并注册内置脚本
            let mut registry = ScriptRegistry::new();
            register_builtin_scripts(&mut registry);

            // 注册共享状态
            app.manage(Mutex::new(config_manager));
            app.manage(Mutex::new(app_config_manager));
            app.manage(Mutex::new(registry));
            app.manage(Mutex::new(db));

            // 创建托盘菜单
            let show_window_item = MenuItem::with_id(app, "show_window", "显示主窗口", true, None::<&str>)
                .expect("创建菜单项失败");
            let quick_execute_item = MenuItem::with_id(app, "quick_execute", "快速执行", true, None::<&str>)
                .expect("创建菜单项失败");
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)
                .expect("创建菜单项失败");

            let menu = Menu::with_items(app, &[&show_window_item, &quick_execute_item, &quit_item])
                .expect("创建托盘菜单失败");

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Scripts Box")
                .menu(&menu)
                .on_tray_icon_event(|tray, event| {
                    // 单击托盘图标显示/隐藏主窗口
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show_window" => {
                        if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quick_execute" => {
                        show_quick_execution_window(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // 注册全局快捷键
            if app_config.shortcut.enabled {
                register_quick_execution_shortcut(app_handle, &app_config.shortcut.quick_execution);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // 处理窗口关闭请求事件
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let label = window.label();
                
                if label == MAIN_WINDOW_LABEL {
                    // 从状态中获取应用配置
                    let state = window.try_state::<Mutex<AppConfigManager>>();
                    if let Some(state) = state {
                        let manager = state.lock().unwrap();
                        let close_behavior = manager.get_config().window.close_behavior.clone();
                        drop(manager); // 释放锁

                        match close_behavior {
                            CloseBehavior::MinimizeToTray => {
                                // 阻止关闭，隐藏窗口
                                api.prevent_close();
                                let _ = window.hide();
                            }
                            CloseBehavior::Quit => {
                                // 允许关闭，应用会退出
                            }
                        }
                    }
                } else if label == QUICK_EXECUTION_WINDOW_LABEL {
                    // 快速执行窗口关闭时仅隐藏
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // 应用配置相关命令
            get_app_config,
            update_app_config,
            update_window_config,
            update_shortcut_config,
            update_tray_config,
            // 错误日志相关命令
            log_frontend_error,
            list_error_logs,
            clear_error_logs,
            cleanup_old_error_logs,
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
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_, _| {});
}

/// 显示快速执行窗口
fn show_quick_execution_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(QUICK_EXECUTION_WINDOW_LABEL) {
        // 如果窗口已存在，显示并聚焦
        let _ = window.show();
        let _ = window.set_focus();
    }
    // 如果窗口不存在，它会在需要时自动创建（通过 tauri.conf.json 配置）
}

/// 解析快捷键字符串并注册
fn register_quick_execution_shortcut(app: &tauri::AppHandle, shortcut_str: &str) {
    // 解析快捷键字符串（格式如 "CommandOrControl+Shift+P"）
    let shortcut = parse_shortcut_string(shortcut_str);
    
    if let Some(shortcut) = shortcut {
        // 注册快捷键
        let app_handle = app.clone();
        if let Err(e) = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
            show_quick_execution_window(&app_handle);
        }) {
            eprintln!("注册快捷键失败: {}", e);
        }
    }
}

/// 解析快捷键字符串为 Shortcut 对象
fn parse_shortcut_string(s: &str) -> Option<Shortcut> {
    let parts: Vec<&str> = s.split('+').collect();
    if parts.is_empty() {
        return None;
    }

    let mut modifiers = Modifiers::empty();
    let mut code = None;

    for part in parts {
        match part.trim() {
            "CommandOrControl" | "CmdOrCtrl" => {
                modifiers |= Modifiers::SUPER;
            }
            "Command" | "Cmd" => {
                modifiers |= Modifiers::SUPER;
            }
            "Control" | "Ctrl" => {
                modifiers |= Modifiers::CONTROL;
            }
            "Shift" => {
                modifiers |= Modifiers::SHIFT;
            }
            "Alt" | "Option" => {
                modifiers |= Modifiers::ALT;
            }
            "Super" | "Meta" => {
                modifiers |= Modifiers::SUPER;
            }
            key => {
                // 尝试解析为按键代码
                code = match key.to_uppercase().as_str() {
                    "A" => Some(Code::KeyA),
                    "B" => Some(Code::KeyB),
                    "C" => Some(Code::KeyC),
                    "D" => Some(Code::KeyD),
                    "E" => Some(Code::KeyE),
                    "F" => Some(Code::KeyF),
                    "G" => Some(Code::KeyG),
                    "H" => Some(Code::KeyH),
                    "I" => Some(Code::KeyI),
                    "J" => Some(Code::KeyJ),
                    "K" => Some(Code::KeyK),
                    "L" => Some(Code::KeyL),
                    "M" => Some(Code::KeyM),
                    "N" => Some(Code::KeyN),
                    "O" => Some(Code::KeyO),
                    "P" => Some(Code::KeyP),
                    "Q" => Some(Code::KeyQ),
                    "R" => Some(Code::KeyR),
                    "S" => Some(Code::KeyS),
                    "T" => Some(Code::KeyT),
                    "U" => Some(Code::KeyU),
                    "V" => Some(Code::KeyV),
                    "W" => Some(Code::KeyW),
                    "X" => Some(Code::KeyX),
                    "Y" => Some(Code::KeyY),
                    "Z" => Some(Code::KeyZ),
                    "0" => Some(Code::Digit0),
                    "1" => Some(Code::Digit1),
                    "2" => Some(Code::Digit2),
                    "3" => Some(Code::Digit3),
                    "4" => Some(Code::Digit4),
                    "5" => Some(Code::Digit5),
                    "6" => Some(Code::Digit6),
                    "7" => Some(Code::Digit7),
                    "8" => Some(Code::Digit8),
                    "9" => Some(Code::Digit9),
                    "F1" => Some(Code::F1),
                    "F2" => Some(Code::F2),
                    "F3" => Some(Code::F3),
                    "F4" => Some(Code::F4),
                    "F5" => Some(Code::F5),
                    "F6" => Some(Code::F6),
                    "F7" => Some(Code::F7),
                    "F8" => Some(Code::F8),
                    "F9" => Some(Code::F9),
                    "F10" => Some(Code::F10),
                    "F11" => Some(Code::F11),
                    "F12" => Some(Code::F12),
                    "Space" => Some(Code::Space),
                    "Enter" => Some(Code::Enter),
                    "Escape" | "Esc" => Some(Code::Escape),
                    "Tab" => Some(Code::Tab),
                    "Backspace" => Some(Code::Backspace),
                    "Delete" => Some(Code::Delete),
                    "ArrowUp" | "Up" => Some(Code::ArrowUp),
                    "ArrowDown" | "Down" => Some(Code::ArrowDown),
                    "ArrowLeft" | "Left" => Some(Code::ArrowLeft),
                    "ArrowRight" | "Right" => Some(Code::ArrowRight),
                    _ => None,
                };
            }
        }
    }

    code.map(|c| Shortcut::new(Some(modifiers), c))
}
