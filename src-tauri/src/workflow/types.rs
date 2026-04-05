//! 工作流数据类型定义模块
//!
//! 定义工作流的核心数据结构，包括节点、边、参数来源等

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

use crate::script_api::{OutputDefinition, ParamDefinition};

/// 节点类型枚举
///
/// 定义工作流中支持的节点类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum NodeType {
    /// 脚本节点，执行指定脚本
    Script,
    /// 输入节点，定义工作流的输入参数
    Input,
    /// 输出节点，定义工作流的输出结果
    Output,
}

/// 参数来源枚举
///
/// 定义节点参数值的来源，支持静态值、工作流入参或上游节点输出
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ParamSource {
    /// 静态值，直接指定固定值
    Static { value: Value },
    /// 来自工作流入参，引用工作流级别的输入参数
    FromInput {
        #[serde(rename = "paramName")]
        param_name: String,
    },
    /// 来自上游节点输出，引用指定节点的输出字段
    FromNodeOutput {
        #[serde(rename = "nodeId")]
        node_id: String,
        #[serde(rename = "outputField")]
        output_field: String,
    },
}

/// 工作流节点结构体
///
/// 表示工作流中的一个节点，包含节点类型、位置和参数配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowNode {
    /// 节点唯一标识
    pub id: String,
    /// 节点类型
    pub node_type: NodeType,
    /// 脚本 ID（仅 Script 类型节点有效）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub script_id: Option<String>,
    /// 节点在画布上的位置 (x, y)
    pub position: (f64, f64),
    /// 参数配置，键为参数名，值为参数来源
    #[serde(default)]
    pub params_config: HashMap<String, ParamSource>,
}

/// 工作流边结构体
///
/// 表示节点之间的连接关系，用于数据传递
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowEdge {
    /// 边唯一标识
    pub id: String,
    /// 源节点 ID
    pub source: String,
    /// 目标节点 ID
    pub target: String,
    /// 源节点的输出端口标识
    pub source_handle: String,
    /// 目标节点的输入端口标识
    pub target_handle: String,
}

/// 工作流结构体
///
/// 表示一个完整的工作流定义，包含节点、边和输入输出模式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workflow {
    /// 工作流唯一标识
    pub id: String,
    /// 工作流名称
    pub name: String,
    /// 工作流描述
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// 工作流包含的节点列表
    pub nodes: Vec<WorkflowNode>,
    /// 工作流包含的边列表
    pub edges: Vec<WorkflowEdge>,
    /// 工作流输入参数定义
    #[serde(default)]
    pub input_schema: Vec<ParamDefinition>,
    /// 工作流输出定义
    #[serde(default)]
    pub output_schema: Vec<OutputDefinition>,
}

/// 工作流基本信息
///
/// 用于列表展示，不包含完整的节点和边定义
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowInfo {
    /// 工作流唯一标识
    pub id: String,
    /// 工作流名称
    pub name: String,
    /// 工作流描述
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// 创建时间戳（毫秒）
    pub created_at: i64,
    /// 更新时间戳（毫秒）
    pub updated_at: i64,
}

/// 节点执行结果
///
/// 记录单个节点的执行信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeResult {
    /// 执行是否成功
    pub success: bool,
    /// 输出内容（用于 UI 显示）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    /// 结构化输出字段（用于下游节点传递）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outputs: Option<HashMap<String, Value>>,
    /// 错误信息（执行失败时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// 执行耗时（毫秒）
    pub duration_ms: u64,
}

