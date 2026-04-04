//! 脚本配置相关 Tauri 命令模块
//!
//! 提供脚本配置的 CRUD 操作命令，作为前端操作配置文件的桥梁

use std::sync::Mutex;
use tauri::State;

use crate::config::{ScriptConfig, ScriptConfigManager};
use crate::error::AppError;

/// 列出所有脚本配置
///
/// 获取当前系统中所有脚本配置的列表
///
/// # 参数
/// - `state`: 脚本配置管理器的共享状态
///
/// # 返回
/// 成功返回脚本配置列表，失败返回 AppError
#[tauri::command]
pub fn list_script_configs(
    state: State<'_, Mutex<ScriptConfigManager>>,
) -> Result<Vec<ScriptConfig>, AppError> {
    let manager = state.lock().map_err(|e| {
        AppError::ConfigError(format!("获取配置管理器锁失败: {}", e))
    })?;

    Ok(manager.list_scripts().to_vec())
}

/// 获取单个脚本配置
///
/// 根据ID获取指定脚本的配置信息
///
/// # 参数
/// - `id`: 脚本ID
/// - `state`: 脚本配置管理器的共享状态
///
/// # 返回
/// 成功返回脚本配置，未找到返回 AppError::NotFoundError
#[tauri::command]
pub fn get_script_config(
    id: String,
    state: State<'_, Mutex<ScriptConfigManager>>,
) -> Result<ScriptConfig, AppError> {
    let manager = state.lock().map_err(|e| {
        AppError::ConfigError(format!("获取配置管理器锁失败: {}", e))
    })?;

    manager
        .get_script(&id)
        .cloned()
        .ok_or_else(|| AppError::NotFoundError(format!("脚本不存在: {}", id)))
}

/// 创建脚本配置
///
/// 添加新的脚本配置到系统中
///
/// # 参数
/// - `config`: 要创建的脚本配置
/// - `state`: 脚本配置管理器的共享状态
///
/// # 返回
/// 成功返回 Ok(())，ID 重复或验证失败返回 AppError
#[tauri::command]
pub fn create_script_config(
    config: ScriptConfig,
    state: State<'_, Mutex<ScriptConfigManager>>,
) -> Result<(), AppError> {
    let mut manager = state.lock().map_err(|e| {
        AppError::ConfigError(format!("获取配置管理器锁失败: {}", e))
    })?;

    // 添加脚本配置
    manager.add_script(config)?;

    // 保存配置到文件
    manager.save()?;

    Ok(())
}

/// 更新脚本配置
///
/// 更新已存在的脚本配置
///
/// # 参数
/// - `id`: 要更新的脚本ID
/// - `config`: 新的脚本配置
/// - `state`: 脚本配置管理器的共享状态
///
/// # 返回
/// 成功返回 Ok(())，脚本不存在或验证失败返回 AppError
#[tauri::command]
pub fn update_script_config(
    id: String,
    config: ScriptConfig,
    state: State<'_, Mutex<ScriptConfigManager>>,
) -> Result<(), AppError> {
    let mut manager = state.lock().map_err(|e| {
        AppError::ConfigError(format!("获取配置管理器锁失败: {}", e))
    })?;

    // 更新脚本配置
    manager.update_script(&id, config)?;

    // 保存配置到文件
    manager.save()?;

    Ok(())
}

/// 删除脚本配置
///
/// 从系统中删除指定的脚本配置
///
/// # 参数
/// - `id`: 要删除的脚本ID
/// - `state`: 脚本配置管理器的共享状态
///
/// # 返回
/// 成功返回 Ok(())，脚本不存在返回 AppError::NotFoundError
#[tauri::command]
pub fn delete_script_config(
    id: String,
    state: State<'_, Mutex<ScriptConfigManager>>,
) -> Result<(), AppError> {
    let mut manager = state.lock().map_err(|e| {
        AppError::ConfigError(format!("获取配置管理器锁失败: {}", e))
    })?;

    // 删除脚本配置
    manager.delete_script(&id)?;

    // 保存配置到文件
    manager.save()?;

    Ok(())
}
