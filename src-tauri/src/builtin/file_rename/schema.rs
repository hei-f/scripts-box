//! 参数和输出模式定义

use serde_json::Value;

use crate::script_api::{DisplayCondition, OutputDefinition, OutputType, ParamDefinition, ParamType, SelectOption};

/// 获取重命名模式选项
pub fn get_rename_mode_options() -> Vec<SelectOption> {
    vec![
        SelectOption {
            value: "add_prefix".to_string(),
            label: "添加前缀".to_string(),
        },
        SelectOption {
            value: "add_suffix".to_string(),
            label: "添加后缀".to_string(),
        },
        SelectOption {
            value: "replace".to_string(),
            label: "替换文本".to_string(),
        },
        SelectOption {
            value: "numbering".to_string(),
            label: "批量编号".to_string(),
        },
    ]
}

/// 获取参数模式定义
pub fn get_params_schema() -> Vec<ParamDefinition> {
    vec![
        ParamDefinition {
            name: "directory".to_string(),
            label: "目标目录".to_string(),
            param_type: ParamType::DirectoryPath,
            required: true,
            default: None,
            description: Some("选择要重命名文件所在的目录".to_string()),
            show_when: None,
        },
        ParamDefinition {
            name: "mode".to_string(),
            label: "重命名模式".to_string(),
            param_type: ParamType::Select {
                options: get_rename_mode_options(),
            },
            required: true,
            default: Some(Value::String("add_prefix".to_string())),
            description: Some("选择重命名模式".to_string()),
            show_when: None,
        },
        // 添加前缀模式的参数
        ParamDefinition {
            name: "prefix".to_string(),
            label: "前缀文本".to_string(),
            param_type: ParamType::Text,
            required: true,
            default: None,
            description: Some("输入要添加的前缀文本".to_string()),
            show_when: Some(DisplayCondition {
                param: "mode".to_string(),
                values: vec!["add_prefix".to_string()],
            }),
        },
        // 添加后缀模式的参数
        ParamDefinition {
            name: "suffix".to_string(),
            label: "后缀文本".to_string(),
            param_type: ParamType::Text,
            required: true,
            default: None,
            description: Some("输入要添加的后缀文本".to_string()),
            show_when: Some(DisplayCondition {
                param: "mode".to_string(),
                values: vec!["add_suffix".to_string()],
            }),
        },
        // 替换文本模式的参数
        ParamDefinition {
            name: "old_text".to_string(),
            label: "原文本".to_string(),
            param_type: ParamType::Text,
            required: true,
            default: None,
            description: Some("输入要被替换的文本".to_string()),
            show_when: Some(DisplayCondition {
                param: "mode".to_string(),
                values: vec!["replace".to_string()],
            }),
        },
        ParamDefinition {
            name: "new_text".to_string(),
            label: "新文本".to_string(),
            param_type: ParamType::Text,
            required: false,
            default: Some(Value::String(String::new())),
            description: Some("输入替换后的文本（可为空）".to_string()),
            show_when: Some(DisplayCondition {
                param: "mode".to_string(),
                values: vec!["replace".to_string()],
            }),
        },
        // 批量编号模式的参数
        ParamDefinition {
            name: "start_number".to_string(),
            label: "起始编号".to_string(),
            param_type: ParamType::Number,
            required: false,
            default: Some(Value::Number(1.into())),
            description: Some("输入起始编号".to_string()),
            show_when: Some(DisplayCondition {
                param: "mode".to_string(),
                values: vec!["numbering".to_string()],
            }),
        },
        ParamDefinition {
            name: "digits".to_string(),
            label: "编号位数".to_string(),
            param_type: ParamType::Number,
            required: false,
            default: Some(Value::Number(3.into())),
            description: Some("输入编号位数（如 3 表示 001, 002...）".to_string()),
            show_when: Some(DisplayCondition {
                param: "mode".to_string(),
                values: vec!["numbering".to_string()],
            }),
        },
        ParamDefinition {
            name: "separator".to_string(),
            label: "分隔符".to_string(),
            param_type: ParamType::Text,
            required: false,
            default: Some(Value::String("_".to_string())),
            description: Some("输入文件名和编号之间的分隔符".to_string()),
            show_when: Some(DisplayCondition {
                param: "mode".to_string(),
                values: vec!["numbering".to_string()],
            }),
        },
    ]
}

/// 获取输出模式定义
pub fn get_output_schema() -> Vec<OutputDefinition> {
    vec![
        OutputDefinition {
            name: "success_count".to_string(),
            label: "成功数量".to_string(),
            output_type: OutputType::Number,
            description: Some("成功重命名的文件数量".to_string()),
        },
        OutputDefinition {
            name: "fail_count".to_string(),
            label: "失败数量".to_string(),
            output_type: OutputType::Number,
            description: Some("重命名失败的文件数量".to_string()),
        },
    ]
}
