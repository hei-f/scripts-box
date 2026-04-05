//! 错误日志命令模块
//!
//! 提供前端调用后端错误日志功能的 Tauri 命令

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::{AppHandle, Manager, State};

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

/// 写入调试日志到文件
///
/// 将调试信息写入应用的配置目录下的 debug.log 文件
///
/// # 参数
/// - `tag`: 日志标签
/// - `data`: 日志数据（JSON 字符串）
/// - `app_handle`: Tauri 应用句柄
///
/// # 返回
/// 成功返回 ()，失败返回 AppError
#[tauri::command]
pub fn write_debug_log(
    tag: String,
    data: String,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    use std::io::{Error as IoError, ErrorKind};

    let config_dir = app_handle
        .path()
        .config_dir()
        .map_err(|e| IoError::new(ErrorKind::Other, format!("获取配置目录失败: {}", e)))?;

    let log_path: PathBuf = config_dir.join("debug.log");
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let log_line = format!("[{}] [{}] {}\n", timestamp, tag, data);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)?;

    file.write_all(log_line.as_bytes())?;

    Ok(())
}

/// 清空调试日志文件
///
/// # 参数
/// - `app_handle`: Tauri 应用句柄
///
/// # 返回
/// 成功返回 ()，失败返回 AppError
#[tauri::command]
pub fn clear_debug_log(app_handle: AppHandle) -> Result<(), AppError> {
    use std::io::{Error as IoError, ErrorKind};

    let config_dir = app_handle
        .path()
        .config_dir()
        .map_err(|e| IoError::new(ErrorKind::Other, format!("获取配置目录失败: {}", e)))?;

    let log_path: PathBuf = config_dir.join("debug.log");

    if log_path.exists() {
        std::fs::remove_file(&log_path)?;
    }

    Ok(())
}

/// 读取调试日志文件内容
///
/// # 参数
/// - `app_handle`: Tauri 应用句柄
///
/// # 返回
/// 成功返回日志内容字符串，失败返回 AppError
#[tauri::command]
pub fn read_debug_log(app_handle: AppHandle) -> Result<String, AppError> {
    use std::io::{Error as IoError, ErrorKind};

    let config_dir = app_handle
        .path()
        .config_dir()
        .map_err(|e| IoError::new(ErrorKind::Other, format!("获取配置目录失败: {}", e)))?;

    let log_path: PathBuf = config_dir.join("debug.log");

    if !log_path.exists() {
        return Ok(String::new());
    }

    let content = std::fs::read_to_string(&log_path)?;
    Ok(content)
}

/// 打开开发者工具窗口
///
/// 如果窗口已存在则显示并聚焦，否则创建新窗口
///
/// # 参数
/// - `app_handle`: Tauri 应用句柄
///
/// # 返回
/// 成功返回 ()，失败返回 AppError
#[tauri::command]
pub fn open_devtools_window(app_handle: AppHandle) -> Result<(), AppError> {
    use crate::constants::DEVTOOLS_WINDOW_LABEL;
    use tauri::Manager;
    use std::io::{Error as IoError, ErrorKind};

    if let Some(window) = app_handle.get_webview_window(DEVTOOLS_WINDOW_LABEL) {
        window.show().map_err(|e| IoError::new(ErrorKind::Other, format!("显示窗口失败: {}", e)))?;
        window.set_focus().map_err(|e| IoError::new(ErrorKind::Other, format!("聚焦窗口失败: {}", e)))?;
    }
    // 如果窗口不存在，Tauri 会根据 tauri.conf.json 配置自动创建

    Ok(())
}

/// 发送实时日志事件到开发者工具窗口
///
/// # 参数
/// - `tag`: 日志标签
/// - `data`: 日志数据（JSON 字符串）
/// - `app_handle`: Tauri 应用句柄
///
/// # 返回
/// 成功返回 ()，失败返回 AppError
#[tauri::command]
pub fn emit_devtools_log(
    tag: String,
    data: String,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    use tauri::Emitter;
    use serde_json::Value as JsonValue;
    use std::io::{Error as IoError, ErrorKind};

    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();

    // 解析 data 为 JSON
    let json_data: JsonValue = serde_json::from_str(&data).unwrap_or(JsonValue::String(data.clone()));

    let payload = serde_json::json!({
        "timestamp": timestamp,
        "tag": tag,
        "data": json_data
    });

    app_handle
        .emit("devtools-log", payload)
        .map_err(|e| IoError::new(ErrorKind::Other, format!("发送事件失败: {}", e)))?;

    Ok(())
}
