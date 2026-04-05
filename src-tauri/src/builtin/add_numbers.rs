//! 数字加法脚本
//!
//! 接收两个数字参数，返回它们的和

use std::collections::HashMap;

use serde_json::Value;

use crate::error::AppError;
use crate::script_api::{
    OutputDefinition, OutputType, ParamDefinition, ParamType, Script, ScriptContext, ScriptResult,
};

/// 数字加法脚本
pub struct AddNumbersScript;

impl AddNumbersScript {
    /// 创建新的加法脚本实例
    pub fn new() -> Self {
        Self
    }

    /// 解析并验证数字参数
    fn parse_number(value: &Value, param_name: &str) -> Result<f64, AppError> {
        let num = value.as_f64().ok_or_else(|| {
            AppError::ValidationError(format!("参数 {} 必须是有效数字", param_name))
        })?;

        if num.is_nan() || num.is_infinite() {
            return Err(AppError::ValidationError(format!(
                "参数 {} 必须是有效数字（不能是 NaN 或无穷大）",
                param_name
            )));
        }

        Ok(num)
    }
}

impl Default for AddNumbersScript {
    fn default() -> Self {
        Self::new()
    }
}

impl Script for AddNumbersScript {
    fn id(&self) -> &str {
        "add_numbers"
    }

    fn name(&self) -> &str {
        "数字加法"
    }

    fn description(&self) -> &str {
        "计算两个数字的和"
    }

    fn params_schema(&self) -> Vec<ParamDefinition> {
        vec![
            ParamDefinition {
                name: "a".to_string(),
                label: "参数 A".to_string(),
                param_type: ParamType::Number,
                required: true,
                default: None,
                description: Some("第一个加数".to_string()),
                show_when: None,
            },
            ParamDefinition {
                name: "b".to_string(),
                label: "参数 B".to_string(),
                param_type: ParamType::Number,
                required: true,
                default: None,
                description: Some("第二个加数".to_string()),
                show_when: None,
            },
        ]
    }

    fn output_schema(&self) -> Vec<OutputDefinition> {
        vec![OutputDefinition {
            name: "result".to_string(),
            label: "计算结果".to_string(),
            output_type: OutputType::Number,
            description: Some("两个数字相加的结果".to_string()),
        }]
    }

    fn execute(&self, params: Value, _ctx: &ScriptContext) -> Result<ScriptResult, AppError> {
        // 解析参数 A
        let a = Self::parse_number(&params["a"], "A")?;

        // 解析参数 B
        let b = Self::parse_number(&params["b"], "B")?;

        // 计算结果
        let result = a + b;

        // 格式化输出（去掉不必要的小数位）
        let output = if result.fract() == 0.0 {
            format!("{} + {} = {}", a as i64, b as i64, result as i64)
        } else {
            format!("{} + {} = {}", a, b, result)
        };

        // 构建结构化输出
        let mut outputs = HashMap::new();
        outputs.insert("result".to_string(), serde_json::json!(result));

        Ok(ScriptResult::success_with_outputs(output, outputs))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_script_info() {
        let script = AddNumbersScript::new();
        assert_eq!(script.id(), "add_numbers");
        assert_eq!(script.name(), "数字加法");
    }

    #[test]
    fn test_params_schema() {
        let script = AddNumbersScript::new();
        let params = script.params_schema();
        assert_eq!(params.len(), 2);
        assert!(params[0].required);
        assert!(params[1].required);
    }

    #[test]
    fn test_add_integers() {
        let script = AddNumbersScript::new();
        let params = serde_json::json!({ "a": 3, "b": 5 });
        let ctx = ScriptContext::default();

        let result = script.execute(params, &ctx).unwrap();
        assert!(result.success);
        assert!(result.output.contains("8"));
    }

    #[test]
    fn test_add_floats() {
        let script = AddNumbersScript::new();
        let params = serde_json::json!({ "a": 3.5, "b": 2.5 });
        let ctx = ScriptContext::default();

        let result = script.execute(params, &ctx).unwrap();
        assert!(result.success);
        assert!(result.output.contains("6"));
    }

    #[test]
    fn test_invalid_input() {
        let script = AddNumbersScript::new();
        let params = serde_json::json!({ "a": "not a number", "b": 5 });
        let ctx = ScriptContext::default();

        let result = script.execute(params, &ctx);
        assert!(result.is_err());
    }
}