/// 工作流执行结果
///
/// 记录整个工作流的执行信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowResult {
    /// 执行是否成功
    pub success: bool,
    /// 工作流输出结果
    #[serde(default)]
    pub outputs: HashMap<String, Value>,
    /// 各节点执行结果
    #[serde(default)]
    pub node_results: HashMap<String, NodeResult>,
    /// 错误信息（执行失败时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::script_api::{ParamType, OutputType};

    #[test]
    fn test_node_type_serialization() {
        // 测试节点类型序列化
        let types = vec![
            (NodeType::Script, "\"script\""),
            (NodeType::Input, "\"input\""),
            (NodeType::Output, "\"output\""),
        ];

        for (node_type, expected) in types {
            let json = serde_json::to_string(&node_type).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_node_type_deserialization() {
        let json = "\"script\"";
        let node_type: NodeType = serde_json::from_str(json).unwrap();
        assert_eq!(node_type, NodeType::Script);

        let json = "\"input\"";
        let node_type: NodeType = serde_json::from_str(json).unwrap();
        assert_eq!(node_type, NodeType::Input);

        let json = "\"output\"";
        let node_type: NodeType = serde_json::from_str(json).unwrap();
        assert_eq!(node_type, NodeType::Output);
    }

    #[test]
    fn test_param_source_static() {
        let source = ParamSource::Static {
            value: serde_json::json!("test value"),
        };
        let json = serde_json::to_string(&source).unwrap();
        assert!(json.contains("static"));
        assert!(json.contains("test value"));

        let parsed: ParamSource = serde_json::from_str(&json).unwrap();
        match parsed {
            ParamSource::Static { value } => {
                assert_eq!(value, serde_json::json!("test value"));
            }
            _ => panic!("期望 Static 变体"),
        }
    }

    #[test]
    fn test_param_source_from_input() {
        let source = ParamSource::FromInput {
            param_name: "input_param".to_string(),
        };
        let json = serde_json::to_string(&source).unwrap();
        assert!(json.contains("fromInput"));
        assert!(json.contains("paramName")); // 验证字段名为 camelCase
        assert!(json.contains("input_param"));

        let parsed: ParamSource = serde_json::from_str(&json).unwrap();
        match parsed {
            ParamSource::FromInput { param_name } => {
                assert_eq!(param_name, "input_param");
            }
            _ => panic!("期望 FromInput 变体"),
        }
    }

    #[test]
    fn test_param_source_from_node_output() {
        let source = ParamSource::FromNodeOutput {
            node_id: "node_1".to_string(),
            output_field: "result".to_string(),
        };
        let json = serde_json::to_string(&source).unwrap();
        assert!(json.contains("fromNodeOutput"));
        assert!(json.contains("nodeId")); // 验证字段名为 camelCase
        assert!(json.contains("outputField")); // 验证字段名为 camelCase
        assert!(json.contains("node_1"));
        assert!(json.contains("result"));

        let parsed: ParamSource = serde_json::from_str(&json).unwrap();
        match parsed {
            ParamSource::FromNodeOutput { node_id, output_field } => {
                assert_eq!(node_id, "node_1");
                assert_eq!(output_field, "result");
            }
            _ => panic!("期望 FromNodeOutput 变体"),
        }
    }

    #[test]
    fn test_workflow_node() {
        let mut params_config = HashMap::new();
        params_config.insert(
            "param1".to_string(),
            ParamSource::Static {
                value: serde_json::json!(42),
            },
        );

        let node = WorkflowNode {
            id: "node_1".to_string(),
            node_type: NodeType::Script,
            script_id: Some("add_numbers".to_string()),
            position: (100.0, 200.0),
            params_config,
        };

        let json = serde_json::to_string(&node).unwrap();
        assert!(json.contains("node_1"));
        assert!(json.contains("script"));
        assert!(json.contains("add_numbers"));
        assert!(json.contains("100.0"));
        assert!(json.contains("200.0"));

        let parsed: WorkflowNode = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "node_1");
        assert_eq!(parsed.node_type, NodeType::Script);
        assert_eq!(parsed.script_id, Some("add_numbers".to_string()));
        assert_eq!(parsed.position, (100.0, 200.0));
    }

    #[test]
    fn test_workflow_edge() {
        let edge = WorkflowEdge {
            id: "edge_1".to_string(),
            source: "node_1".to_string(),
            target: "node_2".to_string(),
            source_handle: "output_1".to_string(),
            target_handle: "input_1".to_string(),
        };

        let json = serde_json::to_string(&edge).unwrap();
        assert!(json.contains("edge_1"));
        assert!(json.contains("node_1"));
        assert!(json.contains("node_2"));
        assert!(json.contains("output_1"));
        assert!(json.contains("input_1"));

        let parsed: WorkflowEdge = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "edge_1");
        assert_eq!(parsed.source, "node_1");
        assert_eq!(parsed.target, "node_2");
    }

    #[test]
    fn test_workflow() {
        let node = WorkflowNode {
            id: "input_1".to_string(),
            node_type: NodeType::Input,
            script_id: None,
            position: (0.0, 0.0),
            params_config: HashMap::new(),
        };

        let input_schema = vec![ParamDefinition {
            name: "number1".to_string(),
            label: "数字1".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: Some("第一个数字".to_string()),
            show_when: None,
        }];

        let output_schema = vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: OutputType::Number,
            description: Some("计算结果".to_string()),
        }];

        let workflow = Workflow {
            id: "workflow_1".to_string(),
            name: "测试工作流".to_string(),
            description: Some("这是一个测试工作流".to_string()),
            nodes: vec![node],
            edges: vec![],
            input_schema,
            output_schema,
        };

        let json = serde_json::to_string(&workflow).unwrap();
        assert!(json.contains("workflow_1"));
        assert!(json.contains("测试工作流"));
        assert!(json.contains("input_1"));
        assert!(json.contains("number1"));
        assert!(json.contains("result"));

        let parsed: Workflow = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "workflow_1");
        assert_eq!(parsed.name, "测试工作流");
        assert_eq!(parsed.nodes.len(), 1);
    }

    #[test]
    fn test_workflow_info() {
        let info = WorkflowInfo {
            id: "workflow_1".to_string(),
            name: "测试工作流".to_string(),
            description: Some("描述".to_string()),
            created_at: 1712304000000,
            updated_at: 1712304000000,
        };

        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("workflow_1"));
        assert!(json.contains("测试工作流"));
        assert!(json.contains("createdAt"));
        assert!(json.contains("updatedAt"));

        let parsed: WorkflowInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "workflow_1");
        assert_eq!(parsed.created_at, 1712304000000);
    }

    #[test]
    fn test_node_result() {
        let mut outputs = HashMap::new();
        outputs.insert("result".to_string(), serde_json::json!(42));

        let result = NodeResult {
            success: true,
            output: Some("计算完成".to_string()),
            outputs: Some(outputs),
            error: None,
            duration_ms: 100,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("计算完成"));
        assert!(json.contains("\"durationMs\":100"));

        let parsed: NodeResult = serde_json::from_str(&json).unwrap();
        assert!(parsed.success);
        assert_eq!(parsed.duration_ms, 100);
    }

    #[test]
    fn test_workflow_result() {
        let mut outputs = HashMap::new();
        outputs.insert("final_result".to_string(), serde_json::json!(100));

        let mut node_results = HashMap::new();
        node_results.insert(
            "node_1".to_string(),
            NodeResult {
                success: true,
                output: Some("完成".to_string()),
                outputs: None,
                error: None,
                duration_ms: 50,
            },
        );

        let result = WorkflowResult {
            success: true,
            outputs,
            node_results,
            error: None,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("final_result"));
        assert!(json.contains("node_1"));

        let parsed: WorkflowResult = serde_json::from_str(&json).unwrap();
        assert!(parsed.success);
        assert!(parsed.outputs.contains_key("final_result"));
        assert!(parsed.node_results.contains_key("node_1"));
    }

    #[test]
    fn test_workflow_without_optional_fields() {
        let workflow = Workflow {
            id: "workflow_2".to_string(),
            name: "简单工作流".to_string(),
            description: None,
            nodes: vec![],
            edges: vec![],
            input_schema: vec![],
            output_schema: vec![],
        };

        let json = serde_json::to_string(&workflow).unwrap();
        // 可选字段为 None 时不应序列化
        assert!(!json.contains("description"));

        let parsed: Workflow = serde_json::from_str(&json).unwrap();
        assert!(parsed.description.is_none());
        assert!(parsed.nodes.is_empty());
    }

    #[test]
    fn test_workflow_node_without_script_id() {
        let node = WorkflowNode {
            id: "input_1".to_string(),
            node_type: NodeType::Input,
            script_id: None,
            position: (0.0, 0.0),
            params_config: HashMap::new(),
        };

        let json = serde_json::to_string(&node).unwrap();
        // script_id 为 None 时不应序列化
        assert!(!json.contains("scriptId"));

        let parsed: WorkflowNode = serde_json::from_str(&json).unwrap();
        assert!(parsed.script_id.is_none());
    }
}