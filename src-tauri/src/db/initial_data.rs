//! 初始工作流创建逻辑

use crate::script_api::{OutputDefinition, OutputType, ParamDefinition, ParamType};
use crate::workflow::types::{NodeType, ParamSource, Workflow, WorkflowNode};

use std::collections::HashMap;

/// 初始化工作流 ID
pub const INITIAL_WORKFLOW_ID: &str = "arithmetic_demo";

impl super::Database {
    /// 插入初始化工作流
    ///
    /// 在数据库首次创建时，插入示例工作流
    pub(super) fn insert_initial_workflows(&self) -> Result<(), crate::error::AppError> {
        // 检查是否已存在初始化工作流
        if self.get_workflow(INITIAL_WORKFLOW_ID)?.is_some() {
            return Ok(());
        }

        let workflow = Self::create_arithmetic_workflow();
        self.insert_workflow(&workflow)?;

        Ok(())
    }

    /// 创建四则运算演示工作流
    ///
    /// 工作流流程：加10 -> 乘2 -> 输出
    /// 即：result = (input + 10) * 2
    /// 
    /// 新架构设计理念：
    /// - 移除显式 Input 节点
    /// - Script 节点直接通过 FromInput 参数来源获取工作流入参
    /// - 参数来源优先级：连线 > 静态值 > 工作流入参
    pub(super) fn create_arithmetic_workflow() -> Workflow {
        // 定义工作流入参
        let input_schema = vec![ParamDefinition {
            name: "input_number".to_string(),
            label: "输入数字".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: Some("要进行运算的初始数字".to_string()),
            show_when: None,
        }];

        // 定义工作流出参
        let output_schema = vec![OutputDefinition {
            name: "final_result".to_string(),
            label: "最终结果".to_string(),
            output_type: OutputType::Number,
            description: Some("经过多次运算后的最终结果: (input + 10) * 2".to_string()),
        }];

        // 创建第一个 Script 节点（加10）
        // 参数 a 直接通过 FromInput 获取工作流入参 input_number
        // 参数 b 使用静态值 10
        let mut add_params = HashMap::new();
        add_params.insert(
            "a".to_string(),
            ParamSource::FromInput {
                param_name: "input_number".to_string(),
            },
        );
        add_params.insert(
            "b".to_string(),
            ParamSource::Static {
                value: serde_json::json!(10),
            },
        );

        let add_node = WorkflowNode {
            id: "add_node".to_string(),
            node_type: NodeType::Script,
            script_id: Some("add_numbers".to_string()),
            position: (100.0, 150.0),
            params_config: add_params,
        };

        // 创建第二个 Script 节点（加法实现乘法：将加法结果累加两次）
        // 乘2 = 结果 + 结果
        // 两个参数都通过 FromNodeOutput 获取前一个节点的输出
        let mut multiply_params = HashMap::new();
        multiply_params.insert(
            "a".to_string(),
            ParamSource::FromNodeOutput {
                node_id: "add_node".to_string(),
                output_field: "result".to_string(),
            },
        );
        multiply_params.insert(
            "b".to_string(),
            ParamSource::FromNodeOutput {
                node_id: "add_node".to_string(),
                output_field: "result".to_string(),
            },
        );

        let multiply_node = WorkflowNode {
            id: "multiply_node".to_string(),
            node_type: NodeType::Script,
            script_id: Some("add_numbers".to_string()),
            position: (300.0, 150.0),
            params_config: multiply_params,
        };

        // 创建 Output 节点
        // 通过 FromNodeOutput 获取上一个节点的输出结果
        let mut output_params = HashMap::new();
        output_params.insert(
            "final_result".to_string(),
            ParamSource::FromNodeOutput {
                node_id: "multiply_node".to_string(),
                output_field: "result".to_string(),
            },
        );

        let output_node = WorkflowNode {
            id: "output_node".to_string(),
            node_type: NodeType::Output,
            script_id: None,
            position: (500.0, 150.0),
            params_config: output_params,
        };

        Workflow {
            id: INITIAL_WORKFLOW_ID.to_string(),
            name: "四则运算演示".to_string(),
            description: Some("演示工作流功能：将输入的数字加10后乘2，即 result = (input + 10) * 2".to_string()),
            nodes: vec![add_node, multiply_node, output_node],
            edges: vec![],
            input_schema,
            output_schema,
        }
    }
}
