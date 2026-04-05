//! Script API 模块测试

use super::*;
use std::collections::HashMap;

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
    assert!(result.outputs.is_none());
}

#[test]
fn test_script_result_success_with_outputs() {
    let mut outputs = HashMap::new();
    outputs.insert("result".to_string(), serde_json::json!(42));
    let result = ScriptResult::success_with_outputs("计算完成".to_string(), outputs);
    assert!(result.success);
    assert_eq!(result.output, "计算完成");
    assert!(result.outputs.is_some());
    assert_eq!(result.outputs.as_ref().unwrap().get("result").unwrap(), 42);
}

#[test]
fn test_script_result_failure() {
    let result = ScriptResult::failure("操作失败".to_string());
    assert!(!result.success);
    assert!(result.output.is_empty());
    assert_eq!(result.error, Some("操作失败".to_string()));
    assert!(result.outputs.is_none());
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

#[test]
fn test_output_type_serialization() {
    // 测试所有输出类型的序列化
    let types = vec![
        (OutputType::Text, "\"text\""),
        (OutputType::Number, "\"number\""),
        (OutputType::Boolean, "\"boolean\""),
        (OutputType::Json, "\"json\""),
    ];

    for (output_type, expected) in types {
        let json = serde_json::to_string(&output_type).unwrap();
        assert_eq!(json, expected);
    }
}

#[test]
fn test_output_type_deserialization() {
    let json = "\"text\"";
    let output_type: OutputType = serde_json::from_str(json).unwrap();
    assert!(matches!(output_type, OutputType::Text));

    let json = "\"number\"";
    let output_type: OutputType = serde_json::from_str(json).unwrap();
    assert!(matches!(output_type, OutputType::Number));

    let json = "\"boolean\"";
    let output_type: OutputType = serde_json::from_str(json).unwrap();
    assert!(matches!(output_type, OutputType::Boolean));

    let json = "\"json\"";
    let output_type: OutputType = serde_json::from_str(json).unwrap();
    assert!(matches!(output_type, OutputType::Json));
}

#[test]
fn test_output_definition_serialization() {
    let output_def = OutputDefinition {
        name: "result".to_string(),
        label: "计算结果".to_string(),
        output_type: OutputType::Number,
        description: Some("两个数字相加的结果".to_string()),
    };

    let json = serde_json::to_string(&output_def).unwrap();
    assert!(json.contains("result"));
    assert!(json.contains("计算结果"));
    assert!(json.contains("number"));
    assert!(json.contains("两个数字相加的结果"));
}

#[test]
fn test_output_definition_without_description() {
    let output_def = OutputDefinition {
        name: "status".to_string(),
        label: "状态".to_string(),
        output_type: OutputType::Boolean,
        description: None,
    };

    let json = serde_json::to_string(&output_def).unwrap();
    assert!(json.contains("status"));
    assert!(!json.contains("description"));
}
