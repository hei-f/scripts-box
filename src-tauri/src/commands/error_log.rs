//! 错误日志命令模块
//!
//! 提供前端调用后端错误日志功能的 Tauri 命令

use std::sync::Mutex;

use tauri::State;

use crate::db::{Database, ErrorLog};
use crate::error::AppError;

/// 记录前端错误日志
///
/// # 参数
/// - `error_type`: 错误类型
/// - `message`: 错误消息
/// - `stack_trace`: 错误堆栈（可选）
/// - `context`: 上下文信息（JSON 字符串，可选）
/// - `db`: 数据库状态
///
/// # 返回
/// 成功返回记录 ID，失败返回 AppError
#[tauri::command]
pub fn log_frontend_error(
    error_type: String,
    message: String,
    stack_trace: Option<String>,
    context: Option<String>,
    db: State<'_, Mutex<Database>>,
) -> Result<i64, AppError> {
    let created_at = chrono::Utc::now().timestamp_millis();

    let log = ErrorLog {
        id: None,
        source: "frontend".to_string(),
        error_type,
        message,
        stack_trace,
        context,
        created_at,
    };

    let db = db.lock().map_err(|e| AppError::DatabaseError(format!("数据库锁定失败: {}", e)))?;
    db.insert_error_log(log)
}

/// 获取错误日志列表
///
/// # 参数
/// - `limit`: 返回记录数量限制（默认 100）
/// - `db`: 数据库状态
///
/// # 返回
/// 成功返回错误日志列表，失败返回 AppError
#[tauri::command]
pub fn list_error_logs(
    limit: Option<i64>,
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<ErrorLog>, AppError> {
    let limit = limit.unwrap_or(100);
    let db = db.lock().map_err(|e| AppError::DatabaseError(format!("数据库锁定失败: {}", e)))?;
    db.list_error_logs(limit)
}

/// 清空错误日志
///
/// # 参数
/// - `db`: 数据库状态
///
/// # 返回
/// 成功返回 ()，失败返回 AppError
#[tauri::command]
pub fn clear_error_logs(db: State<'_, Mutex<Database>>) -> Result<(), AppError> {
    let db = db.lock().map_err(|e| AppError::DatabaseError(format!("数据库锁定失败: {}", e)))?;
    db.clear_error_logs()
}

/// 清理过期的错误日志
///
/// 删除指定天数之前的错误日志
///
/// # 参数
/// - `days_to_keep`: 保留天数（默认 7 天）
/// - `db`: 数据库状态
///
/// # 返回
/// 成功返回删除的记录数，失败返回 AppError
#[tauri::command]
pub fn cleanup_old_error_logs(
    days_to_keep: Option<i64>,
    db: State<'_, Mutex<Database>>,
) -> Result<usize, AppError> {
    let days = days_to_keep.unwrap_or(7);
    let db = db.lock().map_err(|e| AppError::DatabaseError(format!("数据库锁定失败: {}", e)))?;
    db.cleanup_old_error_logs(days)
}
