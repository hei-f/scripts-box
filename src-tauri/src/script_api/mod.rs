//! Script trait 和核心接口模块
//!
//! 定义脚本系统的核心契约和数据结构，所有脚本必须实现 Script trait

mod context;
mod info;
mod output;
mod result;
mod trait_def;
mod types;

#[cfg(test)]
mod tests;

// 重导出所有公共类型，保持 API 兼容
pub use context::ScriptContext;
pub use info::ScriptInfo;
pub use output::{OutputDefinition, OutputType};
pub use result::ScriptResult;
pub use trait_def::Script;
pub use types::{DisplayCondition, ParamDefinition, ParamType, SelectOption};
