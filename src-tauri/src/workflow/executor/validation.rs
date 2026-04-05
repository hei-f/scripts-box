//! 工作流验证逻辑

use std::collections::HashSet;

use crate::error::AppError;
use crate::registry::ScriptRegistry;

use super::super::{NodeType, Workflow};

/// 工作流验证器
pub struct WorkflowValidator<'a> {
    registry: &'a ScriptRegistry,
}

impl<'a> WorkflowValidator<'a> {
    /// 创建新的验证器
    pub fn new(registry: &'a ScriptRegistry) -> Self {
        Self { registry }
    }

    /// 验证工作流定义
    ///
    /// # 参数
    /// - `workflow`: 工作流定义
    ///
    /// # 返回
    /// 验证通过返回 Ok，否则返回验证错误
    pub fn validate(&self, workflow: &Workflow) -> Result<(), AppError> {
        // 检查节点 ID 唯一性
        self.validate_node_ids(workflow)?;

        // 检查边引用的节点是否存在
        self.validate_edge_nodes(workflow)?;

        // 检查 Script 节点的 script_id 是否存在
        self.validate_script_nodes(workflow)?;

        Ok(())
    }

    /// 检查节点 ID 唯一性
    fn validate_node_ids(&self, workflow: &Workflow) -> Result<(), AppError> {
        let mut node_ids = HashSet::new();
        for node in &workflow.nodes {
            if !node_ids.insert(&node.id) {
                return Err(AppError::WorkflowValidationError(format!(
                    "节点 ID 重复: {}",
                    node.id
                )));
            }
        }
        Ok(())
    }

    /// 检查边引用的节点是否存在
    fn validate_edge_nodes(&self, workflow: &Workflow) -> Result<(), AppError> {
        let node_ids_set: HashSet<&str> = workflow.nodes.iter().map(|n| n.id.as_str()).collect();
        for edge in &workflow.edges {
            if !node_ids_set.contains(edge.source.as_str()) {
                return Err(AppError::WorkflowValidationError(format!(
                    "边引用的源节点不存在: {}",
                    edge.source
                )));
            }
            if !node_ids_set.contains(edge.target.as_str()) {
                return Err(AppError::WorkflowValidationError(format!(
                    "边引用的目标节点不存在: {}",
                    edge.target
                )));
            }
        }
        Ok(())
    }

    /// 检查 Script 节点的 script_id 是否存在
    fn validate_script_nodes(&self, workflow: &Workflow) -> Result<(), AppError> {
        for node in &workflow.nodes {
            if node.node_type == NodeType::Script {
                if let Some(script_id) = &node.script_id {
                    if self.registry.get(script_id).is_none() {
                        return Err(AppError::WorkflowValidationError(format!(
                            "脚本不存在: {}",
                            script_id
                        )));
                    }
                } else {
                    return Err(AppError::WorkflowValidationError(format!(
                        "Script 节点缺少 script_id: {}",
                        node.id
                    )));
                }
            }
        }
        Ok(())
    }
}
