//! 错误类型定义模块
//!
//! 定义应用统一的错误类型体系，支持跨 IPC 边界传递

use serde::{Serialize, Serializer};
use std::io;
use thiserror::Error;

/// 应用统一错误类型
///
/// 使用 thiserror 派生 Error trait，所有变体支持序列化以跨 IPC 边界传递
#[derive(Debug, Error)]
pub enum AppError {
    /// IO 错误
    #[error("IO 错误: {0}")]
    IoError(#[from] io::Error),

    /// 数据库错误
    #[error("数据库错误: {0}")]
    DatabaseError(String),

    /// 配置错误
    #[error("配置错误: {0}")]
    ConfigError(String),

    /// 脚本执行错误
    #[error("脚本执行错误: {0}")]
    ScriptError(String),

    /// 资源未找到错误
    #[error("资源未找到: {0}")]
    NotFoundError(String),

    /// 参数验证错误
    #[error("参数验证错误: {0}")]
    ValidationError(String),

    /// 文件系统错误
    #[error("文件系统错误: {0}")]
    FileSystemError(String),

    /// 工作流执行错误
    #[error("工作流执行错误: {0}")]
    WorkflowError(String),

    /// 节点执行错误
    #[error("节点执行错误: {0}")]
    NodeExecutionError(String),

    /// 工作流验证错误
    #[error("工作流验证错误: {0}")]
    WorkflowValidationError(String),

    /// 检测到循环依赖
    #[error("检测到循环依赖")]
    CycleDetectedError,
}

/// 为 AppError 实现 Serialize trait
///
/// 用于跨 IPC 边界传递错误信息到前端
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // 序列化为包含类型和消息的对象
        use serde::ser::SerializeStruct;

        let (error_type, message) = match self {
            AppError::IoError(e) => ("IoError", e.to_string()),
            AppError::DatabaseError(msg) => ("DatabaseError", msg.clone()),
            AppError::ConfigError(msg) => ("ConfigError", msg.clone()),
            AppError::ScriptError(msg) => ("ScriptError", msg.clone()),
            AppError::NotFoundError(msg) => ("NotFoundError", msg.clone()),
            AppError::ValidationError(msg) => ("ValidationError", msg.clone()),
            AppError::FileSystemError(msg) => ("FileSystemError", msg.clone()),
            AppError::WorkflowError(msg) => ("WorkflowError", msg.clone()),
            AppError::NodeExecutionError(msg) => ("NodeExecutionError", msg.clone()),
            AppError::WorkflowValidationError(msg) => ("WorkflowValidationError", msg.clone()),
            AppError::CycleDetectedError => ("CycleDetectedError", "检测到循环依赖".to_string()),
        };

        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("type", error_type)?;
        state.serialize_field("message", &message)?;
        state.end()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_io_error_conversion() {
        let io_err = io::Error::new(io::ErrorKind::NotFound, "文件未找到");
        let app_err: AppError = io_err.into();

        match app_err {
            AppError::IoError(_) => (),
            _ => panic!("期望 IoError 变体"),
        }
    }

    #[test]
    fn test_error_display() {
        let err = AppError::NotFoundError("脚本不存在".to_string());
        assert_eq!(format!("{}", err), "资源未找到: 脚本不存在");
    }

    #[test]
    fn test_serialize() {
        let err = AppError::ValidationError("参数不能为空".to_string());
        let json = serde_json::to_string(&err).unwrap();

        assert!(json.contains("ValidationError"));
        assert!(json.contains("参数不能为空"));
    }

    #[test]
    fn test_database_error_display() {
        let err = AppError::DatabaseError("连接失败".to_string());
        assert_eq!(format!("{}", err), "数据库错误: 连接失败");
    }

    #[test]
    fn test_config_error_display() {
        let err = AppError::ConfigError("配置文件损坏".to_string());
        assert_eq!(format!("{}", err), "配置错误: 配置文件损坏");
    }

    #[test]
    fn test_script_error_display() {
        let err = AppError::ScriptError("执行超时".to_string());
        assert_eq!(format!("{}", err), "脚本执行错误: 执行超时");
    }

    #[test]
    fn test_filesystem_error_display() {
        let err = AppError::FileSystemError("权限不足".to_string());
        assert_eq!(format!("{}", err), "文件系统错误: 权限不足");
    }

    #[test]
    fn test_serialize_all_variants() {
        // 测试所有错误类型的序列化
        let errors = vec![
            AppError::IoError(io::Error::new(io::ErrorKind::PermissionDenied, "permission denied")),
            AppError::DatabaseError("db error".to_string()),
            AppError::ConfigError("config error".to_string()),
            AppError::ScriptError("script error".to_string()),
            AppError::NotFoundError("not found".to_string()),
            AppError::ValidationError("validation error".to_string()),
            AppError::FileSystemError("fs error".to_string()),
            AppError::WorkflowError("workflow error".to_string()),
            AppError::NodeExecutionError("node error".to_string()),
            AppError::WorkflowValidationError("validation error".to_string()),
            AppError::CycleDetectedError,
        ];

        for err in errors {
            let json = serde_json::to_string(&err);
            assert!(json.is_ok(), "序列化失败: {:?}", err);
        }
    }

    #[test]
    fn test_serialize_structure() {
        let err = AppError::DatabaseError("test message".to_string());
        let json = serde_json::to_string(&err).unwrap();

        // 验证 JSON 结构
        let value: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(value["type"], "DatabaseError");
        assert_eq!(value["message"], "test message");
    }
}
