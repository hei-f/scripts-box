//! 工作流执行引擎模块
//!
//! 提供工作流的执行功能，包括节点依赖图构建、拓扑排序、循环依赖检测和并行执行

pub mod dependency;
mod node_execution;
#[cfg(test)]
mod tests;
pub mod validation;

use std::collections::HashMap;

use serde_json::Value;

use crate::db::Database;
use crate::error::AppError;
use crate::registry::ScriptRegistry;

use super::{NodeResult, NodeType, Workflow, WorkflowNode, WorkflowResult};

use dependency::{build_dependency_graph, topological_sort};
use node_execution::execute_single_node;
use validation::WorkflowValidator;

/// 工作流执行器
///
/// 负责执行工作流，管理节点依赖关系和并行执行
pub struct WorkflowExecutor<'a> {
    /// 脚本注册中心，用于查找和执行脚本
    registry: &'a ScriptRegistry,
    /// 数据库引用（预留用于存储执行历史）
    #[allow(unused)]
    db: &'a Database,
}

impl<'a> WorkflowExecutor<'a> {
    /// 创建新的工作流执行器
    ///
    /// # 参数
    /// - `registry`: 脚本注册中心引用
    /// - `db`: 数据库引用
    ///
    /// # 返回
    /// 工作流执行器实例
    pub fn new(registry: &'a ScriptRegistry, db: &'a Database) -> Self {
        Self { registry, db }
    }

    /// 执行工作流
    ///
    /// # 参数
    /// - `workflow`: 要执行的工作流定义
    /// - `params`: 工作流输入参数（JSON 对象）
    ///
    /// # 返回
    /// 执行结果，包含各节点的输出和工作流最终输出
    ///
    /// # 错误
    /// - `CycleDetectedError`: 工作流存在循环依赖
    /// - `WorkflowValidationError`: 工作流验证失败
    /// - `NodeExecutionError`: 节点执行失败
    pub fn execute_workflow(
        &self,
        workflow: Workflow,
        params: Value,
    ) -> Result<WorkflowResult, AppError> {
        // 验证工作流
        let validator = WorkflowValidator::new(self.registry);
        validator.validate(&workflow)?;

        // 构建节点依赖图
        let dependency_graph = build_dependency_graph(&workflow)?;

        // 拓扑排序，检测循环依赖
        let execution_order = topological_sort(&dependency_graph)?;

        // 执行节点
        self.execute_nodes(workflow, params, execution_order)
    }

    /// 执行节点
    ///
    /// 按拓扑顺序执行节点，支持并行执行无依赖节点
    ///
    /// # 参数
    /// - `workflow`: 工作流定义
    /// - `params`: 工作流输入参数
    /// - `execution_order`: 节点执行顺序
    ///
    /// # 返回
    /// 工作流执行结果
    fn execute_nodes(
        &self,
        workflow: Workflow,
        params: Value,
        execution_order: Vec<String>,
    ) -> Result<WorkflowResult, AppError> {
        let mut node_results: HashMap<String, NodeResult> = HashMap::new();
        let mut outputs: HashMap<String, Value> = HashMap::new();

        // 创建节点 ID 到节点的映射
        let nodes_map: HashMap<String, WorkflowNode> = workflow
            .nodes
            .into_iter()
            .map(|n| (n.id.clone(), n))
            .collect();

        // 存储已完成节点的输出
        let mut completed_outputs: HashMap<String, HashMap<String, Value>> = HashMap::new();

        // 按拓扑顺序依次执行节点
        for node_id in execution_order {
            let node = nodes_map.get(&node_id).cloned();
            if let Some(node) = node {
                let result = execute_single_node(
                    node,
                    params.clone(),
                    completed_outputs.clone(),
                    self.registry,
                )?;

                // 存储节点输出供下游使用
                if let Some(ref node_outputs) = result.outputs {
                    completed_outputs.insert(node_id.clone(), node_outputs.clone());
                }
                node_results.insert(node_id, result);
            }
        }

        // 处理 Output 节点，收集工作流输出
        for (node_id, node) in &nodes_map {
            if node.node_type == NodeType::Output {
                if let Some(node_result) = node_results.get(node_id) {
                    if let Some(ref node_outputs) = node_result.outputs {
                        outputs.extend(node_outputs.clone());
                    }
                }
            }
        }

        // 检查所有节点是否成功执行
        let all_success = node_results.values().all(|r| r.success);

        Ok(WorkflowResult {
            success: all_success,
            outputs,
            node_results,
            error: if all_success {
                None
            } else {
                Some("部分节点执行失败".to_string())
            },
        })
    }
}
