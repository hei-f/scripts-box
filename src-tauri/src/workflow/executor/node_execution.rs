//! 单个节点执行逻辑

use std::collections::HashMap;
use std::time::Instant;

use serde_json::Value;

use crate::error::AppError;
use crate::registry::ScriptRegistry;
use crate::script_api::ScriptContext;

use super::super::{NodeResult, NodeType, ParamSource, WorkflowNode};

/// 执行单个节点
///
/// 根据节点类型执行相应逻辑
///
/// # 参数
/// - `node`: 节点定义
/// - `workflow_params`: 工作流输入参数
/// - `completed_outputs`: 已完成节点的输出
/// - `registry`: 脚本注册中心（仅 Script 节点需要）
///
/// # 返回
/// 节点执行结果
pub fn execute_single_node(
    node: WorkflowNode,
    workflow_params: Value,
    completed_outputs: HashMap<String, HashMap<String, Value>>,
    registry: &ScriptRegistry,
) -> Result<NodeResult, AppError> {
    let start_time = Instant::now();

    let result = match node.node_type {
        NodeType::Input => {
            // Input 节点：提取工作流入参值
            execute_input_node(&node, workflow_params)
        }
        NodeType::Output => {
            // Output 节点：收集工作流输出值
            // 兼容旧工作流：传入工作流参数以支持 FromInput 来源
            execute_output_node(&node, workflow_params, completed_outputs)
        }
        NodeType::Script => {
            // Script 节点：调用脚本执行
            execute_script_node(&node, workflow_params, completed_outputs, registry)
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    match result {
        Ok(mut node_result) => {
            node_result.duration_ms = duration_ms;
            Ok(node_result)
        }
        Err(e) => Ok(NodeResult {
            success: false,
            output: None,
            outputs: None,
            error: Some(e.to_string()),
            duration_ms: duration_ms,
        }),
    }
}

/// 执行 Input 节点
///
/// 提取工作流输入参数值
///
/// # 参数
/// - `node`: 节点定义
/// - `workflow_params`: 工作流输入参数
///
/// # 返回
/// 节点执行结果
fn execute_input_node(
    node: &WorkflowNode,
    workflow_params: Value,
) -> Result<NodeResult, AppError> {
    let mut outputs: HashMap<String, Value> = HashMap::new();

    // 从工作流参数中提取对应的值
    if let Value::Object(ref params_map) = workflow_params {
        for (param_name, source) in &node.params_config {
            let value = match source {
                ParamSource::Static { value } => value.clone(),
                ParamSource::FromInput { param_name: name } => params_map
                    .get(name)
                    .cloned()
                    .unwrap_or(Value::Null),
                ParamSource::FromNodeOutput { .. } => {
                    // Input 节点不应从其他节点获取输入
                    Value::Null
                }
            };
            outputs.insert(param_name.clone(), value);
        }
    }

    Ok(NodeResult {
        success: true,
        output: Some(format!("输入参数: {} 个", outputs.len())),
        outputs: Some(outputs),
        error: None,
        duration_ms: 0,
    })
}

/// 执行 Output 节点
///
/// 收集工作流输出值
/// 支持从上游节点输出、工作流入参或静态值获取输出
/// 兼容旧工作流：支持直接从工作流入参获取值（不依赖 Input 节点）
///
/// # 参数
/// - `node`: 节点定义
/// - `workflow_params`: 工作流输入参数
/// - `completed_outputs`: 已完成节点的输出
///
/// # 返回
/// 节点执行结果
fn execute_output_node(
    node: &WorkflowNode,
    workflow_params: Value,
    completed_outputs: HashMap<String, HashMap<String, Value>>,
) -> Result<NodeResult, AppError> {
    let mut outputs: HashMap<String, Value> = HashMap::new();

    // 获取工作流参数映射
    let workflow_params_map = match &workflow_params {
        Value::Object(map) => map,
        _ => &serde_json::Map::new(),
    };

    // 从上游节点收集输出值
    // 兼容旧工作流：Output 节点可以直接从工作流入参获取值
    for (param_name, source) in &node.params_config {
        let value = match source {
            ParamSource::Static { value } => value.clone(),
            ParamSource::FromInput { param_name: name } => {
                // 兼容旧工作流：从工作流入参直接获取值
                workflow_params_map
                    .get(name)
                    .cloned()
                    .unwrap_or(Value::Null)
            }
            ParamSource::FromNodeOutput {
                node_id,
                output_field,
            } => {
                // 从上游节点获取输出
                completed_outputs
                    .get(node_id)
                    .and_then(|outputs| outputs.get(output_field))
                    .cloned()
                    .unwrap_or(Value::Null)
            }
        };
        outputs.insert(param_name.clone(), value);
    }

    Ok(NodeResult {
        success: true,
        output: Some(format!("输出参数: {} 个", outputs.len())),
        outputs: Some(outputs),
        error: None,
        duration_ms: 0,
    })
}

/// 执行 Script 节点
///
/// 解析参数来源，调用脚本执行
/// 参数来源优先级：连线（FromNodeOutput） > 静态值（Static） > 工作流入参（FromInput）
/// 对于 paramsConfig 中未配置的参数，自动从工作流 params 中获取值
///
/// # 参数
/// - `node`: 节点定义
/// - `workflow_params`: 工作流输入参数
/// - `completed_outputs`: 已完成节点的输出
/// - `registry`: 脚本注册中心
///
/// # 返回
/// 节点执行结果
fn execute_script_node(
    node: &WorkflowNode,
    workflow_params: Value,
    completed_outputs: HashMap<String, HashMap<String, Value>>,
    registry: &ScriptRegistry,
) -> Result<NodeResult, AppError> {
    let script_id = node
        .script_id
        .as_ref()
        .ok_or_else(|| AppError::NodeExecutionError(format!("节点缺少 script_id: {}", node.id)))?;

    let script = registry.get(script_id).ok_or_else(|| {
        AppError::NodeExecutionError(format!("脚本不存在: {}", script_id))
    })?;

    // 获取脚本的参数定义，用于确定所有需要的参数
    let params_schema = script.params_schema();

    // 构建脚本执行参数
    let mut script_params = serde_json::Map::new();

    // 获取工作流参数映射
    let workflow_params_map = match &workflow_params {
        Value::Object(map) => map,
        _ => &serde_json::Map::new(),
    };

    // 遍历脚本定义的所有参数，按优先级获取参数值
    for param_def in &params_schema {
        let param_name = &param_def.name;

        // 检查是否在 paramsConfig 中配置了该参数
        if let Some(source) = node.params_config.get(param_name) {
            // 已配置的参数：按配置的来源获取值
            let value = match source {
                // 优先级1：来自上游节点输出（连线）
                ParamSource::FromNodeOutput {
                    node_id,
                    output_field,
                } => {
                    completed_outputs
                        .get(node_id)
                        .and_then(|outputs| outputs.get(output_field))
                        .cloned()
                        .unwrap_or(Value::Null)
                }
                // 优先级2：静态值
                ParamSource::Static { value } => value.clone(),
                // 优先级3：来自工作流入参
                ParamSource::FromInput { param_name: name } => workflow_params_map
                    .get(name)
                    .cloned()
                    .unwrap_or(Value::Null),
            };
            script_params.insert(param_name.clone(), value);
        } else {
            // 未配置的参数：尝试从工作流入参获取
            // 参数名作为工作流入参的键名
            let value = workflow_params_map
                .get(param_name)
                .cloned()
                .unwrap_or_else(|| {
                    // 如果工作流入参中也没有，使用默认值或 Null
                    param_def.default.clone().unwrap_or(Value::Null)
                });
            script_params.insert(param_name.clone(), value);
        }
    }

    // 处理 paramsConfig 中配置但不在脚本参数定义中的参数（扩展参数）
    for (param_name, source) in &node.params_config {
        // 跳过已在 params_schema 中处理过的参数
        if params_schema.iter().any(|p| &p.name == param_name) {
            continue;
        }

        let value = match source {
            ParamSource::FromNodeOutput {
                node_id,
                output_field,
            } => {
                completed_outputs
                    .get(node_id)
                    .and_then(|outputs| outputs.get(output_field))
                    .cloned()
                    .unwrap_or(Value::Null)
            }
            ParamSource::Static { value } => value.clone(),
            ParamSource::FromInput { param_name: name } => workflow_params_map
                .get(name)
                .cloned()
                .unwrap_or(Value::Null),
        };
        script_params.insert(param_name.clone(), value);
    }

    // 创建执行上下文
    let ctx = ScriptContext::default();

    // 执行脚本
    let script_params_value = Value::Object(script_params);
    let result = script.execute(script_params_value, &ctx)?;

    Ok(NodeResult {
        success: result.success,
        output: Some(result.output),
        outputs: result.outputs,
        error: result.error,
        duration_ms: 0,
    })
}
