//! 参数类型定义
//!
//! 定义脚本参数相关的数据结构

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// 选择项定义
///
/// 用于 Select 和 MultiSelect 类型的选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectOption {
    /// 选项值
    pub value: String,
    /// 选项显示标签
    pub label: String,
}

/// 参数类型枚举
///
/// 定义脚本参数支持的数据类型，用于前端动态表单渲染
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ParamType {
    /// 文本输入
    Text,
    /// 数字输入
    Number,
    /// 文件路径选择
    FilePath,
    /// 目录路径选择
    DirectoryPath,
    /// 单选下拉框
    Select { options: Vec<SelectOption> },
    /// 多选下拉框
    MultiSelect { options: Vec<SelectOption> },
}

/// 参数显示条件
///
/// 定义参数何时显示，用于实现条件表单
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayCondition {
    /// 依赖的参数名称
    pub param: String,
    /// 匹配的值列表（任一匹配即显示）
    pub values: Vec<String>,
}

/// 参数定义结构体
///
/// 定义脚本参数的元信息，用于前端生成动态表单
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParamDefinition {
    /// 参数名称（用于作为 JSON 字段的 key）
    pub name: String,
    /// 参数显示标签（用于表单显示）
    pub label: String,
    /// 参数类型
    #[serde(rename = "type")]
    pub param_type: ParamType,
    /// 是否必填
    pub required: bool,
    /// 默认值
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<Value>,
    /// 参数描述
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// 显示条件（可选，当条件满足时才显示此参数）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_when: Option<DisplayCondition>,
}
