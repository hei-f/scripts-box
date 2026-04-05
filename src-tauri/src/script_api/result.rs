//! 脚本执行结果
//!
//! 封装脚本执行的输出信息

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// 脚本执行结果
///
/// 封装脚本执行的输出信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptResult {
    /// 执行是否成功
    pub success: bool,
    /// 输出内容（用于 UI 显示）
    pub output: String,
    /// 结构化输出字段（用于工作流节点间传递）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outputs: Option<HashMap<String, Value>>,
    /// 错误信息（执行失败时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ScriptResult {
    /// 创建成功结果
    pub fn success(output: String) -> Self {
        Self {
            success: true,
            output,
            outputs: None,
            error: None,
        }
    }

    /// 创建带结构化输出的成功结果
    pub fn success_with_outputs(output: String, outputs: HashMap<String, Value>) -> Self {
        Self {
            success: true,
            output,
            outputs: Some(outputs),
            error: None,
        }
    }

    /// 创建失败结果
    pub fn failure(error: String) -> Self {
        Self {
            success: false,
            output: String::new(),
            outputs: None,
            error: Some(error),
        }
    }
}
