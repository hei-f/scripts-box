//! 脚本执行相关 Tauri 命令模块
//!
//! 提供脚本列表查询、参数获取和脚本执行功能

use serde_json::Value;
use std::sync::Mutex;
use std::time::Instant;
use tauri::State;

use crate::db::{create_failure_record, create_success_record, Database, ExecutionRecord};
use crate::error::AppError;
use crate::registry::ScriptRegistry;
use crate::script_api::{ParamDefinition, ScriptContext, ScriptInfo, ScriptResult};

/// 列出所有脚本元信息
///
/// 获取注册中心中所有脚本的元信息列表（ID、名称、描述）
///
/// # 参数
/// - `state`: 脚本注册中心的共享状态
///
/// # 返回
/// 成功返回脚本元信息列表，失败返回 AppError
#[tauri::command]
pub fn list_scripts(state: State<'_, Mutex<ScriptRegistry>>) -> Result<Vec<ScriptInfo>, AppError> {
    let registry = state
        .lock()
        .map_err(|e| AppError::ScriptError(format!("获取脚本注册中心锁失败: {}", e)))?;

    // 遍历所有脚本，提取元信息
    let scripts: Vec<ScriptInfo> = registry
        .list()
        .iter()
        .map(|script| ScriptInfo {
            id: script.id().to_string(),
            name: script.name().to_string(),
            description: script.description().to_string(),
        })
        .collect();

    Ok(scripts)
}

/// 获取脚本参数定义
///
/// 根据脚本ID获取该脚本的参数定义列表，用于前端动态表单渲染
///
/// # 参数
/// - `id`: 脚本ID
/// - `state`: 脚本注册中心的共享状态
///
/// # 返回
/// 成功返回参数定义列表，脚本不存在返回 AppError::NotFoundError
#[tauri::command]
pub fn get_script_params(
    id: String,
    state: State<'_, Mutex<ScriptRegistry>>,
) -> Result<Vec<ParamDefinition>, AppError> {
    let registry = state
        .lock()
        .map_err(|e| AppError::ScriptError(format!("获取脚本注册中心锁失败: {}", e)))?;

    // 查找脚本
    let script = registry
        .get(&id)
        .ok_or_else(|| AppError::NotFoundError(format!("脚本不存在: {}", id)))?;

    // 获取参数定义
    Ok(script.params_schema())
}

/// 执行脚本
///
/// 执行指定ID的脚本，并将执行结果写入数据库
///
/// # 参数
/// - `id`: 脚本ID（所有权类型，符合 Tauri v2 异步命令要求）
/// - `params`: 脚本参数（JSON格式，所有权类型）
/// - `registry`: 脚本注册中心的共享状态
/// - `db`: 数据库的共享状态
///
/// # 返回
/// 成功返回脚本执行结果，失败返回 AppError
///
/// # 注意
/// - 异步命令参数使用所有权类型（String、Value）而非引用类型
/// - 执行结果会自动记录到数据库的 execution_history 表
#[tauri::command]
pub async fn execute_script(
    id: String,
    params: Value,
    registry: State<'_, Mutex<ScriptRegistry>>,
    db: State<'_, Mutex<Database>>,
) -> Result<ScriptResult, AppError> {
    // 记录开始时间
    let start_time = Instant::now();

    // 获取脚本实例
    let script = {
        let registry_guard = registry
            .lock()
            .map_err(|e| AppError::ScriptError(format!("获取脚本注册中心锁失败: {}", e)))?;

        registry_guard
            .get(&id)
            .ok_or_else(|| AppError::NotFoundError(format!("脚本不存在: {}", id)))?
    };

    // 创建执行上下文
    let ctx = ScriptContext::default();

    // 执行脚本
    let result = script.execute(params.clone(), &ctx);

    // 计算执行时长（毫秒）
    let duration_ms = start_time.elapsed().as_millis() as i64;

    // 获取当前时间戳（毫秒）
    let executed_at = chrono::Utc::now().timestamp_millis();

    // 构建执行记录并写入数据库
    let record: ExecutionRecord = match &result {
        Ok(script_result) => {
            if script_result.success {
                create_success_record(
                    id.clone(),
                    params.to_string(),
                    script_result.output.clone(),
                    executed_at,
                    duration_ms,
                )
            } else {
                create_failure_record(
                    id.clone(),
                    params.to_string(),
                    script_result
                        .error
                        .clone()
                        .unwrap_or_else(|| "未知错误".to_string()),
                    executed_at,
                    duration_ms,
                )
            }
        }
        Err(e) => create_failure_record(
            id.clone(),
            params.to_string(),
            e.to_string(),
            executed_at,
            duration_ms,
        ),
    };

    // 写入数据库
    {
        let db_guard = db
            .lock()
            .map_err(|e| AppError::DatabaseError(format!("获取数据库锁失败: {}", e)))?;
        db_guard
            .insert_history(record)
            .map_err(|e| AppError::DatabaseError(format!("写入执行历史失败: {}", e)))?;
    }

    // 返回执行结果
    result
}
