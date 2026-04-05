//! 数据库模块测试

use super::*;
use crate::workflow::types::{NodePosition, NodeType, ParamSource, Workflow, WorkflowNode};
use std::collections::HashMap;
use tempfile::tempdir;

#[test]
fn test_database_init() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path());
    assert!(db.is_ok());
}

#[test]
fn test_insert_and_list_history() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    let record = create_success_record(
        "test_script".to_string(),
        r#"{"arg1": "value1"}"#.to_string(),
        "执行成功".to_string(),
        1000000,
        100,
    );

    let id = db.insert_history(record).expect("插入记录失败");
    assert!(id > 0);

    let records = db.list_history(None, 10).expect("查询记录失败");
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].script_id, "test_script");
}

#[test]
fn test_delete_history() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    let record = create_success_record(
        "test_script".to_string(),
        "{}".to_string(),
        "ok".to_string(),
        1000000,
        100,
    );

    let id = db.insert_history(record).expect("插入记录失败");
    db.delete_history(id).expect("删除记录失败");

    let records = db.list_history(None, 10).expect("查询记录失败");
    assert!(records.is_empty());
}

#[test]
fn test_clear_history() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    // 插入多条记录
    for i in 0..3 {
        let record = create_success_record(
            if i % 2 == 0 { "script_a" } else { "script_b" }.to_string(),
            "{}".to_string(),
            "ok".to_string(),
            1000000 + i,
            100,
        );
        db.insert_history(record).expect("插入记录失败");
    }

    // 清空 script_a 的历史
    db.clear_history(Some("script_a")).expect("清空历史失败");

    let records = db.list_history(Some("script_a"), 10).expect("查询记录失败");
    assert!(records.is_empty());

    let records = db.list_history(Some("script_b"), 10).expect("查询记录失败");
    assert_eq!(records.len(), 1);
}

#[test]
fn test_clear_all_history() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    // 插入多条记录
    for i in 0..5 {
        let record = create_success_record(
            format!("script_{}", i),
            "{}".to_string(),
            "ok".to_string(),
            1000000 + i,
            100,
        );
        db.insert_history(record).expect("插入记录失败");
    }

    // 清空所有历史
    db.clear_history(None).expect("清空历史失败");

    let records = db.list_history(None, 10).expect("查询记录失败");
    assert!(records.is_empty());
}

#[test]
fn test_delete_nonexistent_record() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    let result = db.delete_history(99999);
    assert!(result.is_err());
    assert!(matches!(
        result,
        Err(crate::error::AppError::NotFoundError(_))
    ));
}

#[test]
fn test_list_history_with_limit() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    // 插入 5 条记录
    for i in 0..5 {
        let record = create_success_record(
            "test_script".to_string(),
            "{}".to_string(),
            format!("output_{}", i),
            1000000 + i,
            100,
        );
        db.insert_history(record).expect("插入记录失败");
    }

    // 限制返回 3 条
    let records = db.list_history(None, 3).expect("查询记录失败");
    assert_eq!(records.len(), 3);

    // 验证按时间倒序排列（最新的在前）
    assert_eq!(records[0].output, Some("output_4".to_string()));
    assert_eq!(records[2].output, Some("output_2".to_string()));
}

#[test]
fn test_create_failure_record() {
    let record = create_failure_record(
        "test_script".to_string(),
        r#"{"arg": "value"}"#.to_string(),
        "执行失败".to_string(),
        1000000,
        50,
    );

    assert_eq!(record.script_id, "test_script");
    assert_eq!(record.status, "failure");
    assert!(record.output.is_none());
    assert_eq!(record.error, Some("执行失败".to_string()));
}

#[test]
fn test_insert_failure_record() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    let record = create_failure_record(
        "failing_script".to_string(),
        "{}".to_string(),
        "参数错误".to_string(),
        1000000,
        10,
    );

    let id = db.insert_history(record).expect("插入记录失败");
    assert!(id > 0);

    let records = db.list_history(None, 10).expect("查询记录失败");
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].status, "failure");
    assert!(records[0].output.is_none());
    assert_eq!(records[0].error, Some("参数错误".to_string()));
}

// ==================== 工作流相关测试 ====================

#[test]
fn test_create_arithmetic_workflow() {
    // 测试新架构工作流的创建
    let workflow = Database::create_arithmetic_workflow();

    // 验证工作流基本信息
    assert_eq!(workflow.id, "arithmetic_demo");
    assert_eq!(workflow.name, "四则运算演示");
    assert!(workflow.description.is_some());

    // 验证不包含 Input 节点（新架构特性）
    let has_input_node = workflow
        .nodes
        .iter()
        .any(|n| n.node_type == NodeType::Input);
    assert!(!has_input_node, "新架构工作流不应包含 Input 节点");

    // 验证包含 Script 和 Output 节点
    let script_count = workflow
        .nodes
        .iter()
        .filter(|n| n.node_type == NodeType::Script)
        .count();
    let output_count = workflow
        .nodes
        .iter()
        .filter(|n| n.node_type == NodeType::Output)
        .count();
    assert_eq!(script_count, 2, "应包含 2 个 Script 节点");
    assert_eq!(output_count, 1, "应包含 1 个 Output 节点");

    // 验证 input_schema 存在
    assert!(!workflow.input_schema.is_empty(), "应定义 input_schema");
    assert_eq!(workflow.input_schema[0].name, "input_number");

    // 验证 output_schema 存在
    assert!(!workflow.output_schema.is_empty(), "应定义 output_schema");
    assert_eq!(workflow.output_schema[0].name, "final_result");
}

