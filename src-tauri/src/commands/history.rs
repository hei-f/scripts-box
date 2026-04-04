//! 执行历史相关 Tauri 命令
//!
//! 提供执行历史的查询、删除和清空功能

use std::sync::Mutex;

use crate::db::{Database, ExecutionRecord};
use crate::error::AppError;
use tauri::State;

/// 默认查询记录数量限制
const DEFAULT_LIMIT: i64 = 100;

/// 查询执行历史
///
/// # 参数
/// - `script_id`: 可选的脚本 ID，用于过滤特定脚本的执行历史
/// - `limit`: 返回记录数量限制，默认为 100
/// - `state`: Tauri 管理的数据库状态
///
/// # 返回
/// 成功返回执行记录列表，失败返回 AppError
#[tauri::command]
pub fn list_execution_history(
    script_id: Option<String>,
    limit: Option<i64>,
    state: State<'_, Mutex<Database>>,
) -> Result<Vec<ExecutionRecord>, AppError> {
    // 使用默认限制值，确保 limit 为正数
    let effective_limit = limit.unwrap_or(DEFAULT_LIMIT).max(1);

    let db = state.lock().map_err(|e| AppError::DatabaseError(format!("数据库锁定失败: {}", e)))?;
    db.list_history(script_id.as_deref(), effective_limit)
}

/// 删除执行历史记录
///
/// # 参数
/// - `id`: 记录 ID
/// - `state`: Tauri 管理的数据库状态
///
/// # 返回
/// 成功返回 ()，失败返回 AppError
#[tauri::command]
pub fn delete_execution_history(id: i64, state: State<'_, Mutex<Database>>) -> Result<(), AppError> {
    let db = state.lock().map_err(|e| AppError::DatabaseError(format!("数据库锁定失败: {}", e)))?;
    db.delete_history(id)
}

/// 清空执行历史
///
/// # 参数
/// - `script_id`: 可选的脚本 ID，如果提供则只清空该脚本的执行历史
/// - `state`: Tauri 管理的数据库状态
///
/// # 返回
/// 成功返回 ()，失败返回 AppError
#[tauri::command]
pub fn clear_execution_history(
    script_id: Option<String>,
    state: State<'_, Mutex<Database>>,
) -> Result<(), AppError> {
    let db = state.lock().map_err(|e| AppError::DatabaseError(format!("数据库锁定失败: {}", e)))?;
    db.clear_history(script_id.as_deref())
}
