//! 文件批量重命名脚本实现

use std::collections::HashMap;
use std::path::Path;

use serde_json::Value;

use crate::error::AppError;
use crate::script_api::{Script, ScriptContext, ScriptResult};

use super::operations::execute_rename;
use super::schema::{get_output_schema, get_params_schema};
use super::types::RenameMode;

/// 文件批量重命名脚本
pub struct FileRenameScript {
    id: String,
    name: String,
    description: String,
}

impl FileRenameScript {
    /// 创建新的文件重命名脚本实例
    pub fn new() -> Self {
        Self {
            id: "file_rename".to_string(),
            name: "文件批量重命名".to_string(),
            description: "批量重命名指定目录下的文件，支持添加前缀、后缀、文本替换和编号等功能"
                .to_string(),
        }
    }
}

impl Default for FileRenameScript {
    fn default() -> Self {
        Self::new()
    }
}

impl Script for FileRenameScript {
    fn id(&self) -> &str {
        &self.id
    }

    fn name(&self) -> &str {
        &self.name
    }

    fn description(&self) -> &str {
        &self.description
    }

    fn params_schema(&self) -> Vec<crate::script_api::ParamDefinition> {
        get_params_schema()
    }

    fn output_schema(&self) -> Vec<crate::script_api::OutputDefinition> {
        get_output_schema()
    }

    fn execute(&self, params: Value, _ctx: &ScriptContext) -> Result<ScriptResult, AppError> {
        // 获取目标目录
        let directory_str = params["directory"]
            .as_str()
            .ok_or_else(|| AppError::ValidationError("请选择目标目录".to_string()))?;
        let directory = Path::new(directory_str);

        // 验证目录存在
        if !directory.exists() {
            return Err(AppError::ValidationError(format!(
                "目录不存在: {}",
                directory_str
            )));
        }
        if !directory.is_dir() {
            return Err(AppError::ValidationError(format!(
                "路径不是目录: {}",
                directory_str
            )));
        }

        // 获取重命名模式
        let mode_str = params["mode"].as_str().unwrap_or("add_prefix");
        let mode = RenameMode::from_str(mode_str)
            .ok_or_else(|| AppError::ValidationError(format!("无效的重命名模式: {}", mode_str)))?;

        // 执行重命名
        let (success_count, fail_count) = execute_rename(directory, mode, &params)?;

        // 构建输出消息
        let output = format!(
            "文件重命名完成！成功: {} 个，失败: {} 个",
            success_count, fail_count
        );

        // 构建结构化输出
        let mut outputs = HashMap::new();
        outputs.insert(
            "success_count".to_string(),
            serde_json::json!(success_count),
        );
        outputs.insert("fail_count".to_string(), serde_json::json!(fail_count));

        if fail_count > 0 {
            Ok(ScriptResult {
                success: success_count > 0,
                output,
                outputs: Some(outputs),
                error: Some(format!("{} 个文件重命名失败", fail_count)),
            })
        } else {
            Ok(ScriptResult::success_with_outputs(output, outputs))
        }
    }
}