#[test]
fn test_arithmetic_workflow_param_sources() {
    // 测试新架构工作流的参数来源配置
    let workflow = Database::create_arithmetic_workflow();

    // 找到第一个加法节点
    let add_node = workflow
        .nodes
        .iter()
        .find(|n| n.id == "add_node")
        .expect("应存在 add_node");

    // 验证参数 a 使用 FromInput（从工作流入参获取）
    let param_a = add_node.params_config.get("a").expect("应有参数 a");
    match param_a {
        ParamSource::FromInput { param_name } => {
            assert_eq!(param_name, "input_number", "参数 a 应从 input_number 获取");
        }
        _ => panic!("参数 a 应使用 FromInput 来源"),
    }

    // 验证参数 b 使用 Static（静态值）
    let param_b = add_node.params_config.get("b").expect("应有参数 b");
    match param_b {
        ParamSource::Static { value } => {
            assert_eq!(*value, serde_json::json!(10), "参数 b 应为静态值 10");
        }
        _ => panic!("参数 b 应使用 Static 来源"),
    }
}

#[test]
fn test_workflow_crud() {
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    // 创建测试工作流
    let workflow = Workflow {
        id: "test_workflow".to_string(),
        name: "测试工作流".to_string(),
        description: Some("测试描述".to_string()),
        nodes: vec![
            WorkflowNode {
                id: "script1".to_string(),
                node_type: NodeType::Script,
                script_id: Some("test_script".to_string()),
                position: NodePosition { x: 0.0, y: 0.0 },
                params_config: HashMap::new(),
            },
            WorkflowNode {
                id: "output".to_string(),
                node_type: NodeType::Output,
                script_id: None,
                position: NodePosition { x: 100.0, y: 0.0 },
                params_config: HashMap::new(),
            },
        ],
        edges: vec![],
        input_schema: vec![],
        output_schema: vec![],
    };

    // 插入工作流
    db.insert_workflow(&workflow).expect("插入工作流失败");

    // 查询工作流
    let retrieved = db.get_workflow("test_workflow").expect("查询工作流失败");
    assert!(retrieved.is_some());
    let retrieved = retrieved.unwrap();
    assert_eq!(retrieved.name, "测试工作流");
    assert_eq!(retrieved.nodes.len(), 2);

    // 列出工作流
    let workflows = db.list_workflows().expect("列出工作流失败");
    // 初始化时会插入 arithmetic_demo，加上我们插入的
    assert!(workflows.len() >= 1);

    // 更新工作流
    let mut updated_workflow = workflow.clone();
    updated_workflow.name = "更新后的工作流".to_string();
    db.update_workflow(&updated_workflow)
        .expect("更新工作流失败");

    let updated = db
        .get_workflow("test_workflow")
        .expect("查询工作流失败")
        .expect("工作流应存在");
    assert_eq!(updated.name, "更新后的工作流");

    // 删除工作流
    db.delete_workflow("test_workflow").expect("删除工作流失败");
    let deleted = db.get_workflow("test_workflow").expect("查询工作流失败");
    assert!(deleted.is_none());
}

#[test]
fn test_initial_workflow_exists() {
    // 测试初始化工作流是否正确插入
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    // 应该存在初始化工作流
    let workflow = db.get_workflow("arithmetic_demo").expect("查询工作流失败");
    assert!(workflow.is_some(), "应存在初始工作流 arithmetic_demo");

    let workflow = workflow.unwrap();
    assert_eq!(workflow.name, "四则运算演示");
}

#[test]
fn test_workflow_with_param_sources() {
    // 测试包含各种参数来源的工作流序列化/反序列化
    let dir = tempdir().expect("创建临时目录失败");
    let db = Database::init(dir.path()).expect("初始化数据库失败");

    let mut params_config = HashMap::new();
    params_config.insert(
        "param1".to_string(),
        ParamSource::Static {
            value: serde_json::json!(42),
        },
    );
    params_config.insert(
        "param2".to_string(),
        ParamSource::FromInput {
            param_name: "input_value".to_string(),
        },
    );
    params_config.insert(
        "param3".to_string(),
        ParamSource::FromNodeOutput {
            node_id: "upstream".to_string(),
            output_field: "result".to_string(),
        },
    );

    let workflow = Workflow {
        id: "complex_workflow".to_string(),
        name: "复杂工作流".to_string(),
        description: None,
        nodes: vec![WorkflowNode {
            id: "node1".to_string(),
            node_type: NodeType::Script,
            script_id: Some("test".to_string()),
            position: NodePosition { x: 0.0, y: 0.0 },
            params_config,
        }],
        edges: vec![],
        input_schema: vec![],
        output_schema: vec![],
    };

    // 插入并读取，验证参数来源正确保存
    db.insert_workflow(&workflow).expect("插入工作流失败");
    let retrieved = db
        .get_workflow("complex_workflow")
        .expect("查询失败")
        .expect("工作流应存在");

    let node = &retrieved.nodes[0];
    assert_eq!(node.params_config.len(), 3);

    // 验证各种参数来源
    match node.params_config.get("param1").unwrap() {
        ParamSource::Static { value } => assert_eq!(*value, serde_json::json!(42)),
        _ => panic!("param1 应为 Static"),
    }
    match node.params_config.get("param2").unwrap() {
        ParamSource::FromInput { param_name } => assert_eq!(param_name, "input_value"),
        _ => panic!("param2 应为 FromInput"),
    }
    match node.params_config.get("param3").unwrap() {
        ParamSource::FromNodeOutput {
            node_id,
            output_field,
        } => {
            assert_eq!(node_id, "upstream");
            assert_eq!(output_field, "result");
        }
        _ => panic!("param3 应为 FromNodeOutput"),
    }
}
