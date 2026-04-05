//! 依赖图构建和拓扑排序

use std::collections::{HashMap, HashSet, VecDeque};

use crate::error::AppError;

use super::super::{ParamSource, Workflow};

/// 构建节点依赖图
///
/// 分析节点间的参数来源，构建依赖关系图
///
/// # 参数
/// - `workflow`: 工作流定义
///
/// # 返回
/// 依赖图，键为节点 ID，值为该节点依赖的节点 ID 集合
pub fn build_dependency_graph(
    workflow: &Workflow,
) -> Result<HashMap<String, HashSet<String>>, AppError> {
    let mut graph: HashMap<String, HashSet<String>> = HashMap::new();

    // 初始化所有节点
    for node in &workflow.nodes {
        graph.entry(node.id.clone()).or_default();
    }

    // 从边的连接构建依赖关系
    for edge in &workflow.edges {
        // 目标节点依赖源节点
        graph
            .entry(edge.target.clone())
            .or_default()
            .insert(edge.source.clone());
    }

    // 从参数配置中分析依赖关系
    for node in &workflow.nodes {
        for param_source in node.params_config.values() {
            if let ParamSource::FromNodeOutput { node_id, .. } = param_source {
                graph
                    .entry(node.id.clone())
                    .or_default()
                    .insert(node_id.clone());
            }
        }
    }

    Ok(graph)
}

/// 拓扑排序
///
/// 使用 Kahn 算法进行拓扑排序，同时检测循环依赖
///
/// # 参数
/// - `dependency_graph`: 节点依赖图
///
/// # 返回
/// 节点执行顺序列表，如果存在循环依赖则返回错误
pub fn topological_sort(
    dependency_graph: &HashMap<String, HashSet<String>>,
) -> Result<Vec<String>, AppError> {
    // 计算每个节点的入度
    let mut in_degree: HashMap<String, usize> = HashMap::new();
    let mut reverse_graph: HashMap<String, Vec<String>> = HashMap::new();

    for (node, deps) in dependency_graph {
        in_degree.entry(node.clone()).or_insert(0);
        for dep in deps {
            *in_degree.entry(node.clone()).or_insert(0) += 1;
            reverse_graph
                .entry(dep.clone())
                .or_default()
                .push(node.clone());
        }
    }

    // 初始化入度为 0 的节点队列
    let mut queue: VecDeque<String> = VecDeque::new();
    for (node, &degree) in &in_degree {
        if degree == 0 {
            queue.push_back(node.clone());
        }
    }

    // 执行拓扑排序
    let mut sorted: Vec<String> = Vec::new();
    while let Some(node) = queue.pop_front() {
        sorted.push(node.clone());

        if let Some(dependents) = reverse_graph.get(&node) {
            for dependent in dependents {
                if let Some(degree) = in_degree.get_mut(dependent) {
                    *degree -= 1;
                    if *degree == 0 {
                        queue.push_back(dependent.clone());
                    }
                }
            }
        }
    }

    // 检测循环依赖
    if sorted.len() != dependency_graph.len() {
        return Err(AppError::CycleDetectedError);
    }

    Ok(sorted)
}
