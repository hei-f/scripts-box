//! 工作流模块
//!
//! 提供工作流的数据结构定义和执行引擎

pub mod executor;
pub mod types;

// 重导出公共类型
pub use executor::WorkflowExecutor;
pub use types::{
    NodeResult, NodeType, ParamSource, Workflow, WorkflowEdge, WorkflowInfo, WorkflowNode,
    WorkflowResult,
};

// 重导出 executor 子模块的公共接口
pub use executor::dependency::{build_dependency_graph, topological_sort};
pub use executor::validation::WorkflowValidator;
