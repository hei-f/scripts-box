//! 应用配置相关 Tauri 命令模块
//!
//! 提供应用配置的读写操作命令

use std::sync::Mutex;
use tauri::State;

use crate::config::{AppConfig, AppConfigManager, ShortcutConfig, TrayConfig, WindowConfig};
use crate::error::AppError;

/// 获取应用配置
///
/// 获取当前应用的完整配置信息
///
/// # 参数
/// - `state`: 应用配置管理器的共享状态
///
/// # 返回
/// 成功返回应用配置，失败返回 AppError
#[tauri::command]
pub fn get_app_config(state: State<'_, Mutex<AppConfigManager>>) -> Result<AppConfig, AppError> {
    let manager = state
        .lock()
        .map_err(|e| AppError::ConfigError(format!("获取应用配置管理器锁失败: {}", e)))?;

    Ok(manager.get_config().clone())
}

/// 更新应用配置
///
/// 更新应用的完整配置
///
/// # 参数
/// - `config`: 新的应用配置
/// - `state`: 应用配置管理器的共享状态
///
/// # 返回
/// 成功返回 Ok(())，失败返回 AppError
#[tauri::command]
pub fn update_app_config(
    config: AppConfig,
    state: State<'_, Mutex<AppConfigManager>>,
) -> Result<(), AppError> {
    let mut manager = state
        .lock()
        .map_err(|e| AppError::ConfigError(format!("获取应用配置管理器锁失败: {}", e)))?;

    manager.update_config(config)?;

    Ok(())
}

/// 更新窗口配置
///
/// 仅更新应用的窗口配置部分
///
/// # 参数
/// - `config`: 新的窗口配置
/// - `state`: 应用配置管理器的共享状态
///
/// # 返回
/// 成功返回 Ok(())，失败返回 AppError
#[tauri::command]
pub fn update_window_config(
    config: WindowConfig,
    state: State<'_, Mutex<AppConfigManager>>,
) -> Result<(), AppError> {
    let mut manager = state
        .lock()
        .map_err(|e| AppError::ConfigError(format!("获取应用配置管理器锁失败: {}", e)))?;

    manager.update_window_config(config)?;

    Ok(())
}

/// 更新快捷键配置
///
/// 仅更新应用的快捷键配置部分
///
/// # 参数
/// - `config`: 新的快捷键配置
/// - `state`: 应用配置管理器的共享状态
///
/// # 返回
/// 成功返回 Ok(())，失败返回 AppError
#[tauri::command]
pub fn update_shortcut_config(
    config: ShortcutConfig,
    state: State<'_, Mutex<AppConfigManager>>,
) -> Result<(), AppError> {
    let mut manager = state
        .lock()
        .map_err(|e| AppError::ConfigError(format!("获取应用配置管理器锁失败: {}", e)))?;

    manager.update_shortcut_config(config)?;

    Ok(())
}

/// 更新托盘配置
///
/// 仅更新应用的托盘配置部分
///
/// # 参数
/// - `config`: 新的托盘配置
/// - `state`: 应用配置管理器的共享状态
///
/// # 返回
/// 成功返回 Ok(())，失败返回 AppError
#[tauri::command]
pub fn update_tray_config(
    config: TrayConfig,
    state: State<'_, Mutex<AppConfigManager>>,
) -> Result<(), AppError> {
    let mut manager = state
        .lock()
        .map_err(|e| AppError::ConfigError(format!("获取应用配置管理器锁失败: {}", e)))?;

    manager.update_tray_config(config)?;

    Ok(())
}
