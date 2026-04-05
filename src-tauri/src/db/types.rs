//! 数据库类型定义
//!
//! 定义执行历史和错误日志的数据结构

use serde::{Deserialize, Serialize};

/// 错误日志记录
///
/// 存储应用的错误日志，用于问题排查
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorLog {
    /// 记录 ID（数据库自动生成）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    /// 错误来源（frontend / backend）
    pub source: String,
    /// 错误类型
    pub error_type: String,
    /// 错误消息
    pub message: String,
    /// 错误堆栈（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack_trace: Option<String>,
    /// 上下文信息（JSON 格式，可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
    /// 记录时间（Unix 时间戳，毫秒）
    pub created_at: i64,
}

/// 执行历史记录
///
/// 存储脚本的执行历史，包括参数、输出、错误信息等
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionRecord {
    /// 记录 ID（数据库自动生成）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    /// 脚本 ID
    pub script_id: String,
    /// 执行参数（JSON 序列化）
    pub params: String,
    /// 执行状态：success / failure
    pub status: String,
    /// 输出内容
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    /// 错误信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// 执行时间（Unix 时间戳，毫秒）
    pub executed_at: i64,
    /// 执行时长（毫秒）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
}

/// 执行状态常量
pub const STATUS_SUCCESS: &str = "success";
pub const STATUS_FAILURE: &str = "failure";

/// 创建成功状态的执行记录
///
/// # 参数
/// - `script_id`: 脚本 ID
/// - `params`: 执行参数（JSON 字符串）
/// - `output`: 输出内容
/// - `executed_at`: 执行时间（Unix 时间戳，毫秒）
/// - `duration_ms`: 执行时长（毫秒）
///
/// # 返回
/// 返回成功状态的 ExecutionRecord
#[allow(dead_code)]
pub fn create_success_record(
    script_id: String,
    params: String,
    output: String,
    executed_at: i64,
    duration_ms: i64,
) -> ExecutionRecord {
    ExecutionRecord {
        id: None,
        script_id,
        params,
        status: STATUS_SUCCESS.to_string(),
        output: Some(output),
        error: None,
        executed_at,
        duration_ms: Some(duration_ms),
    }
}

/// 创建失败状态的执行记录
///
/// # 参数
/// - `script_id`: 脚本 ID
/// - `params`: 执行参数（JSON 字符串）
/// - `error`: 错误信息
/// - `executed_at`: 执行时间（Unix 时间戳，毫秒）
/// - `duration_ms`: 执行时长（毫秒）
///
/// # 返回
/// 返回失败状态的 ExecutionRecord
#[allow(dead_code)]
pub fn create_failure_record(
    script_id: String,
    params: String,
    error: String,
    executed_at: i64,
    duration_ms: i64,
) -> ExecutionRecord {
    ExecutionRecord {
        id: None,
        script_id,
        params,
        status: STATUS_FAILURE.to_string(),
        output: None,
        error: Some(error),
        executed_at,
        duration_ms: Some(duration_ms),
    }
}
