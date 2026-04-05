//! 工作流相关 Tauri 命令模块
//!
//! 提供工作流的 CRUD 操作和执行功能

use serde_json::Value;
use std::sync::Mutex;
use tauri::State;

use crate::db::Database;
use crate::error::AppError;
use crate::registry::ScriptRegistry;
use crate::script_api::OutputDefinition;
use crate::workflow::executor::WorkflowExecutor;
use crate::workflow::types::{Workflow, WorkflowInfo, WorkflowResult};

/// 创建工作流
///
/// 将工作流定义保存到数据库
///
/// # 参数
/// - `workflow`: 工作流定义（所有权类型，符合 Tauri v2 异步命令要求）
/// - `db`: 数据库的共享状态
///
/// # 返回
/// 成功返回 ()，失败返回 AppError
#[tauri::command]
pub async fn create_workflow(
    workflow: Workflow,
    db: State<'_, Mutex<Database>>,
) -> Result<(), AppError> {
    let db_guard = db
        .lock()
        .map_err(|e| AppError::DatabaseError(format!("获取数据库锁失败: {}", e)))?;

    db_guard.insert_workflow(&workflow)?;

    Ok(())
}

/// 获取工作流
///
/// 根据工作流 ID 获取完整的工作流定义
///
/// # 参数
/// - `id`: 工作流 ID（所有权类型，符合 Tauri v2 异步命令要求）
/// - `db`: 数据库的共享状态
///
/// # 返回
/// 成功返回工作流定义，不存在返回 AppError::NotFoundError
#[tauri::command]
pub async fn get_workflow(
    id: String,
    db: State<'_, Mutex<Database>>,
) -> Result<Workflow, AppError> {
    let db_guard = db
        .lock()
        .map_err(|e| AppError::DatabaseError(format!("获取数据库锁失败: {}", e)))?;

    let workflow = db_guard
        .get_workflow(&id)?
        .ok_or_else(|| AppError::NotFoundError(format!("工作流不存在: {}", id)))?;

    Ok(workflow)
}

/// 列出所有工作流
///
/// 获取所有工作流的基本信息列表
///
/// # 参数
/// - `db`: 数据库的共享状态
///
/// # 返回
/// 成功返回工作流信息列表，失败返回 AppError
#[tauri::command]
pub async fn list_workflows(db: State<'_, Mutex<Database>>) -> Result<Vec<WorkflowInfo>, AppError> {
    let db_guard = db
        .lock()
        .map_err(|e| AppError::DatabaseError(format!("获取数据库锁失败: {}", e)))?;

    let workflows = db_guard.list_workflows()?;

    Ok(workflows)
}

/// 更新工作流
///
/// 更新已存在的工作流定义
///
/// # 参数
/// - `workflow`: 工作流定义（所有权类型，符合 Tauri v2 异步命令要求）
/// - `db`: 数据库的共享状态
///
/// # 返回
/// 成功返回 ()，工作流不存在返回 AppError::NotFoundError
#[tauri::command]
pub async fn update_workflow(
    workflow: Workflow,
    db: State<'_, Mutex<Database>>,
) -> Result<(), AppError> {
    let db_guard = db
        .lock()
        .map_err(|e| AppError::DatabaseError(format!("获取数据库锁失败: {}", e)))?;

    db_guard.update_workflow(&workflow)?;

    Ok(())
}

/// 删除工作流
///
/// 根据 ID 删除工作流
///
/// # 参数
/// - `id`: 工作流 ID（所有权类型，符合 Tauri v2 异步命令要求）
/// - `db`: 数据库的共享状态
///
/// # 返回
/// 成功返回 ()，工作流不存在返回 AppError::NotFoundError
#[tauri::command]
pub async fn delete_workflow(id: String, db: State<'_, Mutex<Database>>) -> Result<(), AppError> {
    let db_guard = db
        .lock()
        .map_err(|e| AppError::DatabaseError(format!("获取数据库锁失败: {}", e)))?;

    db_guard.delete_workflow(&id)?;

    Ok(())
}

/// 执行工作流
///
/// 执行指定 ID 的工作流，传入参数并返回执行结果
///
/// # 参数
/// - `id`: 工作流 ID（所有权类型，符合 Tauri v2 异步命令要求）
/// - `params`: 工作流输入参数（JSON 对象，所有权类型）
/// - `registry`: 脚本注册中心的共享状态
/// - `db`: 数据库的共享状态
///
/// # 返回
/// 成功返回工作流执行结果，失败返回 AppError
///
/// # 注意
/// - 异步命令参数使用所有权类型（String、Value）而非引用类型
/// - 执行过程会验证工作流完整性、检测循环依赖
#[tauri::command]
pub async fn execute_workflow(
    id: String,
    params: Value,
    registry: State<'_, Mutex<ScriptRegistry>>,
    db: State<'_, Mutex<Database>>,
) -> Result<WorkflowResult, AppError> {
    // 获取工作流定义
    let workflow = {
        let db_guard = db
            .lock()
            .map_err(|e| AppError::DatabaseError(format!("获取数据库锁失败: {}", e)))?;

        db_guard
            .get_workflow(&id)?
            .ok_or_else(|| AppError::NotFoundError(format!("工作流不存在: {}", id)))?
    };

    // 在单独的作用域中执行工作流，确保锁在 await 之前释放
    let result = {
        let registry_guard = registry
            .lock()
            .map_err(|e| AppError::ScriptError(format!("获取脚本注册中心锁失败: {}", e)))?;
        let db_guard = db
            .lock()
            .map_err(|e| AppError::DatabaseError(format!("获取数据库锁失败: {}", e)))?;

        // 创建工作流执行器
        let executor = WorkflowExecutor::new(&registry_guard, &db_guard);

        // 执行工作流（同步执行）
        executor.execute_workflow(workflow, params)?
    };

    Ok(result)
}

/// 获取脚本输出模式
///
/// 根据脚本 ID 获取脚本的结构化输出定义
///
/// # 参数
/// - `id`: 脚本 ID（所有权类型，符合 Tauri v2 要求）
/// - `registry`: 脚本注册中心的共享状态
///
/// # 返回
/// 成功返回输出定义列表，脚本不存在返回 AppError::NotFoundError
#[tauri::command]
pub fn get_script_output_schema(
    id: String,
    registry: State<'_, Mutex<ScriptRegistry>>,
) -> Result<Vec<OutputDefinition>, AppError> {
    let registry_guard = registry
        .lock()
        .map_err(|e| AppError::ScriptError(format!("获取脚本注册中心锁失败: {}", e)))?;

    let script = registry_guard
        .get(&id)
        .ok_or_else(|| AppError::NotFoundError(format!("脚本不存在: {}", id)))?;

    Ok(script.output_schema())
}
