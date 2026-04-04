//! Script trait 和核心接口模块
//!
//! 定义脚本系统的核心契约和数据结构，所有脚本必须实现 Script trait

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

use crate::error::AppError;

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

/// 脚本执行上下文
///
/// 提供脚本执行时的环境信息和资源路径
#[derive(Debug, Clone)]
pub struct ScriptContext {
    /// 日志目录路径
    pub log_dir: PathBuf,
    /// 临时文件目录路径
    pub temp_dir: PathBuf,
}

impl Default for ScriptContext {
    fn default() -> Self {
        Self {
            log_dir: std::env::temp_dir().join("scripts-box").join("logs"),
            temp_dir: std::env::temp_dir().join("scripts-box").join("temp"),
        }
    }
}

/// 脚本执行结果
///
/// 封装脚本执行的输出信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptResult {
    /// 执行是否成功
    pub success: bool,
    /// 输出内容
    pub output: String,
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
            error: None,
        }
    }

    /// 创建失败结果
    pub fn failure(error: String) -> Self {
        Self {
            success: false,
            output: String::new(),
            error: Some(error),
        }
    }
}

/// 脚本元信息
///
/// 用于在前端展示脚本的基本信息（ID、名称、描述）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptInfo {
    /// 脚本唯一标识
    pub id: String,
    /// 脚本显示名称
    pub name: String,
    /// 脚本描述
    pub description: String,
}

/// 脚本 trait
///
/// 所有脚本必须实现此 trait，定义脚本的元信息和执行逻辑
pub trait Script: Send + Sync {
    /// 获取脚本唯一标识
    ///
    /// ID 用于在注册中心查找脚本，必须全局唯一
    fn id(&self) -> &str;

    /// 获取脚本显示名称
    ///
    /// 用于在前端界面显示
    fn name(&self) -> &str;

    /// 获取脚本描述
    ///
    /// 用于在前端界面显示脚本用途说明
    fn description(&self) -> &str;

    /// 获取参数定义列表
    ///
    /// 返回脚本需要的参数定义，前端据此生成动态表单
    fn params_schema(&self) -> Vec<ParamDefinition>;

    /// 执行脚本
    ///
    /// # 参数
    /// - `params`: JSON 格式的参数值，键名对应 ParamDefinition 的 name 字段
    /// - `ctx`: 执行上下文，提供环境信息和资源路径
    ///
    /// # 返回
    /// 执行结果，包含成功状态、输出内容和错误信息
    fn execute(&self, params: Value, ctx: &ScriptContext) -> Result<ScriptResult, AppError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_param_type_serialization() {
        let param_type = ParamType::Text;
        let json = serde_json::to_string(&param_type).unwrap();
        assert_eq!(json, "\"text\"");

        let param_type = ParamType::Select {
            options: vec![
                SelectOption { value: "opt1".to_string(), label: "选项1".to_string() },
                SelectOption { value: "opt2".to_string(), label: "选项2".to_string() },
            ],
        };
        let json = serde_json::to_string(&param_type).unwrap();
        assert!(json.contains("select"));
        assert!(json.contains("选项1"));
    }

    #[test]
    fn test_param_definition_serialization() {
        let param = ParamDefinition {
            name: "directory".to_string(),
            label: "目标目录".to_string(),
            param_type: ParamType::DirectoryPath,
            required: true,
            default: None,
            description: Some("选择要处理的目录".to_string()),
            show_when: None,
        };

        let json = serde_json::to_string(&param).unwrap();
        assert!(json.contains("directory"));
        assert!(json.contains("目标目录"));
        assert!(json.contains("directory_path"));
    }

    #[test]
    fn test_display_condition_serialization() {
        let condition = DisplayCondition {
            param: "mode".to_string(),
            values: vec!["add_prefix".to_string(), "add_suffix".to_string()],
        };
        let json = serde_json::to_string(&condition).unwrap();
        assert!(json.contains("mode"));
        assert!(json.contains("add_prefix"));
    }

