//! 工作流执行器单元测试

use std::collections::{HashMap, HashSet};

use serde_json::Value;
use tempfile::tempdir;

use crate::db::Database;
use crate::error::AppError;
use crate::registry::ScriptRegistry;
use crate::script_api::{OutputDefinition, ParamDefinition, ParamType, Script, ScriptContext};

use super::super::{NodeResult, NodeType, ParamSource, Workflow, WorkflowNode};
use super::{dependency::build_dependency_graph, dependency::topological_sort, validation::WorkflowValidator, WorkflowExecutor};

/// 测试脚本：返回固定值
struct TestScript {
    id: String,
    name: String,
}

impl TestScript {
    fn new(id: &str, name: &str) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
        }
    }
}

impl Script for TestScript {
    fn id(&self) -> &str {
        &self.id
    }

    fn name(&self) -> &str {
        &self.name
    }

    fn description(&self) -> &str {
        "测试脚本"
    }

    fn params_schema(&self) -> Vec<ParamDefinition> {
        vec![ParamDefinition {
            name: "input".to_string(),
            label: "输入".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: None,
            show_when: None,
        }]
    }

    fn output_schema(&self) -> Vec<OutputDefinition> {
        vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }]
    }

    fn execute(
        &self,
        params: Value,
        _ctx: &ScriptContext,
    ) -> Result<crate::script_api::ScriptResult, AppError> {
        let input = params.get("input").and_then(|v| v.as_i64()).unwrap_or(0);
        let mut outputs = HashMap::new();
        outputs.insert("result".to_string(), serde_json::json!(input * 2));

        Ok(crate::script_api::ScriptResult::success_with_outputs(
            format!("处理完成: {} * 2 = {}", input, input * 2),
            outputs,
        ))
    }
}

fn create_test_registry() -> ScriptRegistry {
    let mut registry = ScriptRegistry::new();
    registry.register(TestScript::new("double", "加倍脚本"));
    registry
}

fn create_test_db() -> Database {
    let dir = tempdir().expect("创建临时目录失败");
    Database::init(dir.path()).expect("初始化数据库失败")
}

