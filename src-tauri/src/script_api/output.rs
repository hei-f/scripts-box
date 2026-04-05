//! 输出类型定义
//!
//! 定义脚本输出字段相关的数据结构

use serde::{Deserialize, Serialize};

/// 输出类型枚举
///
/// 定义脚本输出字段支持的数据类型，用于工作流节点间的类型匹配
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OutputType {
    /// 文本类型
    Text,
    /// 数字类型
    Number,
    /// 布尔类型
    Boolean,
    /// JSON 对象类型
    Json,
}

/// 输出字段定义结构体
///
/// 定义脚本的结构化输出字段，用于工作流节点间的参数传递
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputDefinition {
    /// 字段名称（用于作为输出的 key）
    pub name: String,
    /// 显示标签（用于前端显示）
    pub label: String,
    /// 字段类型（同时支持 camelCase 和 snake_case 以兼容旧数据）
    #[serde(alias = "output_type")]
    pub output_type: OutputType,
    /// 字段描述
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}