    #[test]
    fn test_param_definition_with_show_when() {
        let param = ParamDefinition {
            name: "prefix".to_string(),
            label: "前缀".to_string(),
            param_type: ParamType::Text,
            required: true,
            default: None,
            description: None,
            show_when: Some(DisplayCondition {
                param: "mode".to_string(),
                values: vec!["add_prefix".to_string()],
            }),
        };

        let json = serde_json::to_string(&param).unwrap();
        assert!(json.contains("show_when"));
        assert!(json.contains("add_prefix"));
    }

    #[test]
    fn test_script_result_success() {
        let result = ScriptResult::success("操作成功".to_string());
        assert!(result.success);
        assert_eq!(result.output, "操作成功");
        assert!(result.error.is_none());
    }

    #[test]
    fn test_script_result_failure() {
        let result = ScriptResult::failure("操作失败".to_string());
        assert!(!result.success);
        assert!(result.output.is_empty());
        assert_eq!(result.error, Some("操作失败".to_string()));
    }

    #[test]
    fn test_script_context_default() {
        let ctx = ScriptContext::default();
        assert!(ctx.log_dir.to_str().unwrap().contains("scripts-box"));
        assert!(ctx.temp_dir.to_str().unwrap().contains("scripts-box"));
    }

    #[test]
    fn test_all_param_type_serialization() {
        // 测试所有参数类型的序列化
        let types = vec![
            (ParamType::Text, "\"text\""),
            (ParamType::Number, "\"number\""),
            (ParamType::FilePath, "\"file_path\""),
            (ParamType::DirectoryPath, "\"directory_path\""),
        ];

        for (param_type, expected) in types {
            let json = serde_json::to_string(&param_type).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_param_type_deserialization() {
        let json = "\"text\"";
        let param_type: ParamType = serde_json::from_str(json).unwrap();
        assert!(matches!(param_type, ParamType::Text));

        let json = "\"number\"";
        let param_type: ParamType = serde_json::from_str(json).unwrap();
        assert!(matches!(param_type, ParamType::Number));
    }

    #[test]
    fn test_select_param_type_serialization() {
        let param_type = ParamType::Select {
            options: vec![
                SelectOption { value: "a".to_string(), label: "A".to_string() },
                SelectOption { value: "b".to_string(), label: "B".to_string() },
            ],
        };
        let json = serde_json::to_string(&param_type).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed.is_object());
        assert!(parsed.get("select").is_some());
    }

    #[test]
    fn test_multi_select_param_type_serialization() {
        let param_type = ParamType::MultiSelect {
            options: vec![
                SelectOption { value: "x".to_string(), label: "X".to_string() },
            ],
        };
        let json = serde_json::to_string(&param_type).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(parsed.get("multi_select").is_some());
    }

    #[test]
    fn test_param_definition_with_default() {
        let param = ParamDefinition {
            name: "count".to_string(),
            label: "数量".to_string(),
            param_type: ParamType::Number,
            required: false,
            default: Some(serde_json::json!(10)),
            description: Some("默认数量".to_string()),
            show_when: None,
        };

        let json = serde_json::to_string(&param).unwrap();
        assert!(json.contains("\"default\":10"));
    }

    #[test]
    fn test_script_result_serialization() {
        let success_result = ScriptResult::success("done".to_string());
        let json = serde_json::to_string(&success_result).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"output\":\"done\""));
        assert!(!json.contains("error"));

        let failure_result = ScriptResult::failure("failed".to_string());
        let json = serde_json::to_string(&failure_result).unwrap();
        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"error\":\"failed\""));
    }

    #[test]
    fn test_script_info_serialization() {
        let info = ScriptInfo {
            id: "test_script".to_string(),
            name: "测试脚本".to_string(),
            description: "用于测试".to_string(),
        };

        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("test_script"));
        assert!(json.contains("测试脚本"));
    }

    #[test]
    fn test_select_option_serialization() {
        let option = SelectOption {
            value: "option1".to_string(),
            label: "选项一".to_string(),
        };

        let json = serde_json::to_string(&option).unwrap();
        assert!(json.contains("option1"));
        assert!(json.contains("选项一"));

        let parsed: SelectOption = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.value, "option1");
        assert_eq!(parsed.label, "选项一");
    }
}