#[test]
fn test_build_dependency_graph() {
    let workflow = Workflow {
        id: "test".to_string(),
        name: "测试".to_string(),
        description: None,
        nodes: vec![
            WorkflowNode {
                id: "node1".to_string(),
                node_type: NodeType::Input,
                script_id: None,
                position: (0.0, 0.0),
                params_config: HashMap::new(),
            },
            WorkflowNode {
                id: "node2".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (100.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "node1".to_string(),
                            output_field: "value".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![],
        output_schema: vec![],
    };

    let graph = build_dependency_graph(&workflow).unwrap();

    // node1 没有依赖
    assert!(graph.get("node1").unwrap().is_empty());
    // node2 依赖 node1
    assert!(graph.get("node2").unwrap().contains("node1"));
}

#[test]
fn test_topological_sort_simple() {
    let mut graph: HashMap<String, HashSet<String>> = HashMap::new();
    graph.insert("a".to_string(), HashSet::new());
    graph.insert("b".to_string(), {
        let mut deps = HashSet::new();
        deps.insert("a".to_string());
        deps
    });

    let order = topological_sort(&graph).unwrap();
    assert_eq!(order.len(), 2);
    // a 应该在 b 之前
    assert!(order.iter().position(|x| x == "a") < order.iter().position(|x| x == "b"));
}

#[test]
fn test_topological_sort_cycle_detection() {
    let mut graph: HashMap<String, HashSet<String>> = HashMap::new();
    graph.insert("a".to_string(), {
        let mut deps = HashSet::new();
        deps.insert("b".to_string());
        deps
    });
    graph.insert("b".to_string(), {
        let mut deps = HashSet::new();
        deps.insert("a".to_string());
        deps
    });

    let result = topological_sort(&graph);
    assert!(matches!(result, Err(AppError::CycleDetectedError)));
}

#[test]
fn test_validate_workflow_duplicate_node_id() {
    let registry = create_test_registry();
    let validator = WorkflowValidator::new(&registry);

    let workflow = Workflow {
        id: "test".to_string(),
        name: "测试".to_string(),
        description: None,
        nodes: vec![
            WorkflowNode {
                id: "node1".to_string(),
                node_type: NodeType::Input,
                script_id: None,
                position: (0.0, 0.0),
                params_config: HashMap::new(),
            },
            WorkflowNode {
                id: "node1".to_string(), // 重复 ID
                node_type: NodeType::Input,
                script_id: None,
                position: (100.0, 0.0),
                params_config: HashMap::new(),
            },
        ],
        edges: vec![],
        input_schema: vec![],
        output_schema: vec![],
    };

    let result = validator.validate(&workflow);
    assert!(matches!(result, Err(AppError::WorkflowValidationError(_))));
}

#[test]
fn test_validate_workflow_missing_script() {
    let registry = create_test_registry();
    let validator = WorkflowValidator::new(&registry);

    let workflow = Workflow {
        id: "test".to_string(),
        name: "测试".to_string(),
        description: None,
        nodes: vec![WorkflowNode {
            id: "node1".to_string(),
            node_type: NodeType::Script,
            script_id: Some("nonexistent".to_string()),
            position: (0.0, 0.0),
            params_config: HashMap::new(),
        }],
        edges: vec![],
        input_schema: vec![],
        output_schema: vec![],
    };

    let result = validator.validate(&workflow);
    assert!(matches!(result, Err(AppError::WorkflowValidationError(_))));
}

#[test]
fn test_execute_simple_workflow() {
    let registry = create_test_registry();
    let db = create_test_db();
    let executor = WorkflowExecutor::new(&registry, &db);

    let workflow = Workflow {
        id: "test".to_string(),
        name: "简单工作流".to_string(),
        description: None,
        nodes: vec![
            WorkflowNode {
                id: "input".to_string(),
                node_type: NodeType::Input,
                script_id: None,
                position: (0.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "value".to_string(),
                        ParamSource::FromInput {
                            param_name: "number".to_string(),
                        },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "double".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (100.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "input".to_string(),
                            output_field: "value".to_string(),
                        },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "output".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: (200.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "result".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "double".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![ParamDefinition {
            name: "number".to_string(),
            label: "数字".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: None,
            show_when: None,
        }],
        output_schema: vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }],
    };

    let params = serde_json::json!({ "number": 5 });
    let result = executor.execute_workflow(workflow, params);

    assert!(result.is_ok());
    let result = result.unwrap();
    assert!(result.success);
    // 5 * 2 = 10
    assert_eq!(result.outputs.get("result").unwrap(), 10);
}

// ==================== 参数获取优先级测试 ====================

#[test]
fn test_param_priority_from_node_output() {
    let registry = create_test_registry();
    let db = create_test_db();
    let executor = WorkflowExecutor::new(&registry, &db);

    let workflow = Workflow {
        id: "test_priority_1".to_string(),
        name: "优先级测试-连线".to_string(),
        description: None,
        nodes: vec![
            WorkflowNode {
                id: "first".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (0.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::Static { value: serde_json::json!(5) },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "second".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (100.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "first".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "output".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: (200.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "result".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "second".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![],
        output_schema: vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }],
    };

    let result = executor.execute_workflow(workflow, serde_json::json!({})).unwrap();
    assert!(result.success);
    // 5 * 2 * 2 = 20
    assert_eq!(result.outputs.get("result").unwrap(), 20);
}

#[test]
fn test_param_priority_static_value() {
    let registry = create_test_registry();
    let db = create_test_db();
    let executor = WorkflowExecutor::new(&registry, &db);

    let workflow = Workflow {
        id: "test_priority_2".to_string(),
        name: "优先级测试-静态值".to_string(),
        description: None,
        nodes: vec![
            WorkflowNode {
                id: "script".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (0.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::Static { value: serde_json::json!(7) },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "output".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: (100.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "result".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "script".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![],
        output_schema: vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }],
    };

    let result = executor.execute_workflow(workflow, serde_json::json!({ "input": 100 })).unwrap();
    assert!(result.success);
    // 静态值 7，而不是工作流入参 100
    assert_eq!(result.outputs.get("result").unwrap(), 14);
}

#[test]
fn test_param_priority_from_input() {
    let registry = create_test_registry();
    let db = create_test_db();
    let executor = WorkflowExecutor::new(&registry, &db);

    let workflow = Workflow {
        id: "test_priority_3".to_string(),
        name: "优先级测试-工作流入参".to_string(),
        description: None,
        nodes: vec![
            WorkflowNode {
                id: "script".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (0.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::FromInput {
                            param_name: "my_number".to_string(),
                        },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "output".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: (100.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "result".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "script".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![ParamDefinition {
            name: "my_number".to_string(),
            label: "我的数字".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: None,
            show_when: None,
        }],
        output_schema: vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }],
    };

    let result = executor.execute_workflow(workflow, serde_json::json!({ "my_number": 8 })).unwrap();
    assert!(result.success);
    // 8 * 2 = 16
    assert_eq!(result.outputs.get("result").unwrap(), 16);
}

#[test]
fn test_param_auto_fetch_from_workflow_input() {
    let registry = create_test_registry();
    let db = create_test_db();
    let executor = WorkflowExecutor::new(&registry, &db);

    let workflow = Workflow {
        id: "test_auto_fetch".to_string(),
        name: "自动获取测试".to_string(),
        description: None,
        nodes: vec![
            WorkflowNode {
                id: "script".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (0.0, 0.0),
                params_config: HashMap::new(),
            },
            WorkflowNode {
                id: "output".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: (100.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "result".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "script".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![ParamDefinition {
            name: "input".to_string(),
            label: "输入".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: None,
            show_when: None,
        }],
        output_schema: vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }],
    };

    let result = executor.execute_workflow(workflow, serde_json::json!({ "input": 9 })).unwrap();
    assert!(result.success);
    // 9 * 2 = 18
    assert_eq!(result.outputs.get("result").unwrap(), 18);
}

// ==================== 旧工作流兼容性测试 ====================

#[test]
fn test_legacy_workflow_with_input_node() {
    let registry = create_test_registry();
    let db = create_test_db();
    let executor = WorkflowExecutor::new(&registry, &db);

    let workflow = Workflow {
        id: "legacy_workflow".to_string(),
        name: "旧版工作流".to_string(),
        description: Some("包含显式 Input 节点的旧版工作流".to_string()),
        nodes: vec![
            WorkflowNode {
                id: "input_node".to_string(),
                node_type: NodeType::Input,
                script_id: None,
                position: (0.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "value".to_string(),
                        ParamSource::FromInput {
                            param_name: "number".to_string(),
                        },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "script_node".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (100.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "input_node".to_string(),
                            output_field: "value".to_string(),
                        },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "output_node".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: (200.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "result".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "script_node".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![ParamDefinition {
            name: "number".to_string(),
            label: "数字".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: None,
            show_when: None,
        }],
        output_schema: vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }],
    };

    let result = executor.execute_workflow(workflow, serde_json::json!({ "number": 6 })).unwrap();
    assert!(result.success);
    // 6 * 2 = 12
    assert_eq!(result.outputs.get("result").unwrap(), 12);
}

#[test]
fn test_legacy_workflow_output_from_input() {
    let registry = create_test_registry();
    let db = create_test_db();
    let executor = WorkflowExecutor::new(&registry, &db);

    let workflow = Workflow {
        id: "legacy_direct_output".to_string(),
        name: "旧版直接输出".to_string(),
        description: Some("Output 节点直接从工作流入参获取值".to_string()),
        nodes: vec![
            WorkflowNode {
                id: "output".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: (0.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "result".to_string(),
                        ParamSource::FromInput {
                            param_name: "value".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![ParamDefinition {
            name: "value".to_string(),
            label: "值".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: None,
            show_when: None,
        }],
        output_schema: vec![OutputDefinition {
            name: "result".to_string(),
            label: "结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }],
    };

    let result = executor.execute_workflow(workflow, serde_json::json!({ "value": 42 })).unwrap();
    assert!(result.success);
    assert_eq!(result.outputs.get("result").unwrap(), 42);
}

#[test]
fn test_new_workflow_without_input_node() {
    let registry = create_test_registry();
    let db = create_test_db();
    let executor = WorkflowExecutor::new(&registry, &db);

    let workflow = Workflow {
        id: "new_workflow".to_string(),
        name: "新版工作流".to_string(),
        description: Some("不包含显式 Input 节点的新版工作流".to_string()),
        nodes: vec![
            WorkflowNode {
                id: "script1".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (0.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::FromInput {
                            param_name: "my_input".to_string(),
                        },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "script2".to_string(),
                node_type: NodeType::Script,
                script_id: Some("double".to_string()),
                position: (100.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "input".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "script1".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
            WorkflowNode {
                id: "output".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: (200.0, 0.0),
                params_config: {
                    let mut config = HashMap::new();
                    config.insert(
                        "final_result".to_string(),
                        ParamSource::FromNodeOutput {
                            node_id: "script2".to_string(),
                            output_field: "result".to_string(),
                        },
                    );
                    config
                },
            },
        ],
        edges: vec![],
        input_schema: vec![ParamDefinition {
            name: "my_input".to_string(),
            label: "我的输入".to_string(),
            param_type: ParamType::Number,
            required: true,
            default: None,
            description: None,
            show_when: None,
        }],
        output_schema: vec![OutputDefinition {
            name: "final_result".to_string(),
            label: "最终结果".to_string(),
            output_type: crate::script_api::OutputType::Number,
            description: None,
        }],
    };

    let result = executor.execute_workflow(workflow, serde_json::json!({ "my_input": 11 })).unwrap();
    assert!(result.success);
    // 11 * 2 * 2 = 44
    assert_eq!(result.outputs.get("final_result").unwrap(), 44);
}
